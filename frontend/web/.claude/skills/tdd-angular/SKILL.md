---
name: tdd-angular
description: Use this skill whenever the user asks to add a feature, fix a bug, or change observable behavior in the `frontend/web/` sub-project (Angular 21 SPA, TypeScript 5.9 strict, standalone components, signal-based APIs, Vitest 4) — even if they don't say "TDD" or "test first". Trigger on phrases like "add component", "create a page for", "fix the X component", "make Y show Z when …", "wire up a service to", "add a route to web", or any new logic touching `frontend/web/src/**`. Enforces a vertical-slice red→green→refactor workflow: integration-style tests via `TestBed` + `componentRef.setInput(...)` + `[data-testid]` selectors through the rendered DOM (no `as any` into private fields, no spying on services the component owns), one-test-at-a-time discipline, and an explicit planning step with the user before any code is written. Skip only for genuinely trivial work where tests add no value: style-only tweaks, formatting, dependency bumps via npm, asset swaps, read-only exploration, documentation edits, and pure spikes that will be deleted.
---

# Test-Driven Development — Angular / TypeScript (`frontend/web/`)

Stack: Angular **21** (standalone components on by default, signal-based `input()` / `output()` / `signal()`), TypeScript 5.9 in strict mode, SCSS, routing on, SSR off. Test runner: **Vitest 4** (see `frontend/web/package.json` — the `vitest` devDependency is authoritative; the project no longer uses Karma/Jasmine).

## Philosophy

**Core principle**: tests verify behavior through public interfaces, not implementation details. Production code should be free to change shape; tests should not.

**Good tests** are integration-style — they mount the component via `TestBed`, drive it with user-level inputs (`componentRef.setInput`, `click()` on a rendered element, subscribing to an `output()`), and assert on the rendered DOM (`[data-testid="..."]` selectors). They describe *what* the user sees and does, not *how* the component achieves it. Good names: `shows the empty state when there are no documents`, `emits selectDocument with the id when a row is clicked`. These tests survive template restructures because they don't care which `*ngFor`/`@for`/`<div>` wrapping you used.

**Bad tests** are coupled to implementation. They `new MyComponent()` directly (no `TestBed`, no template), reach into privates with `as any`, spy on internal services the component owns, or select by `.css-class-name`. The warning sign: the test breaks when you reword the template or rename a private method, but the user-visible behavior is unchanged. If renaming a private field makes tests fail, those tests were testing implementation.

See [references/tests.md](references/tests.md) for concrete Vitest + TestBed examples and [references/mocking.md](references/mocking.md) for the Angular-specific mocking rules (substitute at the HTTP boundary via `provideHttpClientTesting`; never spy on `DocumentStore` or `DocumentApi` from inside a component test of the consumer).

## Anti-pattern: horizontal slices

**DO NOT write all the tests first, then all the implementation.** That is "horizontal slicing" — treating RED as "write every test" and GREEN as "make them all pass."

It produces **crap tests**, for predictable reasons:

- Tests written in bulk test *imagined* behavior, not *actual* behavior. You haven't seen the template yet so you guess at what matters.
- You end up testing the *shape* of things (input prop names, output event names, that a DOM element exists) rather than user-facing behavior.
- The tests become insensitive to real changes — they pass when behavior breaks and fail when behavior is fine.
- You outrun your headlights: you commit to a test structure before you understand the template it describes.

**Correct approach**: vertical slices via tracer bullets. One test → one piece of implementation → repeat. Each test responds to what you learned from writing the previous test's code.

```
WRONG (horizontal):
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5

RIGHT (vertical):
  RED → GREEN: test1 → impl1
  RED → GREEN: test2 → impl2
  ...
```

## Workflow

### 1. Planning (before any code)

Use the project's existing vocabulary so component names and selectors match what's already in `frontend/web/src/app/`. Standalone components are the default — don't introduce `NgModule` unless explicitly asked. API URLs come from `environments/environment.ts`, not hard-coded.

Before writing code:

- [ ] Confirm with the user which interface changes are needed (new component? new `input()` / `output()`? change to a store selector or route?)
- [ ] Confirm which behaviors to test, in priority order — you can't test everything; make the priority explicit
- [ ] Identify chances for [deep modules](references/deep-modules.md) — a small component/service interface hiding non-trivial behavior
- [ ] Design interfaces for [testability](references/interface-design.md) — observable via DOM / outputs / store selectors, with `[data-testid]` attributes on the elements tests care about
- [ ] List behaviors to test (not implementation steps). *"Shows empty state when documents is empty"* is a behavior; *"calls `documentStore.load()` once"* is not.
- [ ] Get the user's approval on the plan before writing any code

