import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { DocumentsService } from './documents.service';
import { API_CONFIG } from '../../core/api/api.config';

const BASE = 'http://test';

describe('DocumentsService.streamIngestionStatus', () => {
  class MockEventSource {
    static lastUrl = '';
    onerror: ((e: unknown) => void) | null = null;
    constructor(url: string) {
      MockEventSource.lastUrl = url;
    }
    addEventListener(): void {}
    close(): void {}
  }

  beforeEach(() => {
    MockEventSource.lastUrl = '';
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
    const store = new Map<string, string>();
    store.set(
      'docres.session',
      JSON.stringify({ token: 'jwt-abc', expiresAt: '2099-01-01', user: null, roles: [], permissionKeys: [] }),
    );
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('appends the session access_token to the stream URL (EventSource cannot send headers)', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { baseUrl: BASE, useMock: false } },
      ],
    });
    const svc = TestBed.inject(DocumentsService);

    const sub = svc.streamIngestionStatus('doc-1').subscribe();

    expect(MockEventSource.lastUrl).toContain('/documents/doc-1/ingestion/stream');
    expect(MockEventSource.lastUrl).toContain('access_token=jwt-abc');
    sub.unsubscribe();
  });
});
