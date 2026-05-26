# Interface design for testability — Angular / TypeScript

A testable interface is one a test can call and observe. The work of designing for testability is mostly about pushing side effects to substitutable seams and keeping the surface free of incidental detail.

## Properties of a testable interface

1. **Observable through the public surface.** Whatever the test cares about can be read back through the rendered DOM, a public output emission, a signal-based store selector, or a recorded side effect — not by inspecting `(component as any)._something`.
2. **Side effects are pushed to seams you can swap.** The HTTP client, the wall clock, randomness, the router, `localStorage`, the analytics tracker — each lives behind an injectable token or Angular service, not constructed inline.
3. **No hidden inputs.** The component's behavior depends only on its inputs and the injected dependencies. No `Date.now()` deep in a template-bound computed, no `crypto.randomUUID()` in a click handler, no `window.location` read inside a component method.
4. **The interface vocabulary is the domain's vocabulary.** `documents = input<Document[]>([])` and `selectDocument = output<string>()` read like the system's intent. A `data = input<any>()` is an interface that has given up.

## Common shape problems and the fix

### Problem: time leak

```ts
ngOnInit() {
  this.createdAt = new Date();  // ← hidden input
}
```

A test of this behavior either has to accept any "recent" timestamp (sloppy) or globally patch `Date` (fragile).

**Fix:** inject a `Clock` provider with a method like `now(): Date`. Production wires it to a class returning `new Date()`; tests provide a fake returning a fixed date.

```ts
ngOnInit() {
  this.createdAt = this.clock.now();
}
```

### Problem: hidden randomness

```ts
addDocument() {
  this.documents.push({ id: crypto.randomUUID(), ... });
}
```

Tests that involve the id either assert on the *shape* (regex match) or globally stub `crypto`. Both are bad.

**Fix:** inject an `IdGenerator` token. Production wires it to `crypto.randomUUID`; tests inject a deterministic counter.

### Problem: bag-of-inputs components

```ts
@Component({ ... })
export class DocumentListComponent {
  documents = input<Doc[]>();
  loading = input<boolean>();
  error = input<string | null>();
  selectedId = input<string | null>();
  showActions = input<boolean>();
  density = input<'compact' | 'normal'>();
  // ...
}
```

Six-plus inputs is a smell. Either:

- Group related inputs into a single `viewState` object (one input).
- Recognise the component is doing too much and split it (a `DocumentList` and a `DocumentListActions` sibling).

### Problem: smuggled state

```ts
export class DocumentListComponent {
  private static cache = new Map<string, Doc[]>();  // ← module-singleton mutable state
}
```

Two tests render the component, the first leaves state in `cache`, the second sees it. You get intermittent failures.

**Fix:** put state in an injected service (a `DocumentStore`), use `providedIn: 'root'` for app-wide singletons, and reset it in `beforeEach` via DI if needed. Module-level mutable state inside a component is almost always a mistake.

### Problem: in-band signalling

```ts
search(query: string): Observable<Doc[] | string> {
  if (!query) return of('empty query');  // error as a string
  // ...
}
```

Now every caller and every template has to distinguish "list" from "error string."

**Fix:** use proper Observable error channels (`throwError(() => new EmptyQueryError())`) and catch in the consumer, or return a discriminated union (`{ kind: 'ok', docs } | { kind: 'empty' } | { kind: 'error', message }`). Make success and failure obviously different to both the caller and TypeScript.

## Designing the interface before the test

The planning step in the workflow (`SKILL.md` → §1 Planning) is the right place to settle these decisions. A short interface spec — input shape, output shape, which `[data-testid]` elements the template will expose — makes the first test almost write itself.

Write the interface down. Then write the first test against it. If the test feels awkward (you can't set the input, you can't observe the output, you have to reach for `as any`), that's the interface telling you something. Adjust the interface before adding production code.

## Tag elements with `data-testid`

A small but high-impact discipline: when the template exposes something a test cares about (the empty state, a row, a primary action button), tag it with `[data-testid="..."]`. Tests select by that attribute, not by class name or `:nth-child`. Two benefits:

- CSS refactors don't break tests.
- The attribute documents which elements have test coverage — useful for the next person.

## Don't over-design

This document is not an excuse to invent ports-and-adapters layering or to inject six tokens for every component. The minimum design is the one that makes the *current* slice testable. Add seams (services, injection tokens, abstract base classes) as you find behaviors that need them; don't pre-create them for behaviors you might want one day.
