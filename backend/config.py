"""Settings shared by every agent: model, Portkey connection, and token/delegation limits."""

import os
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic_ai.models.openai import OpenAIResponsesModel
from pydantic_ai.providers.openai import OpenAIProvider

ROOT = Path(__file__).resolve().parent.parent
PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"

# The repository-root .env holds PORTKEY_API_KEY (this project folder or its parent).
load_dotenv(ROOT / ".env")
load_dotenv(ROOT.parent / ".env")

# Database files: the original is only ever the reset source; everything works on the copy.
DB_ORIGINAL = ROOT / "data" / "campus_customs.db"
DB_WORKING = Path(os.environ.get("CAMPUS_CUSTOMS_DB", ROOT / "data" / "campus_customs_new.db"))

# The assignment allows exactly one model, for every agent.
MODEL_NAME = "gpt-6-luna"
PORTKEY_BASE_URL = os.environ.get("PORTKEY_BASE_URL", "https://api.portkey.ai/v1")
PORTKEY_PROVIDER = os.environ.get("PORTKEY_PROVIDER", "openai")

# Limits that keep one ticket run bounded (shared across every agent in that run).
MAX_DELEGATION_DEPTH = 3
REQUEST_LIMIT = 40
TOTAL_TOKENS_LIMIT = 150_000
MAX_TOOL_RESULT_CHARS = 4_000
MAX_TASK_CHARS = 2_000


def build_model() -> OpenAIResponsesModel:
    """Build the one allowed model, called through Portkey with PORTKEY_API_KEY."""
    api_key = os.environ.get("PORTKEY_API_KEY")
    if not api_key:
        raise RuntimeError("PORTKEY_API_KEY is not set (put it in the repository-root .env).")
    client = AsyncOpenAI(
        base_url=PORTKEY_BASE_URL,
        api_key="portkey",  # placeholder; Portkey authenticates with the headers below
        default_headers={
            "x-portkey-api-key": api_key,
            "x-portkey-provider": PORTKEY_PROVIDER,
        },
    )
    # gpt-6-luna refuses function tools together with reasoning on /v1/chat/completions
    # ("use /v1/responses"), so the agents talk to the Responses API.
    return OpenAIResponsesModel(MODEL_NAME, provider=OpenAIProvider(openai_client=client))
