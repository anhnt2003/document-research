# Tests — TypeScript / Angular (`frontend/web/`)

Stack: Angular 21 (standalone components, strict mode), TypeScript 5.9, Vitest 4 (this project uses Vitest, not Karma/Jasmine — the `package.json` is the source of truth). Test runner is whatever `ng test` is configured to dispatch to; check `angular.json` if uncertain.

## Commands

```bash
cd frontend/web
npx ng test --watch=false      # one-shot full suite
npx ng test                    # interactive watch mode
npx ng build                   # production build (part of verify)
```

For a single file or test name, use Vitest's filtering via the underlying CLI once you've confirmed the configured runner.

## Test layering

For Angular, prefer the highest layer that's still fast and deterministic:

1. **Component test** — mount the component with its real template via Angular's `TestBed`, drive it with user-level actions (clicks, input events), and assert on rendered output. This is the default for component behavior. Covers the template, the class, and any pure pipes in one shot.
2. **Service test** — instantiate the service directly through `TestBed.inject`. Use real dependencies where possible. Only stub at the HTTP boundary with `provideHttpClient()` + `provideHttpClientTesting()` — that's an *external* system.
3. **Unit test of a pure function** — for pure helpers (pipe logic, formatters, selectors). Direct function call, no `TestBed` needed.

Avoid full end-to-end browser tests for now — they belong in a separate suite (Playwright), not in `ng test`.

## Naming

Use BDD-style descriptive strings — they read directly in the runner output:

```ts
describe('DocumentListComponent', () => {
  it('shows the empty state when there are no documents', () => { /* ... */ });
  it('renders one row per document', () => { /* ... */ });
  it('emits a select event with the document id when a row is clicked', () => { /* ... */ });
});
```

Anti-patterns: `it('works')`, `it('calls service.fetch once')`, `it('test 1')`.

## Good test (component)

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentListComponent } from './document-list.component';

describe('DocumentListComponent', () => {
  let fixture: ComponentFixture<DocumentListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentListComponent], // standalone
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentListComponent);
  });

  it('shows the empty state when there are no documents', () => {
    fixture.componentRef.setInput('documents', []);
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('[data-testid="empty-state"]');
    expect(emptyState).not.toBeNull();
    expect(emptyState!.textContent).toContain('No documents');
  });

  it('renders one row per document', () => {
    fixture.componentRef.setInput('documents', [
      { id: '1', title: 'RFC 7231' },
      { id: '2', title: 'RFC 9110' },
    ]);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[data-testid="document-row"]');
    expect(rows.length).toBe(2);
  });

  it('emits selectDocument with the id when a row is clicked', () => {
    fixture.componentRef.setInput('documents', [{ id: '42', title: 'x' }]);
    fixture.detectChanges();
    const emissions: string[] = [];
    fixture.componentInstance.selectDocument.subscribe((id: string) => emissions.push(id));

    const row = fixture.nativeElement.querySelector('[data-testid="document-row"]') as HTMLElement;
    row.click();

    expect(emissions).toEqual(['42']);
  });
});
```

What this test does *not* do: it doesn't peek at private fields, doesn't call lifecycle hooks by hand, doesn't import internal helpers. It drives the component the way the user does — set inputs, trigger events, assert on the DOM and the public outputs.

Tip: use `[data-testid="..."]` attributes for selectors. They survive CSS refactors that would break class-name selectors, and they communicate intent ("this element matters to a test").

## Bad test (coupled to implementation)

```ts
// ❌ Don't do this
it('builds the rows list correctly', () => {
  const component = new DocumentListComponent();
  (component as any).rebuildRows();           // calls a private method via `as any`
  expect((component as any)._rows.length).toBe(0);
});
```

Problems:
- `as any` reaches past TypeScript and Angular to poke a private. Rename `rebuildRows` or `_rows` and this test fails for no behavioral reason.
- Constructs the component without `TestBed`, so the template is never rendered. The visible behavior — what the user actually sees — is untested.

## Service test with HTTP boundary

The HTTP boundary is one of the few places stubbing is correct: the server is genuinely external to the component-under-test.

```ts
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { DocumentApi } from './document.api';

describe('DocumentApi', () => {
  let api: DocumentApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DocumentApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(DocumentApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('returns the document list returned by the API', async () => {
    const result$ = api.list();
    const req = httpMock.expectOne('/api/documents');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: '1', title: 'RFC 7231' }]);

    const docs = await firstValueFrom(result$);
    expect(docs).toEqual([{ id: '1', title: 'RFC 7231' }]);
  });
});
```

Notice: even here we don't assert on *how* the service made the request beyond what's part of the contract (URL, method). We don't spy on `HttpClient.get` to verify it was called once.

## Signals and zoneless

Angular 21 supports signals and zoneless change detection. If your component uses `input()` / `output()` / `signal()`:

- Set inputs via `componentRef.setInput('documents', value)` — *not* by mutating the signal directly.
- Read outputs by subscribing in the test (`component.selectDocument.subscribe(...)`).
- Don't reach into the signal's internal value via private API.

## Async / RxJS

- For Observables that emit once, prefer `firstValueFrom(obs$)` over manually subscribing in tests.
- For time-based code (debounce, throttle), use Vitest's fake timers (`vi.useFakeTimers()`) rather than waiting real time.
- For `async` test functions, just use `await` — Vitest handles awaiting `it` callbacks naturally.

## What to read next

- [mocking.md](mocking.md) — what to mock in the frontend (HTTP boundary, time, randomness — not internal services).
- [interface-design.md](interface-design.md) — designing components and services so their public surface is testable.
- [refactoring.md](refactoring.md) — refactor candidates after the slice is green.
