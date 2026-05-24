import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Role, User } from '../../../core/models';
import { AdminService } from '../admin.service';
import { UiPageHeader } from '../../../shared/ui/page-header/page-header';
import { UiAvatar } from '../../../shared/ui/avatar/avatar';
import { UiBadge } from '../../../shared/ui/badge/badge';
import { UiTag } from '../../../shared/ui/tag/tag';
import { UiButton } from '../../../shared/ui/button/button';
import { UiInput } from '../../../shared/ui/input/input';
import { RelativeDatePipe } from '../../../shared/pipes/relative-date.pipe';

@Component({
  selector: 'user-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    UiPageHeader,
    UiAvatar,
    UiBadge,
    UiTag,
    UiButton,
    UiInput,
    RelativeDatePipe,
  ],
  template: `
    <ui-page-header
      eyebrow="№ IV · QUẢN TRỊ"
      number="IV / 1"
      title="Người dùng"
      description="Quản lý người dùng, vai trò và trạng thái tài khoản."
    >
      <a routerLink="/admin/users/new">
        <button ui-button>+ Mời người dùng</button>
      </a>
    </ui-page-header>

    <div class="bar">
      <input ui-input type="search" [(ngModel)]="q" placeholder="Lọc theo tên hoặc email…" class="search" />
      <select [(ngModel)]="statusFilter" class="select">
        <option value="">Mọi trạng thái</option>
        <option value="active">Đang hoạt động</option>
        <option value="locked">Đã khóa</option>
        <option value="invited">Đã mời</option>
      </select>
      <select [(ngModel)]="roleFilter" class="select">
        <option value="">Mọi vai trò</option>
        @for (r of roles(); track r.id) {
          <option [value]="r.id">{{ r.name }}</option>
        }
      </select>
    </div>

    @if (loading()) {
      <p class="center mono">đang tải…</p>
    } @else {
      <table class="table">
        <thead>
          <tr>
            <th>Người dùng</th>
            <th>Vai trò</th>
            <th>Trạng thái</th>
            <th>Đơn vị</th>
            <th>Đăng nhập gần nhất</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (u of filtered(); track u.id; let i = $index) {
            <tr class="reveal" [style.animation-delay.ms]="30 + i * 20">
              <td>
                <a [routerLink]="['/admin/users', u.id]" class="user">
                  <ui-avatar [user]="u" size="md" />
                  <div>
                    <span class="user__name">{{ u.displayName }}</span>
                    <span class="user__email mono">{{ u.email }}</span>
                  </div>
                </a>
              </td>
              <td>
                <div class="roles">
                  @for (rid of u.roleIds; track rid) {
                    <ui-tag color="oxblood">{{ roleName(rid) }}</ui-tag>
                  }
                </div>
              </td>
              <td>
                <ui-badge [tone]="statusTone(u.status)">
                  {{ statusLabel(u.status) }}
                </ui-badge>
              </td>
              <td class="dept">{{ u.department ?? '—' }}</td>
              <td class="mono">{{ u.lastLoginAt ? (u.lastLoginAt | relativeDate) : '—' }}</td>
              <td>
                <a [routerLink]="['/admin/users', u.id]" class="link">Chi tiết →</a>
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .bar {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 24px;
      }
      .search { min-width: 320px; flex: 1; }
      .select {
        font: inherit;
        padding: 8px 12px;
        border: 1px solid var(--rule-strong);
        background: var(--paper-50);
        border-radius: var(--radius-sm);
        min-width: 160px;
      }
      .center { text-align: center; padding: 48px 0; color: var(--ink-400); }
      .table { width: 100%; border-collapse: collapse; }
      thead th {
        text-align: left;
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--ink-500);
        padding: 14px 16px;
        border-bottom: 1px solid var(--rule);
      }
      tbody td {
        padding: 16px;
        border-bottom: 1px solid var(--rule);
        vertical-align: middle;
        font-size: var(--fs-14);
      }
      tbody tr { transition: background 120ms var(--ease-out); }
      tbody tr:hover { background: var(--paper-100); }
      .user {
        display: flex;
        align-items: center;
        gap: 12px;
        color: inherit;
        border-bottom: none;
      }
      .user:hover { border-bottom: none; }
      .user__name {
        font-family: var(--font-display);
        font-style: italic;
        font-size: var(--fs-16);
        color: var(--ink-900);
      }
      .user__email {
        display: block;
        font-size: var(--fs-12);
        color: var(--ink-500);
        margin-top: 2px;
        letter-spacing: 0.04em;
      }
      .roles { display: flex; gap: 6px; flex-wrap: wrap; }
      .mono { font-family: var(--font-mono); font-size: var(--fs-12); color: var(--ink-500); }
      .dept { color: var(--ink-600); }
      .link {
        font-family: var(--font-display);
        font-style: italic;
        color: var(--oxblood);
        font-size: var(--fs-14);
      }
    `,
  ],
})
export class UserListPage implements OnInit {
  private svc = inject(AdminService);

  users = signal<User[]>([]);
  roles = signal<Role[]>([]);
  loading = signal(true);
  q = '';
  statusFilter = '';
  roleFilter = '';

  filtered = computed(() => {
    const term = this.q.toLowerCase().trim();
    return this.users().filter((u) => {
      if (term && !u.displayName.toLowerCase().includes(term) && !u.email.toLowerCase().includes(term)) {
        return false;
      }
      if (this.statusFilter && u.status !== this.statusFilter) return false;
      if (this.roleFilter && !u.roleIds.includes(this.roleFilter)) return false;
      return true;
    });
  });

  async ngOnInit() {
    try {
      const [users, roles] = await Promise.all([this.svc.users(), this.svc.roles()]);
      this.users.set(users);
      this.roles.set(roles);
    } finally {
      this.loading.set(false);
    }
  }

  roleName(id: string): string {
    return this.roles().find((r) => r.id === id)?.name ?? id;
  }

  statusTone(s: string): 'moss' | 'rust' | 'amber' {
    return s === 'active' ? 'moss' : s === 'locked' ? 'rust' : 'amber';
  }
  statusLabel(s: string): string {
    return s === 'active' ? 'Hoạt động' : s === 'locked' ? 'Đã khóa' : 'Đã mời';
  }
}
