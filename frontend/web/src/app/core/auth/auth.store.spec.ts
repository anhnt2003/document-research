import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { AuthStore } from './auth.store';
import { API_CONFIG } from '../api/api.config';
import { DocumentDto } from '../models';

function doc(level: DocumentDto['myAccessLevel']): DocumentDto {
  return {
    id: 'd-1', title: 'T', body: '', createdAt: '2026-01-01',
    fileName: null, mimeType: null, sizeBytes: null, ingestionStatus: 'Ready',
    ownerId: 'someone', myAccessLevel: level,
  };
}

const STORAGE_KEY = 'docres.session';

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
});

function seedSession(permissionKeys: string[], roleIds: string[] = []): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      token: 't',
      expiresAt: '2099-01-01',
      user: { id: 'u-1', email: 'a@b.c', displayName: 'A', avatarUrl: null, status: 'active', roleIds, createdAt: '2026-01-01', lastLoginAt: null },
      roles: roleIds.map((id) => ({ id, name: id, description: null, isSystem: id === 'admin', permissionKeys })),
      permissionKeys,
    }),
  );
}

function makeStore(): AuthStore {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_CONFIG, useValue: { baseUrl: 'http://test', useMock: false } },
    ],
  });
  return TestBed.inject(AuthStore);
}

describe('AuthStore.isAdmin', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is true when the session has the admin role', () => {
    seedSession([], ['admin']);
    expect(makeStore().isAdmin()).toBe(true);
  });

  it('is false when the session has no admin role', () => {
    seedSession(['documents:read', 'documents:write'], ['editor']);
    expect(makeStore().isAdmin()).toBe(false);
  });
});

describe('AuthStore document capabilities', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lets only the owner edit or delete', () => {
    seedSession(['documents:read']);
    const store = makeStore();
    expect(store.canEditDocument(doc('owner'))).toBe(true);
    expect(store.canEditDocument(doc('none'))).toBe(false);
    expect(store.canDeleteDocument(doc('owner'))).toBe(true);
    expect(store.canDeleteDocument(doc('none'))).toBe(false);
  });

  it('lets an admin edit/delete any document', () => {
    seedSession([], ['admin']);
    const store = makeStore();
    expect(store.canEditDocument(doc('none'))).toBe(true);
    expect(store.canDeleteDocument(doc('none'))).toBe(true);
  });
});
