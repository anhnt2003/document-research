import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { AdminService } from './admin.service';
import { API_CONFIG } from '../../core/api/api.config';
import { User } from '../../core/models';

const BASE = 'http://test';

describe('AdminService.createUser', () => {
  let svc: AdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { baseUrl: BASE, useMock: false } },
      ],
    });
    svc = TestBed.inject(AdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('POSTs the invite to /users and returns the created user', async () => {
    const input = { email: 'new@b.c', displayName: 'New', roleIds: ['role-viewer'] };
    const promise = svc.createUser(input);

    const req = http.expectOne(`${BASE}/users`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);

    const created: User = {
      id: 'u-new', email: 'new@b.c', displayName: 'New', avatarUrl: null,
      status: 'active', roleIds: ['role-viewer'], createdAt: '2026-01-01', lastLoginAt: null,
    };
    req.flush(created);

    expect(await promise).toEqual(created);
  });
});
