"""Load project .env secrets into process memory (values never printed)."""

import os
from pathlib import Path


def load_dotenv() -> list[str]:
    """Read ROOT/.env KEY=VALUE lines; set env vars that are missing.

    Explicit environment variables always win. Returns the names sourced
    (names only -- values are never logged, printed, or returned).
    """
    env_file = Path(__file__).resolve().parent.parent / ".env"
    sourced: list[str] = []
    if not env_file.exists():
        return sourced
    for raw in env_file.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip("'\"")
        if key and value and key not in os.environ:
            os.environ[key] = value
            sourced.append(key)
    return sourced
