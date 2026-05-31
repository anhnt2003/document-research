import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Role, User } from '../../../core/models';
import { AdminService } from '../admin.service';
import { UiPageHeader } from '../../../shared/ui/page-header/page-header';
import { UiAvatar } from '../../../shared/ui/avatar/avatar';
import { UiBadge } from '../../../shared/ui/badge/badge';
import { UiTag } from '../../../shared/ui/tag/tag';
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
    UiInput,
    RelativeDatePipe,
  ],
  template: `
    <ui-page-header
      eyebrow="№ IV · QUẢN TRỊ"
      number="IV / 1"
      title="Người dùng"
      description="Quản lý người dùng, vai trò và trạng thái tài khoản."
    />

    <div class="bar">
      <input ui-input type="search" [(ngModel)]="q" placeholder="Lọc theo tên hoặc email…" class="search" />
      <select [(ngModel)]="statusFilter" class="select">
        <option value="">Mọi trạng thái</option>
        <option value="active">Đang hoạt động</option>
        <option value="locked">Đã khóa</option>
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
        flex-wrap: wrap;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--r-lg);
        box-shadow: var(--sh-2);
        padding: 14px 18px;
      }
      .search { min-width: 280px; flex: 1; }
      .select {
        font: inherit;
        padding: 10px 36px 10px 15px;
        border: 1px solid var(--line);
        background: var(--surface);
        box-shadow: var(--sh-1);
        border-radius: var(--r-pill);
        min-width: 160px;
        color: var(--ink-700);
        -webkit-appearance: none;
        appearance: none;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' stroke='%236f6757' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>");
        background-repeat: no-repeat;
        background-position: right 14px center;
      }
      .center { text-align: center; padding: 48px 0; color: var(--ink-400); }
      .table {
        width: 100%;
        border-collapse: collapse;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--r-lg);
        box-shadow: var(--sh-2);
        overflow: hidden;
      }
      thead th {
        text-align: left;
        font-family: var(--mono);
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--ink-400);
        padding: 15px 24px;
        border-bottom: 1px solid var(--line);
        background: var(--surface-2);
      }
      tbody td {
        padding: 18px 24px;
        border-bottom: 1px solid var(--line-soft);
        vertical-align: middle;
        font-size: var(--fs-14);
      }
      tbody tr { transition: background 160ms var(--ease-out); position: relative; }
      tbody tr:last-child td { border-bottom: none; }
      tbody tr:hover { background: var(--surface-2); }
      tbody tr td:first-child { box-shadow: inset 0 0 0 0 var(--accent); transition: box-shadow 160ms var(--ease-out); }
      tbody tr:hover td:first-child { box-shadow: inset 3px 0 0 0 var(--accent); }
      .user {
        display: flex;
        align-items: center;
        gap: 12px;
        color: inherit;
        border-bottom: none;
      }
      .user:hover { border-bottom: none; }
      .user__name {
        font-family: var(--serif);
        font-weight: 600;
        font-size: var(--fs-16);
        color: var(--ink-900);
        letter-spacing: -0.01em;
        transition: color 160ms var(--ease-out);
      }
      .user:hover .user__name { color: var(--accent); }
      .user__email {
        display: block;
        font-family: var(--mono);
        font-size: var(--fs-12);
        color: var(--ink-400);
        margin-top: 3px;
        letter-spacing: 0.04em;
      }
      .roles { display: flex; gap: 6px; flex-wrap: wrap; }
      .mono { font-family: var(--mono); font-size: var(--fs-12); color: var(--ink-500); }
      .dept { color: var(--ink-500); }
      .link {
        font-family: var(--serif);
        font-style: italic;
        color: var(--accent);
        font-size: var(--fs-14);
        border-bottom: none;
      }
      .link:hover { color: var(--accent-700); border-bottom: none; }
      @media (max-width: 720px) {
        thead th, tbody td { padding-left: 16px; padding-right: 16px; }
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

  statusTone(s: string): 'moss' | 'rust' {
    return s === 'active' ? 'moss' : 'rust';
  }
  statusLabel(s: string): string {
    return s === 'active' ? 'Hoạt động' : 'Đã khóa';
  }
}
