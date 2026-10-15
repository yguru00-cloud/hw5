"""Connection to the Campus Customs MCP server (the server named in .mcp.json)."""

import json
import os
from typing import Any

from fastmcp import Client
from fastmcp.client.transports import StdioTransport

from backend.config import ROOT


def build_transport() -> StdioTransport:
    """Stdio transport for the server in .mcp.json, started from the project root."""
    config = json.loads((ROOT / ".mcp.json").read_text(encoding="utf-8"))["mcpServers"]["campus-customs"]
    command = config["command"]
    if not os.path.isabs(command) and (ROOT / command).exists():
        command = str(ROOT / command)
    env = {k: os.environ[k] for k in ("CAMPUS_CUSTOMS_DB",) if k in os.environ}
    return StdioTransport(command=command, args=config.get("args", []), env=env or None, cwd=str(ROOT))


class ShopClient:
    """One long-lived MCP connection that the API routes share, so each request is quick."""

    def __init__(self) -> None:
        self._client: Client | None = None

    async def start(self) -> None:
        self._client = Client(build_transport())
        await self._client.__aenter__()

    async def stop(self) -> None:
        if self._client is not None:
            await self._client.__aexit__(None, None, None)
            self._client = None

    async def call(self, tool: str, arguments: dict[str, Any] | None = None) -> dict[str, Any]:
        """Call an MCP tool and return its dict result."""
        if self._client is None:
            raise RuntimeError("MCP client is not started")
        result = await self._client.call_tool(tool, arguments or {}, raise_on_error=False)
        data = result.data if result.data is not None else result.structured_content
        if result.is_error:
            return {"error": str(data or "tool call failed")}
        return data