Ask the user explicitly: *"What should the user see and do? Which states matter most?"*

### 2. Tracer bullet

Write ONE test that confirms ONE thing end-to-end:

```
RED:   Write a Vitest spec for the first behavior → `npx ng test --watch=false` → it fails for the right reason
GREEN: Write the minimum component/template/service code that makes the test pass → tests → green
```

For an Angular component, the tracer bullet is a `TestBed`-mounted spec that sets the input(s), runs `detectChanges()`, and asserts on the rendered DOM via `[data-testid]` selectors.

### 3. Incremental loop

For each remaining behavior:

```
RED:   Write the next test → tests → fail
GREEN: Add only enough code to pass → tests → pass
```

Rules:

- One test at a time. Don't write three tests then start implementing.
- Only enough code to pass the current test. No speculative `@Input()`s, `@Output()`s, signal-state fields, or store actions.
- Don't anticipate future tests in either the test or the implementation.
- Keep tests focused on user-visible behavior, not on which internal collaborators get called.

When you discover a behavior you hadn't planned for (a loading skeleton, a disabled state, an error message), surface it to the user before adding it. The plan changes intentionally, not silently.

### 4. Refactor (only while GREEN)

After all tests for this slice pass, look for [refactor candidates](references/refactoring.md):

- [ ] Extract a child component when the same template chunk appears in 2–3 places (rule of three)
- [ ] Deepen modules: a `DocumentListComponent` that owns its empty/loading/populated states is deeper than three separate components composed by a parent
- [ ] Move state into a signal-based store when multiple components need to read or react to the same value
- [ ] Notice what the new code reveals about the *existing* code (often the highest-leverage refactor)
- [ ] Re-run `npx ng test --watch=false` after each refactor step

**Never refactor while RED.** Get back to GREEN first. Two changes at once obscure which one broke things.

## Per-cycle checklist

```
[ ] Test name describes a user-visible behavior, not a method or class
[ ] Test mounts via TestBed and asserts on rendered DOM (not on private fields)
[ ] Test selects by [data-testid] (not by .css-class or :nth-child)
[ ] Test does not use `as any` to reach into privates
[ ] Code added is the minimum for this test to pass
[ ] No speculative inputs, outputs, signal-state fields, or store actions added
[ ] Vitest suite is fully green before moving on
```

## Tooling reminders

- Run tests (one-shot): `cd frontend/web && npx ng test --watch=false`. Equivalent: `npm test -- --watch=false` (delegated to Vitest).
- Watch mode: `npx ng test`.
- Production build: `npx ng build` (also part of the verify command in the root `CLAUDE.md`).
- For signal inputs, prefer `input.required<T>()` when the input is conceptually mandatory; use the empty-array path for "no data" state, not a missing input.
- Use `[data-testid="..."]` attributes for selectors — they survive CSS refactors that would break class-name selectors and they communicate intent ("this matters to a test").
- For component outputs: subscribe in the test and assert on emissions; do not spy on `EventEmitter.emit`.
- For HTTP boundaries: substitute via `provideHttpClient()` + `provideHttpClientTesting()` and `HttpTestingController`. Don't `spyOn(HttpClient.prototype, 'get')`.
- For zoneless / signals reactivity: drive via `componentRef.setInput` and `detectChanges()`. Don't reach into the signal's underlying value.

## Verify before reporting done

`cd frontend/web && npx ng test --watch=false && npx ng build` — the `ng build` is part of the verify command in the root `CLAUDE.md`. A skill that produces green tests but a red production build is not done.

## When to step out of this skill

This skill is workflow guidance, not a straitjacket. Step out and tell the user when:

- The task is genuinely trivial — a colour tweak, a typo in a template, a SCSS variable change. Just make the change and run `ng test`.
- You're spiking to learn an Angular 21 / signal API behavior — explore freely, then *delete the spike* and re-do the work under TDD.
- The user says "no tests, just the component" — comply, but call out once that future regressions will be harder to catch.
- The change is purely structural (rename a component class, move a file) with no behavior change and existing tests cover it — make the change while GREEN and lean on `ng test` as your safety net.
