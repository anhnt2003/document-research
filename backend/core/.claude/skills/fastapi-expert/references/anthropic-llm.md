# Anthropic SDK in `backend/core`

`anthropic` is the LLM dep. Always use the **async** client — `anthropic.AsyncAnthropic` — to keep request paths non-blocking. Sync `anthropic.Anthropic` will pin the event loop and ruin throughput.

## Client lifecycle

One client per process, created in the lifespan, closed on shutdown. See `references/endpoints-routing.md` for the lifespan pattern. Resolve it through a dependency, not module global:

```python
from anthropic import AsyncAnthropic
from core.deps import LlmDep
```

`AsyncAnthropic` reads `ANTHROPIC_API_KEY` from env on its own, but we go through `settings.anthropic_api_key` so config stays centralized.

## Picking a model

Use the model ID literal at the call site, pulled from `settings` when it's tunable per environment. The Claude 4.x family IDs are `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`. Default to **Sonnet** for production LLM work — Opus for one-shot deep reasoning, Haiku for low-cost classification / summarization.

Don't hardcode older model IDs (`claude-3-*`); they may be retired. If you need a different model than what's in `settings`, add a typed field rather than scattering strings.

## A standard call

```python
from anthropic.types import MessageParam

from core.config import settings
from core.deps import LlmDep

SYSTEM_PROMPT = "You answer questions strictly from the provided context."


async def answer(llm: LlmDep, question: str, context: str) -> str:
    messages: list[MessageParam] = [
        {
            "role": "user",
            "content": f"<context>\n{context}\n</context>\n\nQuestion: {question}",
        }
    ]
    msg = await llm.messages.create(
        model=settings.llm_model,            # e.g. "claude-sonnet-4-6"
        system=SYSTEM_PROMPT,
        max_tokens=1024,
        messages=messages,
    )
    return "".join(block.text for block in msg.content if block.type == "text")
```

Key things to keep:

- `max_tokens` is **required** by the API. Pick a budget that matches the use case (short answer: 512; long synthesis: 2048+).
- `system` is a top-level argument, not a `role: "system"` message — the SDK enforces this.
- `msg.content` is a list of typed content blocks (`TextBlock`, `ToolUseBlock`, …). Filter by `.type == "text"` before reading `.text`.

## Streaming

For chat-like UX, stream tokens with `messages.stream` and forward them via SSE or WebSocket:

```python
from collections.abc import AsyncIterator

async def stream_answer(llm: LlmDep, question: str) -> AsyncIterator[str]:
    async with llm.messages.stream(
        model=settings.llm_model,
        max_tokens=1024,
        messages=[{"role": "user", "content": question}],
    ) as stream:
        async for text in stream.text_stream:
            yield text
```

Don't manually iterate `raw_stream` unless you need tool-use deltas or input-tokens-so-far — `text_stream` covers the 90% case.

## Prompt caching

For this project's RAG flow, the *system prompt* and any large, stable context (style guide, reference excerpts, schema) should be cached. It dramatically cuts input cost on repeated queries.

```python
from anthropic.types import MessageParam, TextBlockParam

system_blocks: list[TextBlockParam] = [
    {
        "type": "text",
        "text": SYSTEM_PROMPT,
        "cache_control": {"type": "ephemeral"},   # mark cache breakpoint
    }
]

msg = await llm.messages.create(
    model=settings.llm_model,
    system=system_blocks,            # list of blocks, not bare string
    max_tokens=1024,
    messages=[...],
)
```

Rules of thumb:

- Cache the system prompt and any pre-prompt context > ~1 K tokens.
- A cache hit needs identical bytes up to the breakpoint — putting variable per-request data above the breakpoint busts every request.
- Inspect `msg.usage`: `cache_creation_input_tokens` (paid once) vs `cache_read_input_tokens` (90 % cheaper). Log these in dev to confirm hits.

## Tool use (function calling)

When the LLM needs to query our DB or call an internal service, define tools with a schema and dispatch in a loop:

```python
tools = [
    {
        "name": "search_documents",
        "description": "Semantic search over the document corpus.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "top_k": {"type": "integer", "default": 5},
            },
            "required": ["query"],
        },
    }
]

msg = await llm.messages.create(
    model=settings.llm_model,
    max_tokens=1024,
    tools=tools,
    messages=messages,
)

while msg.stop_reason == "tool_use":
    tool_calls = [b for b in msg.content if b.type == "tool_use"]
    tool_results = []
    for call in tool_calls:
        result = await _dispatch(call.name, call.input)
        tool_results.append({"type": "tool_result", "tool_use_id": call.id, "content": result})
    messages += [
        {"role": "assistant", "content": msg.content},
        {"role": "user", "content": tool_results},
    ]
    msg = await llm.messages.create(model=settings.llm_model, max_tokens=1024, tools=tools, messages=messages)
```

Cap loop iterations to prevent runaway tool calls. Always validate tool inputs (Pydantic) before executing.

## Error handling

The SDK raises typed exceptions — handle the ones the user can actually do something about:

```python
import anthropic

try:
    msg = await llm.messages.create(...)
except anthropic.RateLimitError:
    raise HTTPException(status_code=429, detail="LLM rate-limited, retry shortly")
except anthropic.APIStatusError as e:
    raise HTTPException(status_code=502, detail=f"LLM upstream error: {e.status_code}")
```

Don't catch `anthropic.APIConnectionError` to silently swallow it — let it 500 and surface in logs; that usually means our outbound network is broken.

## Common mistakes to refuse

- Importing `Anthropic` (sync) into async code.
- Passing the system prompt as a `messages` entry with `"role": "system"`.
- Forgetting `max_tokens` — the SDK raises before sending, but the error is opaque.
- Hardcoding the API key. Always `settings.anthropic_api_key`.
- Reading `block.text` without first checking `block.type == "text"` — content blocks are a union.
- Caching variable per-request data above the `cache_control` breakpoint and wondering why hit rate is zero.
