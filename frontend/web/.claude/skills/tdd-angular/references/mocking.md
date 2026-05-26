# Mocking — TypeScript / Angular / Vitest

The single biggest failure mode in this project's tests is mocking the wrong thing. Apply this rule first; the rest is detail.

## The rule

**Mock at the system boundary, not inside it.**

The "system under test" is the unit whose behavior you care about — usually a component with its template, its child components, and the services it depends on. Anything *outside* that unit — the backend HTTP API, the browser clock, randomness — is a fair target for substitution. Anything *inside* that unit — the component's signals, its private state, services it owns — must run for real, or you're not testing the component, you're testing a sketch of it.

## Mock these (true external systems)

- **The backend HTTP API** — substitute via `provideHttpClient()` + `provideHttpClientTesting()` and the `HttpTestingController`. This is the canonical seam between the frontend and the rest of the world.
- **`fetch` for non-HttpClient calls** — `vi.spyOn(window, 'fetch').mockResolvedValue(...)` or `vi.stubGlobal('fetch', ...)`. Reset after each test.
- **The wall clock** — inject a `Clock` provider (e.g. `inject(Clock)` with a class that wraps `Date.now()` / `new Date()`). The test passes a fake `Clock` via `providers: [{ provide: Clock, useValue: fakeClock }]`. For time-based RxJS, use `vi.useFakeTimers()`.
- **Random / non-deterministic sources** — inject the id generator (`{ provide: ID_GENERATOR, useValue: () => 'test-id-1' }`). Production wires in `crypto.randomUUID`; tests pass a deterministic counter.
- **Router navigations** in component tests — use `RouterTestingHarness` or provide a stub `Router` that records calls.

## Do not mock these (internal collaborators)

These live *inside* the system under test. Mocking them produces brittle, hollow tests that lie:

- **Child components used in the template** — if `DocumentListComponent` renders `<doc-row>` children, let them render. Don't replace them with `MockComponent(...)` patterns unless they pull in heavy IO (a child that itself hits HTTP — then stub the HTTP, not the child).
- **Internal services the component owns** — `DocumentStore`, `DocumentApi` from inside a consuming-component test. Run them for real. Substitute only at the HTTP boundary where they talk to the backend.
- **Signal state** — never reach in with `(component as any).state` to set or read. Set via `componentRef.setInput(...)`; read via the rendered DOM.
- **Private methods or fields** — full stop. If you feel the need to spy on a private method or read `(component as any)._something`, the design is asking you to extract a real seam (a service, a child component) or to write the test at a higher layer.

## The "calls" anti-pattern

```ts
// ❌ verifies a call, not a behavior
expect(documentApiSpy.list).toHaveBeenCalledTimes(1);
expect(documentApiSpy.list).toHaveBeenCalledWith('rfc');
```

This tests that *the method got called*, not that *the system did the thing*. It locks the test to the current factoring of the code: the moment you batch, cache, retry, or replace the collaborator, the test fails even though behavior is unchanged.

Replace with assertions on the **outcome**:

- For a component: *"the row labelled 'RFC 7231' is in the rendered DOM."*
- For a click handler: *"the `selectDocument` output emitted with id `42`."*
- For a HTTP-fetching service: *"the returned Observable resolves to the expected list when the HTTP backend returns the expected response."*

## When you must verify a side effect

Some behaviors *are* side effects — navigating to a route, writing to `localStorage`, emitting an analytics event. Substitute the external system with a **fake that records the side effect**, then assert on the recorded effect:

```ts
class RecordingAnalytics {
  events: AnalyticsEvent[] = [];
  track(event: AnalyticsEvent) { this.events.push(event); }
}

// in the test:
TestBed.configureTestingModule({
  providers: [{ provide: Analytics, useClass: RecordingAnalytics }],
});
const analytics = TestBed.inject(Analytics) as unknown as RecordingAnalytics;

// drive the component...

expect(analytics.events).toContainEqual({ name: 'document_selected', id: '42' });
```

The contract you assert on is the side effect (we tracked this event), not the implementation (we called `track` with these arguments).

## A short test you can apply

Before you reach for `vi.fn()` or a spy, ask:

> If I delete this mock and replace it with the real thing, does my test become (a) slow/flaky/network-coupled, or (b) just longer to set up?

- (a) means the dependency is external — go ahead and substitute (likely at the HTTP layer).
- (b) means the dependency is internal — set it up against the real `TestBed` and keep the test honest.

## A note on Vitest spies, jest-style mocks, and `MockComponent`

All fine tools — the problem is *what* you mock with them, not the libraries themselves. `vi.spyOn(window, 'fetch')` for an external API is correct. `vi.spyOn(component as any, 'rebuildRows')` is a yellow flag worth investigating in review. `MockComponent` libraries can hide rendering bugs — prefer real children unless they're heavy.
