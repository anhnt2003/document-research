import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Role, User } from '../../../core/models';
import { AdminService } from '../admin.service';
import { UiPageHeader } from '../../../shared/ui/page-header/page-header';
import { UiAvatar } from '../../../shared/ui/avatar/avatar';
import { UiButton } from '../../../shared/ui/button/button';
import { UiField } from '../../../shared/ui/field/field';
import { UiInput } from '../../../shared/ui/input/input';
import { UiTag } from '../../../shared/ui/tag/tag';
import { UiBadge } from '../../../shared/ui/badge/badge';
import { formatDateLong } from '../../../core/util/date';

@Component({
  selector: 'user-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    UiPageHeader,
    UiAvatar,
    UiButton,
    UiField,
    UiInput,
    UiTag,
    UiBadge,
  ],
  template: `
    @if (user(); as u) {
      <ui-page-header
        eyebrow="№ IV/1 · CHI TIẾT"
        [number]="'ID ' + u.id.replace('u-', '')"
        [title]="u.displayName"
      >
        <a routerLink="/admin/users"><button ui-button variant="ghost">← Danh sách</button></a>
        <button ui-button variant="outline" (click)="toggleLock(u)">
          {{ u.status === 'locked' ? 'Mở khóa' : 'Khóa tài khoản' }}
        </button>
        <button ui-button (click)="save()">Lưu</button>
      </ui-page-header>

      <div class="grid">
        <section class="main">
          <div class="avatar-row">
            <ui-avatar [user]="u" size="xl" />
            <div>
              <h2>{{ u.displayName }}</h2>
              <p class="mono">{{ u.email }}</p>
              <ui-badge [tone]="statusTone(u.status)">{{ statusLabel(u.status) }}</ui-badge>
            </div>
          </div>

          <form class="form">
            <ui-field label="Tên hiển thị">
              <input ui-input [(ngModel)]="form.displayName" name="displayName" />
            </ui-field>
            <ui-field label="Email">
              <input ui-input [(ngModel)]="form.email" name="email" type="email" />
            </ui-field>
          </form>

          <section class="roles">
            <h3 class="block__title">Vai trò</h3>
            <p class="block__hint">Tích để gắn vai trò cho người dùng.</p>
            <div class="role-grid">
              @for (r of roles(); track r.id) {
                <label class="role">
                  <input
                    type="checkbox"
                    [checked]="form.roleIds.includes(r.id)"
                    (change)="toggleRole(r.id, $event)"
                  />
                  <div>
                    <span class="role__name">{{ r.name }}</span>
                    <span class="role__desc">{{ r.description }}</span>
                    <span class="role__count mono">{{ r.permissionKeys.length }} quyền</span>
                  </div>
                </label>
              }
            </div>
          </section>
        </section>

        <aside class="aside">
          <section>
            <span class="label">Tạo lúc</span>
            <span>{{ formatDateLong(u.createdAt) }}</span>
          </section>
          <section>
            <span class="label">Đăng nhập gần nhất</span>
            <span>{{ u.lastLoginAt ? formatDateLong(u.lastLoginAt) : '— chưa từng' }}</span>
          </section>
          <section>
            <span class="label">Vai trò hiện tại</span>
            <div class="tags">
              @for (rid of u.roleIds; track rid) {
                <ui-tag color="oxblood">{{ roleName(rid) }}</ui-tag>
              }
            </div>
          </section>
        </aside>
      </div>
    } @else if (loading()) {
      <p class="center mono">đang tải…</p>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 280px;
        gap: 56px;
        align-items: flex-start;
      }
      .avatar-row {
        display: flex;
        gap: 24px;
        align-items: center;
        padding-bottom: 24px;
        margin-bottom: 24px;
        border-bottom: 1px solid var(--rule);
      }
      .avatar-row h2 {
        font-family: var(--font-display);
        font-size: var(--fs-30);
        font-style: italic;
        font-variation-settings: 'opsz' 48, 'SOFT' 70;
        margin: 0 0 4px;
      }
      .avatar-row .mono {
        color: var(--ink-500);
        font-size: var(--fs-13);
        margin-bottom: 8px;
      }
      .form {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 32px;
      }
      .block__title {
        font-family: var(--font-display);
        font-style: italic;
        font-size: var(--fs-24);
        font-variation-settings: 'opsz' 36, 'SOFT' 80;
        margin: 0 0 6px;
      }
      .block__hint { color: var(--ink-500); font-size: var(--fs-14); margin-bottom: 16px; }
      .role-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .role {
        display: flex;
        gap: 12px;
        padding: 14px;
        border: 1px solid var(--rule);
        background: var(--paper-50);
        cursor: pointer;
        border-radius: var(--radius-sm);
        transition: border-color 140ms var(--ease-out), background 140ms var(--ease-out);
      }
      .role:hover { border-color: var(--ink-700); }
      .role input { margin-top: 4px; accent-color: var(--oxblood); }
      .role__name {
        display: block;
        font-family: var(--font-display);
        font-style: italic;
        font-size: var(--fs-16);
        color: var(--ink-900);
      }
      .role__desc {
        display: block;
        font-size: var(--fs-13);
        color: var(--ink-600);
        margin-top: 2px;
      }
      .role__count {
        display: block;
        margin-top: 6px;
        font-size: var(--fs-12);
        color: var(--ink-400);
      }
      .aside section {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--rule);
        margin-bottom: 16px;
      }
      .label {
        font-family: var(--font-mono);
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--ink-500);
      }
      .aside section > span:last-child {
        font-size: var(--fs-14);
        color: var(--ink-800);
      }
      .tags { display: flex; flex-wrap: wrap; gap: 6px; }
      .center { text-align: center; padding: 80px 0; color: var(--ink-400); }
      @media (max-width: 880px) {
        .grid, .form, .role-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class UserDetailPage implements OnInit {
  private svc = inject(AdminService);
  private route = inject(ActivatedRoute);
  user = signal<User | null>(null);
  roles = signal<Role[]>([]);
  loading = signal(true);
  formatDateLong = formatDateLong;

  form: Partial<User> & { roleIds: string[] } = {
    displayName: '',
    email: '',
    roleIds: [],
  };

  ngOnInit() {
    this.route.paramMap.subscribe(async (p) => {
      const id = p.get('id');
      if (!id) return;
      await this.load(id);
    });
  }

  async load(id: string) {
    this.loading.set(true);
    try {
      const [u, roles] = await Promise.all([this.svc.user(id), this.svc.roles()]);
      this.user.set(u);
      this.roles.set(roles);
      this.form = {
        displayName: u.displayName,
        email: u.email,
        roleIds: [...u.roleIds],
      };
    } finally {
      this.loading.set(false);
    }
  }

  toggleRole(id: string, e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.form.roleIds = checked
      ? [...this.form.roleIds, id]
      : this.form.roleIds.filter((r) => r !== id);
  }

  async save() {
    const u = this.user();
    if (!u) return;
    const updated = await this.svc.patchUser(u.id, this.form);
    this.user.set(updated);
  }

  async toggleLock(u: User) {
    const next = u.status === 'locked' ? 'active' : 'locked';
    const updated = await this.svc.patchUser(u.id, { status: next });
    this.user.set(updated);
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
