"""The Campus Customs agent team: Boss, Inventory, Accounting, Facilities, Customer Service.

Every agent reads shop data and acts only through the MCP server (mcp_server/server.py),
and every agent can delegate to every other agent with a `delegate_to_<agent>` tool.
"""

import json
from typing import Annotated, Any

from pydantic import Field
from pydantic_ai import Agent, RunContext, Tool, UsageLimits
from pydantic_ai.exceptions import UsageLimitExceeded
from pydantic_ai.mcp import CallToolFunc, MCPToolset, ToolResult
from pydantic_ai.messages import TextPart, ToolCallPart
from pydantic_ai.usage import RunUsage

from backend.audit import ensure_audit_file, log_step
from backend.config import (
    MAX_DELEGATION_DEPTH,
    MAX_TASK_CHARS,
    MAX_TOOL_RESULT_CHARS,
    PROMPTS_DIR,
    REQUEST_LIMIT,
    TOTAL_TOKENS_LIMIT,
    build_model,
)
from backend.mcp_client import build_transport
from backend.models import AGENT_NAMES, AgentDeps, AgentReport, TicketResolution

_COMMON_TOOLS = {"get_today", "get_ticket"}

# Which MCP tools each agent may see. `pay` is deliberately in nobody's list: moving money
# is the human approval step, which is not an agent action.
TOOL_ACCESS: dict[str, set[str]] = {
    "boss": _COMMON_TOOLS | {"list_open_tickets"},
    "inventory": _COMMON_TOOLS | {"get_inventory", "get_vendors", "get_sku_pricing", "get_invoice_status"},
    "accounting": _COMMON_TOOLS
    | {"get_cash_balance", "get_invoice_status", "get_lease_rent_due", "get_sku_pricing", "get_vendors", "prepare_payment"},
    "facilities": _COMMON_TOOLS | {"get_lease_rent_due", "get_cash_balance"},
    "customer_service": _COMMON_TOOLS | {"save_customer_draft"},
}

DELEGATE_DESCRIPTIONS = {
    "boss": "Ask the Boss for a ticket-level decision or to coordinate other agents.",
    "inventory": "Ask the Inventory agent about stock by SKU and size, shortfalls, and which vendor can restock and how fast.",
    "accounting": "Ask the Accounting agent about cash, invoices, margins, or to prepare a payment for human approval.",
    "facilities": "Ask the Facilities agent about the shop lease, rent amounts, and rent due dates.",
    "customer_service": "Ask the Customer Service agent to draft (never send) a message for a customer.",
}


def _clip(value: Any, limit: int = MAX_TOOL_RESULT_CHARS) -> Any:
    """Keep a tool result under the size limit; small results pass through unchanged."""
    text = value if isinstance(value, str) else json.dumps(value, default=str, ensure_ascii=False)
    if len(text) <= limit:
        return value
    return text[:limit] + f"...[truncated, {len(text) - limit} more characters]"


def _usage_dict(usage: RunUsage) -> dict[str, int]:
    return {
        "requests": usage.requests,
        "input_tokens": usage.input_tokens,
        "output_tokens": usage.output_tokens,
        "tool_calls": usage.tool_calls,
    }


async def _audited_mcp_call(
    ctx: RunContext[AgentDeps], call_tool: CallToolFunc, name: str, args: dict[str, Any]
) -> ToolResult:
    """Wrap every MCP tool call: record it in the audit trail and cap the result size."""
    deps = ctx.deps
    try:
        result = _clip(await call_tool(name, args))
    except Exception as exc:
        log_step(
            ticket_id=deps.ticket_id, agent=deps.agent, depth=deps.depth, step_type="tool_call",
            tool_name=name, arguments=args, error=f"{type(exc).__name__}: {exc}",
        )
        raise
    log_step(
        ticket_id=deps.ticket_id, agent=deps.agent, depth=deps.depth, step_type="tool_call",
        tool_name=name, arguments=args, result=result,
    )
    return result


def build_mcp_toolset() -> MCPToolset:
    """Connect to the server named in .mcp.json, started from the project root."""
    return MCPToolset(build_transport(), process_tool_call=_audited_mcp_call)


