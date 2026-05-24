import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Permission, Role } from '../../../core/models';
import { AdminService } from '../admin.service';
import { UiPageHeader } from '../../../shared/ui/page-header/page-header';
import { UiButton } from '../../../shared/ui/button/button';
import { UiBadge } from '../../../shared/ui/badge/badge';
import { UiField } from '../../../shared/ui/field/field';
import { UiInput } from '../../../shared/ui/input/input';

interface PermissionGroup {
  group: string;
  label: string;
  items: Permission[];
}

@Component({
  selector: 'role-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, UiPageHeader, UiButton, UiBadge, UiField, UiInput],
  template: `
    @if (role(); as r) {
      <ui-page-header
        eyebrow="№ IV/2 · CHI TIẾT VAI TRÒ"
        number="IV / 2.a"
        [title]="r.name"
      >
        <a routerLink="/admin/roles"><button ui-button variant="ghost">← Danh sách</button></a>
        @if (r.isSystem) {
          <ui-badge tone="ink">HỆ THỐNG</ui-badge>
        }
        <button ui-button (click)="save()" [disabled]="saving()">
          {{ saving() ? 'Đang lưu…' : 'Lưu' }}
        </button>
      </ui-page-header>

      <div class="meta">
        <ui-field label="Tên vai trò">
          <input ui-input [(ngModel)]="form.name" name="name" />
        </ui-field>
        <ui-field label="Mô tả">
          <input ui-input [(ngModel)]="form.description" name="description" />
        </ui-field>
      </div>

      <section class="matrix">
        <header class="matrix__head">
          <span class="eyebrow">§ Ma trận phân quyền</span>
          <div class="counts mono">
            <span>{{ selectedCount() }} / {{ allPermissions().length }} quyền</span>
          </div>
        </header>

        @for (g of groups(); track g.group) {
          <article class="group">
            <header class="group__head">
              <h3>{{ g.label }}</h3>
              <button
                type="button"
                class="select-all mono"
                (click)="toggleGroup(g)"
              >{{ allGroupSelected(g) ? 'Bỏ chọn nhóm' : 'Chọn cả nhóm' }}</button>
            </header>
            <ul>
              @for (p of g.items; track p.key) {
                <li>
                  <label>
                    <input
                      type="checkbox"
                      [checked]="form.permissionKeys.includes(p.key)"
                      (change)="toggle(p.key, $event)"
                    />
                    <div>
                      <span class="perm__label">{{ p.label }}</span>
                      <span class="perm__key mono">{{ p.key }}</span>
                      <span class="perm__desc">{{ p.description }}</span>
                    </div>
                  </label>
                </li>
              }
            </ul>
          </article>
        }
      </section>

      @if (savedHint()) {
        <p class="saved-hint">
          <span class="mark">❧</span> Đã lưu thay đổi — vai trò đã được cập nhật trong phiên này.
        </p>
      }
    } @else if (loading()) {
      <p class="center mono">đang tải…</p>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .meta {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 20px;
        margin-bottom: 36px;
      }
      .matrix__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--rule);
      }
      .matrix__head .eyebrow {
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--ink-500);
      }
      .counts {
        font-size: var(--fs-12);
        color: var(--ink-500);
      }
      .group { padding: 22px 0; border-bottom: 1px solid var(--rule); }
      .group__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 14px;
      }
      .group h3 {
        font-family: var(--font-display);
        font-style: italic;
        font-size: var(--fs-24);
        font-variation-settings: 'opsz' 36, 'SOFT' 80;
        margin: 0;
      }
      .select-all {
        font-size: var(--fs-12);
        color: var(--oxblood);
        cursor: pointer;
        letter-spacing: 0.06em;
        font-family: var(--font-mono);
        background: none;
      }
      .select-all:hover { color: var(--oxblood-hover); }
      .group ul {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .group li label {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 14px;
        background: var(--paper-50);
        border: 1px solid var(--rule);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: border-color 140ms var(--ease-out), background 140ms var(--ease-out);
      }
      .group li label:hover { border-color: var(--ink-700); }
      .group li input { margin-top: 4px; accent-color: var(--oxblood); }
      .perm__label {
        font-family: var(--font-display);
        font-size: var(--fs-15);
        color: var(--ink-900);
        font-style: italic;
      }
      .perm__key {
        display: block;
        font-size: var(--fs-12);
        color: var(--oxblood);
        margin-top: 2px;
        letter-spacing: 0.06em;
      }
      .perm__desc {
        display: block;
        font-size: var(--fs-13);
        color: var(--ink-500);
        margin-top: 6px;
      }
      .saved-hint {
        margin-top: 24px;
        padding: 14px 16px;
        background: var(--moss-soft);
        border-left: 2px solid var(--moss);
        color: var(--ink-800);
        font-size: var(--fs-14);
      }
      .saved-hint .mark {
        font-family: var(--font-display);
        font-style: italic;
        color: var(--moss);
        margin-right: 6px;
      }
      .center { text-align: center; padding: 80px 0; color: var(--ink-400); }
      @media (max-width: 880px) {
        .meta, .group ul { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class RoleDetailPage implements OnInit {
  private svc = inject(AdminService);
  private route = inject(ActivatedRoute);

  role = signal<Role | null>(null);
  allPermissions = signal<Permission[]>([]);
  loading = signal(true);
  saving = signal(false);
  savedHint = signal(false);

  form: { name: string; description: string; permissionKeys: string[] } = {
    name: '',
    description: '',
    permissionKeys: [],
  };

  selectedCount = computed(() => this.form.permissionKeys.length);

  groups = computed<PermissionGroup[]>(() => {
    const labels: Record<string, string> = {
      document: 'Tài liệu',
      user: 'Người dùng',
      role: 'Vai trò & quyền',
      search: 'Tìm kiếm',
      system: 'Hệ thống',
    };
    const byGroup = new Map<string, Permission[]>();
    for (const p of this.allPermissions()) {
      const arr = byGroup.get(p.group) ?? [];
      arr.push(p);
      byGroup.set(p.group, arr);
    }
    return Array.from(byGroup.entries()).map(([group, items]) => ({
      group,
      label: labels[group] ?? group,
      items,
    }));
  });

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
      const [role, perms] = await Promise.all([
        this.svc.role(id),
        this.svc.permissions(),
      ]);
      this.role.set(role);
      this.allPermissions.set(perms);
      this.form = {
        name: role.name,
        description: role.description,
        permissionKeys: [...role.permissionKeys],
      };
    } finally {
      this.loading.set(false);
    }
  }

  toggle(key: string, e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.form.permissionKeys = checked
      ? [...this.form.permissionKeys, key]
      : this.form.permissionKeys.filter((k) => k !== key);
  }

  allGroupSelected(g: PermissionGroup): boolean {
    return g.items.every((p) => this.form.permissionKeys.includes(p.key));
  }

  toggleGroup(g: PermissionGroup) {
    if (this.allGroupSelected(g)) {
      const keys = new Set(g.items.map((p) => p.key));
      this.form.permissionKeys = this.form.permissionKeys.filter((k) => !keys.has(k));
    } else {
      const next = new Set(this.form.permissionKeys);
      for (const p of g.items) next.add(p.key);
      this.form.permissionKeys = Array.from(next);
    }
  }

  async save() {
    const r = this.role();
    if (!r) return;
    this.saving.set(true);
    try {
      const updated = await this.svc.patchRole(r.id, this.form);
      this.role.set(updated);
      this.savedHint.set(true);
      setTimeout(() => this.savedHint.set(false), 3500);
    } finally {
      this.saving.set(false);
    }
  }
}
