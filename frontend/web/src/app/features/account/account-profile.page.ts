import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthStore } from '../../core/auth/auth.store';
import { Permission } from '../../core/models';
import { AdminService } from '../admin/admin.service';
import { UiPageHeader } from '../../shared/ui/page-header/page-header';
import { UiButton } from '../../shared/ui/button/button';
import { UiField } from '../../shared/ui/field/field';
import { UiInput } from '../../shared/ui/input/input';
import { UiAvatar } from '../../shared/ui/avatar/avatar';
import { UiTag } from '../../shared/ui/tag/tag';

interface GrantedGroup {
  label: string;
  items: Permission[];
}

const GROUP_LABELS: Record<string, string> = {
  document: 'Tài liệu',
  user: 'Người dùng',
  role: 'Vai trò & quyền',
  search: 'Tra cứu',
  system: 'Hệ thống',
};

@Component({
  selector: 'account-profile-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, UiPageHeader, UiButton, UiField, UiInput, UiAvatar, UiTag],
  template: `
    <ui-page-header
      eyebrow="№ III · TÀI KHOẢN"
      number="III / 1"
      title="Hồ sơ"
      description="Thông tin định danh và tuỳ chỉnh hiển thị của bạn trong kho lưu trữ."
    >
      <button ui-button>Lưu thay đổi</button>
    </ui-page-header>

    @if (auth.user(); as user) {
      <div class="grid">
        <section class="col-main">
          <div class="avatar-row">
            <ui-avatar [user]="user" size="xl" />
            <div class="avatar-row__text">
              <h2>{{ user.displayName }}</h2>
              <p class="mono">{{ user.email }}</p>
              <div class="roles">
                @for (r of auth.roles(); track r.id) {
                  <ui-tag color="oxblood">{{ r.name }}</ui-tag>
                }
              </div>
            </div>
          </div>

          <form class="form">
            <ui-field label="Tên hiển thị" hint="Hiển thị trong toàn bộ ứng dụng">
              <input ui-input type="text" name="displayName" [ngModel]="user.displayName" />
            </ui-field>
            <ui-field label="Email" hint="Đăng nhập và nhận thông báo">
              <input ui-input type="email" name="email" [ngModel]="user.email" />
            </ui-field>
            <ui-field label="Chức danh">
              <input ui-input type="text" name="title" [ngModel]="user.title" />
            </ui-field>
            <ui-field label="Khoa / phòng ban">
              <input ui-input type="text" name="department" [ngModel]="user.department" />
            </ui-field>
            <ui-field label="Ngôn ngữ" hint="Ảnh hưởng đến UI và format ngày">
              <select [ngModel]="user.locale" name="locale" class="select">
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </ui-field>
          </form>
        </section>

        <aside class="col-aside">
          <span class="eyebrow">§ Quyền của bạn</span>
          @if (grantedGroups().length === 0) {
            <p class="hint">Đang tải danh sách quyền…</p>
          } @else {
            <ul class="perm-groups">
              @for (g of grantedGroups(); track g.label) {
                <li class="perm-group">
                  <span class="perm-group__name mono">{{ g.label }}</span>
                  <ul>
                    @for (p of g.items; track p.key) {
                      <li class="perm" [title]="p.description">
                        <span class="perm__dot" aria-hidden="true">•</span>
                        <span class="perm__label">{{ p.label }}</span>
                      </li>
                    }
                  </ul>
                </li>
              }
            </ul>
          }
          <p class="hint">
            Để thay đổi danh sách quyền, hãy liên hệ quản trị viên hoặc xem chi tiết vai trò.
          </p>
        </aside>
      </div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .select {
        font: inherit;
        padding: 8px 12px;
        border: 1px solid var(--rule-strong);
        background: var(--paper-50);
        border-radius: var(--radius-sm);
        width: 100%;
      }
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
        margin-bottom: 28px;
        border-bottom: 1px solid var(--rule);
      }
      .avatar-row__text h2 {
        font-family: var(--font-display);
        font-size: var(--fs-30);
        font-weight: 400;
        font-variation-settings: 'opsz' 48, 'SOFT' 70;
        margin: 0 0 4px;
      }
      .avatar-row__text .mono {
        color: var(--ink-500);
        font-size: var(--fs-13);
        letter-spacing: 0.04em;
      }
      .roles {
        margin-top: 10px;
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .form {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }
      .form ui-field:nth-child(odd):last-child { grid-column: 1 / -1; }
      .col-aside .eyebrow {
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--ink-500);
        display: block;
        margin-bottom: 16px;
      }
      .perm-groups {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .perm-group__name {
        display: block;
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--ink-500);
        margin-bottom: 8px;
      }
      .perm-group > ul {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .perm {
        display: flex;
        gap: 8px;
        align-items: baseline;
        font-size: var(--fs-13);
        color: var(--ink-700);
        line-height: 1.5;
      }
      .perm__dot {
        color: var(--oxblood);
        font-size: 14px;
        line-height: 1;
      }
      .perm__label { flex: 1; }
      .hint {
        margin-top: 16px;
        font-size: var(--fs-13);
        color: var(--ink-500);
        font-style: italic;
        line-height: 1.5;
      }
      @media (max-width: 880px) {
        .grid { grid-template-columns: 1fr; }
        .form { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class AccountProfilePage implements OnInit {
  auth = inject(AuthStore);
  private admin = inject(AdminService);

  private catalog = signal<Permission[]>([]);

  grantedGroups = computed<GrantedGroup[]>(() => {
    const granted = this.auth.permissions();
    const byGroup = new Map<string, Permission[]>();
    for (const p of this.catalog()) {
      if (!granted.has(p.key)) continue;
      const list = byGroup.get(p.group) ?? [];
      list.push(p);
      byGroup.set(p.group, list);
    }
    return Array.from(byGroup.entries())
      .map(([group, items]) => ({ label: GROUP_LABELS[group] ?? group, items }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  });

  async ngOnInit() {
    try {
      this.catalog.set(await this.admin.permissions());
    } catch {
      this.catalog.set([]);
    }
  }
}
