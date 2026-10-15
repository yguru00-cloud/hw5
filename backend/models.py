"""Data types shared by the agent team."""

from dataclasses import dataclass
from typing import Any, Literal

from pydantic import BaseModel, Field

AgentName = Literal["boss", "inventory", "accounting", "facilities", "customer_service"]
AGENT_NAMES: tuple[str, ...] = ("boss", "inventory", "accounting", "facilities", "customer_service")


@dataclass
class AgentDeps:
    """Context handed to every agent run (and copied, one level deeper, for each delegation)."""

    ticket_id: int
    agent: str
    depth: int = 0


class AgentReport(BaseModel):
    """What any agent hands back to whoever asked it (the Boss or another agent)."""

    agent: str
    summary: str = Field(description="Plain-language answer to the task, using only database facts.")
    key_facts: list[str] = Field(
        default_factory=list,
        description="Facts that came from tool results, each with the id or value it came from.",
    )
    recommended_actions: list[str] = Field(default_factory=list)
    needs_human_approval: bool = Field(
        default=False, description="True if any recommended action moves money and needs a person to approve it."
    )
    delegated_to: list[str] = Field(default_factory=list)


class TicketResolution(BaseModel):
    """The Boss's final call on one ticket."""

    ticket_id: int
    decision: str = Field(description="One-sentence final decision.")
    reasoning: str
    actions_taken: list[str] = Field(
        default_factory=list, description="Things already done through tools (e.g. a payment request queued, a draft saved)."
    )
    pending_human_approvals: list[str] = Field(
        default_factory=list, description="Payment requests waiting for a person, with request ids and amounts."
    )
    customer_drafts: list[str] = Field(default_factory=list, description="Draft ids saved for the customer.")
    agents_consulted: list[str] = Field(default_factory=list)


class AuditRecord(BaseModel):
    """One audit-trail entry for one agent-loop step."""

    timestamp: str
    ticket_id: int
    agent: str
    depth: int
    step_type: Literal["agent_step", "tool_call", "delegation", "final_answer"]
    step: int | None = Field(default=None, description="Loop iteration number within this agent run (agent_step only).")
    model_text: str | None = Field(default=None, description="Text the model wrote in this step (agent_step only).")
    requested_calls: list[dict[str, Any]] | None = Field(
        default=None, description="Tool calls the model asked for in this step (agent_step only)."
    )
    tool_name: str | None = None
    arguments: dict[str, Any] | None = None
    result: Any = None
    delegation_target: str | None = None
    error: str | None = None
    usage: dict[str, int] | None = None
