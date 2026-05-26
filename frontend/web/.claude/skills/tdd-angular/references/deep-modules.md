# Deep modules — Angular / TypeScript

A "deep module" is John Ousterhout's term (*A Philosophy of Software Design*) for a module whose interface is **small** relative to the **complexity** it hides. A shallow module is the opposite: a thin layer that doesn't pay for its interface.

This concept matters for TDD because **the interface is what tests see**. Deep modules are easier to test well; shallow ones force you to either skip the test or write a brittle one.

## The picture

```
Deep module                       Shallow module
+-------------+                   +-------------+
|  interface  |  ← small          |  interface  |  ← large
+-------------+                   +-------------+
|             |                   |  thin body  |
|             |                   +-------------+
|             |
|             |  ← lots of useful
|             |     behavior
|             |
+-------------+
```

A `DocumentListComponent` that takes a `documents` signal input and renders an empty state, a loading skeleton, a populated list, *and* emits selection events — but exposes only one `input()` and one `output()` — is deep. A `DocumentListContainerComponent` whose entire job is to read a signal and forward it to a child is shallow.

## Symptoms of shallow modules in Angular

- Every public method on a service is a one-liner that delegates to `HttpClient` (`list = () => this.http.get<Doc[]>('/api/documents')`). If the service does nothing else, the consumer could call `HttpClient` directly.
- A "wrapper" component whose template is just `<child-component [foo]="bar()" />`.
- Stores that re-expose signal-getters with no transformation.
- Services that wrap `localStorage` with a 1:1 method-per-key API.

## Cures during the refactor step

Once the slice is GREEN, look for shallow modules and either:

1. **Inline** them — if there's exactly one caller and the module isn't hiding meaningful complexity, fold it into the caller. A pure forwarding component is rarely worth its own file.
2. **Deepen** them — pull in adjacent responsibilities. A `DocumentApi` that only does `GET /api/documents` could absorb the response-shaping that callers do anyway.
3. **Collapse** layers — `Component → Container → Page → Route` chains where each layer adds only a pass-through can usually be flattened.

## How this shapes test design

When the system has deep modules, tests written against the *outer* interface (the rendered DOM, the public input/output surface, the store selector) naturally exercise a lot of real code — exactly what good integration-style tests want. You don't need to mock anything internal, because the interesting behavior lives inside the module.

When the system has many shallow modules, tests at any one layer feel either trivial (everything's just forwarding) or impossible without mocks (the behavior is spread across layers). That's a design smell, not a testing problem — fix the design.

## A concrete example

**Shallow (smell):**

```ts
@Injectable({ providedIn: 'root' })
export class DocumentService {
  constructor(private readonly api: DocumentApi) {}

  list() { return this.api.list(); }
  get(id: string) { return this.api.get(id); }
}
```

Every method is a one-line forward. The service doesn't pay for its interface — the component could just inject `DocumentApi` directly. Tests of `DocumentService` either mock the api (testing nothing) or duplicate `DocumentApi`'s tests.

**Deep (after refactor):**

```ts
@Injectable({ providedIn: 'root' })
export class DocumentStore {
  // Owns: caching, optimistic updates, current selection, derived view state.
  readonly documents = signal<Document[]>([]);
  readonly selected  = signal<Document | null>(null);

  async load() { /* fetches via the api, populates the signal, handles errors */ }
  select(id: string) { /* updates the selection signal */ }
}
```

One injectable, but it carries real behavior: caching, selection state, derived signals. Tests of `DocumentStore` exercise that behavior end-to-end and survive whatever internal restructuring you do next.

## Where to apply this in `frontend/web/`

- Components: a component is deep when it owns user-facing behavior (loading/empty/populated states, selection, validation feedback). It is shallow when its template is just a wrapper around a child.
- Stores: a store should own state *and* the rules for updating it. A store that just re-exposes signals from a child service is a candidate for inlining.
- Services: keep them thin at the HTTP boundary (one method per endpoint, returning the wire shape) and let the *store* own the richer behavior. That way the HTTP service stays a leaf that's easy to stub at the boundary, and the store is the deep module worth testing.
