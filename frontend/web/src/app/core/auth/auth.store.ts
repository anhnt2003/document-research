import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { API_CONFIG } from '../api/api.config';
import { LoginResponse, Role, User } from '../models';

const STORAGE_KEY = 'docres.session';

interface Session {
  token: string;
  user: User;
  roles: Role[];
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private http = inject(HttpClient);
  private config = inject(API_CONFIG);

  private session = signal<Session | null>(this.restore());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly roles = computed(() => this.session()?.roles ?? []);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly isAuthenticated = computed(() => !!this.session());
  readonly permissions = computed(() =>
    new Set(this.roles().flatMap((r) => r.permissionKeys))
  );
  readonly isAdmin = computed(() =>
    this.roles().some((r) => r.id === 'role-admin')
  );

  async login(email: string, password: string): Promise<void> {
    const resp = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.config.baseUrl}/auth/login`, {
        email,
        password,
      })
    );
    const session: Session = {
      token: resp.token,
      user: resp.user,
      roles: resp.roles,
    };
    this.session.set(session);
    this.persist(session);
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.config.baseUrl}/auth/logout`, {})
      );
    } catch {
      /* ignore */
    }
    this.session.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  hasPermission(key: string): boolean {
    return this.permissions().has(key);
  }

  hasRole(roleId: string): boolean {
    return this.roles().some((r) => r.id === roleId);
  }

  private restore(): Session | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  }

  private persist(session: Session): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* ignore */
    }
  }
}
