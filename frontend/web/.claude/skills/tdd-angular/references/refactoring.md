# Refactoring (while GREEN only) — Angular / TypeScript

Refactoring is the third step of the cycle. The slice is GREEN, the behavior is locked in by tests, and now you improve the shape of the code without changing what it does.

## The cardinal rule

**Never refactor while RED.** If a test is failing, your job is to get it passing. Mixing refactor changes with bug fixes makes it ambiguous which change is responsible when something breaks. Get to GREEN, then change shape.

Corollary: run `npx ng test --watch=false` after every refactor step, even a small one. The whole point of having tests is that they're a cheap detector. Use them.

## What to look for

Order matters — handle obvious wins first.

### 1. Duplication (rule of three)

Three similar lines is a coincidence. Five similar lines across two components is a pattern. Look for:

- The same template chunk (`<div class="empty-state">No X yet</div>`) repeated in three components — candidate for a shared `EmptyStateComponent`.
- The same `subscribe + manual unsubscribe` pattern in three places — candidate for `takeUntilDestroyed()` or a shared helper.
- The same DTO → view-model mapping written in two places — candidate for a shared function or computed signal.
- The same `[disabled]="loading() || invalid()"` expression across multiple forms.

Extract a helper (a child component, a function, a directive, a pipe) only when the duplication is genuine and the extracted name is at least as clear as the inlined version. If you have to name it `MiscComponent` or `helperFn`, the abstraction isn't real yet — wait.

### 2. Module depth (see [deep-modules.md](deep-modules.md))

After implementing the slice, look at the public surface. Did the slice grow a thin component (a wrapper that just forwards inputs to a child)? Either fold it into its caller, or deepen it by absorbing nearby logic. A shallow component with one caller is almost never worth keeping.

### 3. Names that lie or hide

Names that survived from the planning phase often hint at the *intent*, not the *behavior* you ended up with. Re-read each name with fresh eyes:

- Does `Service` actually do something specific? If yes, rename to that thing (`DocumentStore`, `SearchEngine`).
- Does `Helper` / `Manager` / `Util` survive the code? Almost certainly rename.
- Did a method grow a side effect its name doesn't suggest (e.g. `getDocuments` now also navigates)? Split, or rename to admit the effect.

### 4. Long templates and methods

A template above ~80 lines, or a class method above ~30 lines with nested conditionals, is a candidate. Don't split mechanically — look for natural seams:

- A `@if (loading()) { ... } @else if (error()) { ... } @else { ... }` block with substantial content in each branch — consider extracting the populated branch into a child component.
- A long form definition — consider a form-builder helper.

### 5. What the new code reveals about the existing code

This is often the highest-leverage refactor and the easiest to miss. The new slice you just wrote may be the second time some pattern shows up — and the *first* place is now visibly wrong. Examples:

- The new component used `input.required<T>()` cleanly. The old component using `@Input()` decorators with default values now looks worse than it did yesterday — worth a same-PR cleanup.
- The new store exposed that a "common" service method was actually doing two unrelated things. Splitting it now makes both consumers clearer.

Don't be precious about the old code. The new context revealed something. Act on it.

## What NOT to refactor

- **Code unrelated to the current slice.** Resist the temptation to "fix while I'm here." Open a separate slice and do it under TDD with its own tests.
- **Anything that has no test coverage.** Without tests, refactoring is just rewriting blind. Add a characterisation test first that pins down current behavior, *then* refactor.
- **Toward speculative abstractions.** "We might need a generic `DataTable<T>` here someday" is not a reason. Wait for the second caller.
- **For style alone.** Prettier (already configured) is fine; large structural moves to satisfy a style preference are not.

## Per-step protocol

For each refactor:

1. Read the existing test names. They should describe behaviors. If they don't, fix the names first — those names are documentation.
2. Make one focused change.
3. Run `cd frontend/web && npx ng test --watch=false`.
4. Commit. Small commits are cheap to revert.

If a refactor reveals a bug — congratulations, the test suite is doing its job. Stop the refactor, switch into bug-fix mode (RED → GREEN), then resume.

## Stop criterion

Stop refactoring when:

- You've handled the obvious wins from the list above.
- The next change you'd make is speculative, or about code outside this slice.
- The test suite is green and you'd be happy to leave the code as is.

Refactoring is not a separate project. It's the polish step on a slice you just shipped. Keep it bounded, ship the slice, and move on.
