import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { DocumentDetailPage } from './document-detail.page';
import { API_CONFIG } from '../../core/api/api.config';
import { AccessLevel, DocumentDto } from '../../core/models';

const BASE = 'http://test';

function seedSession(permissionKeys: string[]): void {
  const store = new Map<string, string>();
  store.set(
    'docres.session',
    JSON.stringify({ token: 't', expiresAt: '2099-01-01', user: { id: 'me' }, roles: [], permissionKeys }),
  );
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
}

function makeDoc(level: AccessLevel): DocumentDto {
  return {
    id: 'doc-1', title: 'T', body: 'B', createdAt: '2026-01-01',
    fileName: null, mimeType: null, sizeBytes: null, ingestionStatus: 'Ready',
    ownerId: 'someone', visibility: 'private', myAccessLevel: level,
  };
}

describe('DocumentDetailPage sharing UI', () => {
  let http: HttpTestingController;

  afterEach(() => vi.unstubAllGlobals());

  async function mount(level: AccessLevel): Promise<ComponentFixture<DocumentDetailPage>> {
    await TestBed.configureTestingModule({
      imports: [DocumentDetailPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { baseUrl: BASE, useMock: false } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'doc-1' })) } },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DocumentDetailPage);
    fixture.detectChanges(); // fires ngOnInit -> load()

    http.expectOne(`${BASE}/documents/doc-1`).flush(makeDoc(level));
    http.expectOne(`${BASE}/tags`).flush([]);
    http.expectOne(`${BASE}/documents/doc-1/tags`).flush([]);

    // Let the async load() continuation run (Promise.all resolves, doc is set), then the
    // owner/admin path issues a share-list request which we flush on the next turn.
    await new Promise((r) => setTimeout(r));
    http.match(`${BASE}/documents/doc-1/shares`).forEach((req) => req.flush([]));
    await new Promise((r) => setTimeout(r));

    fixture.detectChanges();
    return fixture;
  }

  it('shows the share panel when the user can manage sharing (owner)', async () => {
    seedSession(['documents:read']);
    const fixture = await mount('owner');

    expect(fixture.nativeElement.querySelector('document-share-panel')).not.toBeNull();
  });

  it('hides the share panel for a read-only viewer', async () => {
    seedSession(['documents:read']);
    const fixture = await mount('read');

    expect(fixture.nativeElement.querySelector('document-share-panel')).toBeNull();
  });
});
