import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { API_CONFIG } from '../api/api.config';
import { Iso, MeResponse, Role, SignInResponse, User } from '../models';

const STORAGE_KEY = 'docres.session';

interface Session {
  token: string;
  expiresAt: Iso;
  user: User;
  roles: Role[];
  permissionKeys: string[];
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
  readonly permissions = computed(() => new Set(this.session()?.permissionKeys ?? []));
  readonly isAdmin = computed(() => this.roles().some((r) => r.id === 'role-admin'));

  async signInWithGoogle(idToken: string): Promise<void> {
    const resp = await firstValueFrom(
      this.http.post<SignInResponse>(`${this.config.baseUrl}/auth/google`, { idToken })
    );
    const me = await firstValueFrom(
      this.http.get<MeResponse>(`${this.config.baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${resp.token}` },
      })
    );
    const session: Session = {
      token: resp.token,
      expiresAt: resp.expiresAt,
      user: me.user,
      roles: me.roles,
      permissionKeys: me.permissionKeys,
    };
    this.session.set(session);
    this.persist(session);
  }

  async refreshMe(): Promise<void> {
    const current = this.session();
    if (!current) return;
    try {
      const me = await firstValueFrom(
        this.http.get<MeResponse>(`${this.config.baseUrl}/auth/me`)
      );
      const updated: Session = {
        ...current,
        user: me.user,
        roles: me.roles,
        permissionKeys: me.permissionKeys,
      };
      this.session.set(updated);
      this.persist(updated);
    } catch {
      this.session.set(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  logout(): void {
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
