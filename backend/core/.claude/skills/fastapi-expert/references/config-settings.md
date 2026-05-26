# Configuration & settings in `backend/core`

`src/core/config.py` defines a single `Settings` class (Pydantic Settings v2). It is constructed once at import time as `settings = Settings()`. Every other module reads config through that singleton.

## Current shape

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    log_level: str = "INFO"
    core_port: int = 8000

    database_url: str = "postgresql+psycopg://postgres:dev@localhost:5432/document_research"
    anthropic_api_key: str = ""

settings = Settings()
```

## Adding a setting — the only correct procedure

1. Add a typed field to `Settings` with a sane dev default (or raise via `Field(...)` if it must be set).
2. Document it in `.env.example` at the repo root if it's something a fresh checkout needs.
3. Import and use `settings.<field>` in feature code.

**Never:**

- Call `os.environ[...]`, `os.getenv(...)`, or `dotenv.load_dotenv()` in feature code.
- Re-instantiate `Settings()` outside `config.py`.
- Read `.env` files from feature code with `open()`.
- Hardcode the same value in multiple places — if it's a constant, put it in `Settings` with a default so it can be overridden per env.

## Env var naming

Pydantic Settings upper-snake-cases field names: `database_url` ← `DATABASE_URL`, `anthropic_api_key` ← `ANTHROPIC_API_KEY`. Use this mapping when documenting env vars; don't invent prefixes.

If you want a project-wide prefix later (e.g. `CORE_`), set `env_prefix="CORE_"` in `SettingsConfigDict` and update every env var at once. Don't sprinkle prefixes inconsistently.

## Required vs. optional vs. with-default

```python
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Optional with a dev default — most settings
    log_level: str = "INFO"

    # Required — startup fails fast if missing
    secret_key: str = Field(min_length=16)

    # Optional, may be empty
    sentry_dsn: str | None = None
```

For genuinely sensitive values (API keys, secrets) in production, leave the default empty and let deployment provide it via env. The empty string is intentional: it lets local dev start without keys but blows up on first real use.

## Nested settings

When a section starts to bulge (e.g. multiple LLM knobs), nest:

```python
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class LlmSettings(BaseModel):
    model: str = "claude-sonnet-4-6"
    max_tokens: int = 1024
    timeout_seconds: float = 30.0


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_nested_delimiter="__")

    llm: LlmSettings = LlmSettings()
```

Env vars then use the delimiter: `LLM__MODEL=claude-opus-4-7`, `LLM__MAX_TOKENS=2048`. The Pydantic Settings docs call this "complex types from env vars" — keep the delimiter consistent.

## Reading settings in tests

See `references/testing-async.md` for the full pattern. The TL;DR:

- For code that imports the cached singleton (`from core.config import settings`), use `monkeypatch.setattr(config.settings, "field", value)` inside the test, and let pytest restore on teardown.
- For code that instantiates `Settings()` fresh, use `monkeypatch.setenv("FIELD", "...")` before instantiation.

## Secrets

- Don't commit `.env`. The repo's root `.gitignore` already excludes it; don't bypass.
- Don't log `settings` directly — write a safe `repr` that masks fields like `anthropic_api_key` and `database_url` (password). Pydantic V2: use `SecretStr` for fields that should never be stringified accidentally:
  ```python
  from pydantic import SecretStr

  class Settings(BaseSettings):
      anthropic_api_key: SecretStr = SecretStr("")
  ```
  Access with `settings.anthropic_api_key.get_secret_value()` at the boundary — pass `SecretStr` around in code so accidental log lines stay safe.

## Common mistakes to refuse

- Reading `os.environ` from a router, service, or model.
- Creating a `Settings()` instance per request.
- Putting environment-specific behavior behind `if os.environ.get(...) == "prod":` — make it a `Settings` field with explicit semantics.
- Storing secrets as plain `str` and logging the whole `settings` object somewhere.
- Configuring Pydantic Settings with `case_sensitive=True` then quietly assuming env vars are still upper-case (they have to match exactly).
