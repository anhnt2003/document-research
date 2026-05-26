import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Role, User } from '../../../core/models';
import { AdminService } from '../admin.service';
import { UiPageHeader } from '../../../shared/ui/page-header/page-header';
import { UiButton } from '../../../shared/ui/button/button';
import { UiBadge } from '../../../shared/ui/badge/badge';

@Component({
  selector: 'role-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, UiPageHeader, UiButton, UiBadge],
  template: `
    <ui-page-header
      eyebrow="№ IV/2 · VAI TRÒ"
      number="IV / 2"
      title="Vai trò & nhóm quyền"
      description="Tổ chức quyền theo vai trò để dễ phân phối khi mời người dùng mới."
    >
      <button ui-button>+ Vai trò mới</button>
    </ui-page-header>

    @if (loading()) {
      <p class="center mono">đang tải…</p>
    } @else {
      <div class="grid">
        @for (r of roles(); track r.id; let i = $index) {
          <a
            [routerLink]="['/admin/roles', r.id]"
            class="card reveal"
            [style.animation-delay.ms]="40 + i * 30"
          >
            <header class="card__head">
              <h3>{{ r.name }}</h3>
              @if (r.isSystem) {
                <ui-badge tone="ink">HỆ THỐNG</ui-badge>
              } @else {
                <ui-badge tone="amber">TÙY CHỈNH</ui-badge>
              }
            </header>
            <p class="desc">{{ r.description }}</p>
            <footer class="card__foot">
              <span class="mono">{{ memberCount(r.id) }} thành viên</span>
              <span class="dot">·</span>
              <span class="mono">{{ r.permissionKeys.length }} quyền</span>
              <span class="link">Chi tiết →</span>
            </footer>
          </a>
        }
      </div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .center { text-align: center; padding: 48px 0; color: var(--ink-400); }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }
      .card {
        display: block;
        padding: 22px;
        background: var(--paper-50);
        border: 1px solid var(--rule);
        color: inherit;
        text-decoration: none;
        transition: border-color 160ms var(--ease-out), transform 160ms var(--ease-out);
      }
      .card:hover {
        border-color: var(--ink-700);
        transform: translateY(-1px);
        border-bottom: 1px solid var(--ink-700);
      }
      .card__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .card h3 {
        font-family: var(--font-display);
        font-size: var(--fs-24);
        font-weight: 400;
        font-style: italic;
        font-variation-settings: 'opsz' 36, 'SOFT' 80;
        margin: 0;
        color: var(--ink-900);
      }
      .desc {
        color: var(--ink-600);
        font-size: var(--fs-14);
        line-height: 1.5;
        margin-bottom: 18px;
      }
      .card__foot {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        padding-top: 14px;
        border-top: 1px solid var(--rule);
        font-size: var(--fs-12);
      }
      .mono {
        font-family: var(--font-mono);
        color: var(--ink-500);
        letter-spacing: 0.06em;
      }
      .dot { color: var(--ink-300); }
      .link {
        margin-left: auto;
        font-family: var(--font-display);
        font-style: italic;
        color: var(--oxblood);
        font-size: var(--fs-14);
      }
    `,
  ],
})
export class RoleListPage implements OnInit {
  private svc = inject(AdminService);
  roles = signal<Role[]>([]);
  users = signal<User[]>([]);
  loading = signal(true);

  async ngOnInit() {
    try {
      const [roles, users] = await Promise.all([this.svc.roles(), this.svc.users()]);
      this.roles.set(roles);
      this.users.set(users);
    } finally {
      this.loading.set(false);
    }
  }

  memberCount(roleId: string): number {
    return this.users().filter((u) => u.roleIds.includes(roleId)).length;
  }
}