class Team:
    """Five PydanticAI agents with full connectivity, one shared MCP connection, and audit logging."""

    def __init__(self, models: dict[str, Any] | None = None, mcp: MCPToolset | None = None):
        self.mcp = mcp or build_mcp_toolset()
        self.limits = UsageLimits(request_limit=REQUEST_LIMIT, total_tokens_limit=TOTAL_TOKENS_LIMIT)
        shared_model = None
        self.agents: dict[str, Agent[AgentDeps, AgentReport]] = {}
        for name in AGENT_NAMES:
            model = (models or {}).get(name)
            if model is None:
                shared_model = shared_model or build_model()
                model = shared_model
            self.agents[name] = Agent(
                model,
                name=name,
                instructions=(PROMPTS_DIR / f"{name}.md").read_text(encoding="utf-8"),
                deps_type=AgentDeps,
                output_type=AgentReport,
                toolsets=[self.mcp.filtered(self._allow(name))],
                tools=[self._delegate_tool(target) for target in AGENT_NAMES if target != name],
            )

    @staticmethod
    def _allow(name: str):
        allowed = TOOL_ACCESS[name]
        return lambda ctx, tool_def: tool_def.name in allowed

    def _delegate_tool(self, target: str) -> Tool[AgentDeps]:
        async def delegate(
            ctx: RunContext[AgentDeps],
            task: Annotated[str, Field(description="A short, self-contained task. Include the ticket id and the ids/SKUs/sizes needed.")],
        ) -> str:
            return await self._delegate(ctx, target, task)

        return Tool(delegate, name=f"delegate_to_{target}", description=DELEGATE_DESCRIPTIONS[target])

    async def _delegate(self, ctx: RunContext[AgentDeps], target: str, task: str) -> str:
        deps = ctx.deps
        task = task[:MAX_TASK_CHARS]
        if deps.depth >= MAX_DELEGATION_DEPTH:
            message = (
                f"Delegation refused: the maximum delegation depth ({MAX_DELEGATION_DEPTH}) was reached. "
                "Answer with the information you already have."
            )
            log_step(
                ticket_id=deps.ticket_id, agent=deps.agent, depth=deps.depth, step_type="delegation",
                arguments={"task": task}, result=message, delegation_target=target,
                error="max delegation depth reached",
            )
            return message
        log_step(
            ticket_id=deps.ticket_id, agent=deps.agent, depth=deps.depth, step_type="delegation",
            arguments={"task": task}, delegation_target=target,
        )
        child = AgentDeps(ticket_id=deps.ticket_id, agent=target, depth=deps.depth + 1)
        report = await self._run(
            target, f"Task from the {deps.agent} agent (ticket {deps.ticket_id}):\n{task}", child, ctx.usage
        )
        return _clip(report.model_dump_json())

    async def _run(
        self, name: str, prompt: str, deps: AgentDeps, usage: RunUsage, output_type: Any = None
    ) -> Any:
        kwargs: dict[str, Any] = {"output_type": output_type} if output_type else {}
        agent = self.agents[name]
        try:
            async with agent.iter(
                prompt, deps=deps, usage=usage, usage_limits=self.limits, **kwargs
            ) as agent_run:
                step = 0
                async for node in agent_run:
                    if Agent.is_call_tools_node(node):  # one model response = one loop step
                        step += 1
                        parts = node.model_response.parts
                        log_step(
                            ticket_id=deps.ticket_id, agent=name, depth=deps.depth, step_type="agent_step",
                            step=step,
                            model_text="".join(p.content for p in parts if isinstance(p, TextPart)) or None,
                            requested_calls=[
                                {"tool": p.tool_name, "arguments": p.args_as_dict()}
                                for p in parts
                                if isinstance(p, ToolCallPart)
                            ],
                            usage=_usage_dict(usage),
                        )
            result = agent_run.result
        except UsageLimitExceeded as exc:
            log_step(
                ticket_id=deps.ticket_id, agent=name, depth=deps.depth, step_type="final_answer",
                error=f"UsageLimitExceeded: {exc}", usage=_usage_dict(usage),
            )
            raise
        log_step(
            ticket_id=deps.ticket_id, agent=name, depth=deps.depth, step_type="final_answer",
            result=result.output.model_dump(mode="json"), usage=_usage_dict(usage),
        )
        return result.output

    async def resolve_ticket(self, ticket_id: int) -> TicketResolution:
        """Let the Boss work one ticket (delegating as needed) and return the final resolution."""
        ensure_audit_file()
        prompt = (
            f"Resolve ticket {ticket_id}. Read it, decide which teammates you need, delegate with clear tasks, "
            "and make the final call."
        )
        async with self.mcp:
            return await self._run(
                "boss", prompt, AgentDeps(ticket_id=ticket_id, agent="boss", depth=0), RunUsage(),
                output_type=TicketResolution,
            )
