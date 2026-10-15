"""Run the agent team on one ticket: python -m backend.run_ticket 101

This calls the real model through Portkey and writes to data/campus_customs_new.db.
Reset that file from data/campus_customs.db before a full run.
"""

import asyncio
import sys

from backend.agents import Team


def main() -> None:
    if len(sys.argv) != 2 or not sys.argv[1].isdigit():
        raise SystemExit("usage: python -m backend.run_ticket <ticket_id>")
    resolution = asyncio.run(Team().resolve_ticket(int(sys.argv[1])))
    print(resolution.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
