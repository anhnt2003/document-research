# Refactoring (while GREEN only) — Python

Refactoring is the third step of the cycle. The slice is GREEN, the behavior is locked in by tests, and now you improve the shape of the code without changing what it does.

## The cardinal rule

**Never refactor while RED.** If a test is failing, your job is to get it passing. Mixing refactor changes with bug fixes makes it ambiguous which change is responsible when something breaks. Get to GREEN, then change shape.

Corollary: run `uv run pytest` after every refactor step, even a small one. The whole point of having tests is that they're a cheap detector. Use them.

## What to look for

Order matters — handle obvious wins first.

### 1. Duplication (rule of three)

Three similar lines is a coincidence. Five similar lines across two files is a pattern. Look for:

- The same Pydantic model → SQLAlchemy row mapping written in two route handlers.
- The same validation guard at the top of three endpoints.
- The same `return JSONResponse(status_code=..., content={...})` shape constructed across endpoints.
- The same `async with self._session.begin():` pattern in three services.

Extract a helper (a module-level function, a method on the service, a Pydantic `model_validator`) only when the duplication is genuine and the extracted name is at least as clear as the inlined version. If the helper has to be named `handle_stuff` or `process_data`, the abstraction isn't real yet — wait.

### 2. Module depth (see [deep-modules.md](deep-modules.md))

After implementing the slice, look at the public surface. Did the slice grow a thin layer (a wrapper that just forwards)? Either fold it into its caller, or deepen it by absorbing nearby logic. A shallow service with one caller is almost never worth keeping.

### 3. Names that lie or hide

Names that survived from the planning phase often hint at the *intent*, not the *behavior* you ended up with. Re-read each name with fresh eyes:

- Does `Service` actually do something specific? If yes, rename to that thing.
- Does `Helper` / `Manager` / `Util` survive the code? Almost certainly rename.
- Did a function grow a side effect its name doesn't suggest (e.g. `get_document` now also bumps a counter)? Split, or rename to admit the effect.

### 4. Long functions

A function above ~30 lines, especially with several nested `if`s or a long comprehension chain, is a candidate. Don't split mechanically — look for natural seams (a comment block introducing a "phase", a chunk that operates on a sub-shape of the input) and extract those.

### 5. What the new code reveals about the existing code

This is often the highest-leverage refactor and the easiest to miss. The new slice you just wrote may be the second time some pattern shows up — and the *first* place is now visibly wrong. Examples:

- The new endpoint introduced a clean error-handling pattern via a FastAPI exception handler. The old endpoint that does it inline now looks worse than it did yesterday — worth a same-PR cleanup.
- The new service exposed that a "common" repository function was actually doing two unrelated things. Splitting it now makes both callers clearer.

Don't be precious about the old code. The new context revealed something. Act on it.

## What NOT to refactor

- **Code unrelated to the current slice.** Resist the temptation to "fix while I'm here." Open a separate slice and do it under TDD with its own tests.
- **Anything that has no test coverage.** Without tests, refactoring is just rewriting blind. Add a characterisation test first that pins down current behavior, *then* refactor.
- **Toward speculative abstractions.** "We might need a strategy class here someday" is not a reason. Wait for the second caller.
- **For style alone.** `uv run ruff format .` is fine; large structural moves to satisfy a style preference are not.

## Per-step protocol

For each refactor:

1. Read the existing test names. They should describe behaviors. If they don't, fix the names first — those names are documentation.
2. Make one focused change.
3. Run `cd backend/core && uv run pytest && uv run ruff check . && uv run mypy src`.
4. Commit. Small commits are cheap to revert.

If a refactor reveals a bug — congratulations, the test suite is doing its job. Stop the refactor, switch into bug-fix mode (RED → GREEN), then resume.

## Stop criterion

Stop refactoring when:

- You've handled the obvious wins from the list above.
- The next change you'd make is speculative, or about code outside this slice.
- The test suite is green and you'd be happy to leave the code as is.

Refactoring is not a separate project. It's the polish step on a slice you just shipped. Keep it bounded, ship the slice, and move on.
