# Pydantic V2 in `backend/core`

This project pins `pydantic-settings>=2.14` which depends on Pydantic V2. All Pydantic V1 syntax is forbidden — mypy strict will surface most of it, but some V1 patterns still type-check while behaving wrong at runtime. Use the V2 idioms below.

## Model configuration

```python
from pydantic import BaseModel, ConfigDict


class DocumentCreate(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,    # trim incoming strings
        extra="forbid",                # reject unknown fields (use on inputs)
        frozen=False,                  # set True for value objects
    )

    title: str
    body: str
```

- `extra="forbid"` on **inputs** catches client typos early.
- `extra="ignore"` on **outputs/settings** so adding fields server-side isn't breaking.
- `from_attributes=True` when constructing the model from an ORM row (`UserResponse.model_validate(user_orm_obj)`). This replaces V1's `orm_mode = True`.

## Validators

```python
from pydantic import BaseModel, field_validator, model_validator


class SearchQuery(BaseModel):
    query: str
    top_k: int = 5
    min_score: float | None = None

    @field_validator("query")
    @classmethod
    def query_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("query must not be blank")
        return v

    @model_validator(mode="after")
    def check_consistency(self) -> "SearchQuery":
        if self.min_score is not None and not 0.0 <= self.min_score <= 1.0:
            raise ValueError("min_score must be in [0, 1]")
        return self
```

- `@field_validator` replaces V1's `@validator`. Always `@classmethod`. Always typed.
- `@model_validator(mode="after")` runs after all field validation and gives you the constructed model — use it for cross-field rules.
- Raise `ValueError` or `AssertionError`; Pydantic turns them into `ValidationError` with the right path.

## Field metadata

Prefer `Field` for constraints and OpenAPI docs:

```python
from pydantic import BaseModel, Field


class Pagination(BaseModel):
    limit: int = Field(default=20, ge=1, le=100, description="Page size")
    offset: int = Field(default=0, ge=0)
    cursor: str | None = Field(default=None, max_length=128)
```

`ge`/`le`/`gt`/`lt`/`min_length`/`max_length`/`pattern` are the V2 spellings (no more `conint`/`constr` wrappers).

## Serialization

| V1 | V2 |
| --- | --- |
| `model.dict()` | `model.model_dump()` |
| `model.json()` | `model.model_dump_json()` |
| `Model.parse_obj(d)` | `Model.model_validate(d)` |
| `Model.parse_raw(s)` | `Model.model_validate_json(s)` |
| `model.copy(update={...})` | `model.model_copy(update={...})` |

The V1 names still exist as deprecated aliases. mypy strict will flag them only sometimes — don't write them in new code.

## Computed fields

```python
from pydantic import BaseModel, computed_field


class DocumentHit(BaseModel):
    id: int
    distance: float

    @computed_field  # included in `.model_dump()` and OpenAPI schema
    @property
    def similarity(self) -> float:
        return 1.0 - self.distance
```

## Discriminated unions

Useful when a route accepts polymorphic payloads (e.g. different search modes):

```python
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class KeywordSearch(BaseModel):
    mode: Literal["keyword"]
    query: str


class SemanticSearch(BaseModel):
    mode: Literal["semantic"]
    embedding: list[float]


SearchPayload = Annotated[KeywordSearch | SemanticSearch, Field(discriminator="mode")]
```

FastAPI handles the union in `response_model` and request bodies cleanly.

## Pydantic Settings

This is how `core.config.settings` works. Add new env-driven config there, not in feature code.

```python
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    database_url: str = Field(default="postgresql+psycopg://...", description="Async DSN")
    anthropic_api_key: str = ""
```

- Field names are mapped to env vars in upper-snake (`DATABASE_URL`).
- For nested settings, use `SettingsConfigDict(env_nested_delimiter="__")` and a nested `BaseModel`.
- Build the singleton once at import time: `settings = Settings()`. Import that singleton everywhere; do **not** instantiate `Settings()` in request paths.

## Common mistakes to refuse

- `class Config:` inside a model → use `model_config = ConfigDict(...)`.
- `@validator("field", pre=True, always=True)` → use `@field_validator("field", mode="before")`.
- `Optional[X]` and `Union[X, Y]` → use `X | None` and `X | Y`.
- `Field(..., regex="...")` → renamed to `pattern=...` in V2.
- Calling `.dict()` then re-validating to "clone with mutation" → use `.model_copy(update={...})`.
