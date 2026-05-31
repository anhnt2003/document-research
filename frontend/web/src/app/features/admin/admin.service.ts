import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { API_CONFIG } from '../../core/api/api.config';
import { Permission, Role, User } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private config = inject(API_CONFIG);

  users(): Promise<User[]> {
    return firstValueFrom(this.http.get<User[]>(`${this.config.baseUrl}/users`));
  }
  user(id: string): Promise<User> {
    return firstValueFrom(this.http.get<User>(`${this.config.baseUrl}/users/${id}`));
  }
  patchUser(id: string, payload: Partial<User>): Promise<User> {
    return firstValueFrom(
      this.http.patch<User>(`${this.config.baseUrl}/users/${id}`, payload)
    );
  }
  createUser(input: { email: string; displayName: string; roleIds: string[] }): Promise<User> {
    return firstValueFrom(this.http.post<User>(`${this.config.baseUrl}/users`, input));
  }

  roles(): Promise<Role[]> {
    return firstValueFrom(this.http.get<Role[]>(`${this.config.baseUrl}/roles`));
  }
  role(id: string): Promise<Role> {
    return firstValueFrom(this.http.get<Role>(`${this.config.baseUrl}/roles/${id}`));
  }
  patchRole(id: string, payload: Partial<Role>): Promise<Role> {
    return firstValueFrom(
      this.http.patch<Role>(`${this.config.baseUrl}/roles/${id}`, payload)
    );
  }

  permissions(): Promise<Permission[]> {
    return firstValueFrom(
      this.http.get<Permission[]>(`${this.config.baseUrl}/permissions`)
    );
  }
}
