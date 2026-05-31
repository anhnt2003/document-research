import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { Permission } from '../../../core/models';
import { AdminService } from '../admin.service';
import { UiPageHeader } from '../../../shared/ui/page-header/page-header';

interface CatalogGroup {
  group: string;
  label: string;
  items: Permission[];
}

@Component({
  selector: 'permission-catalog-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiPageHeader],
  template: `
    <ui-page-header
      eyebrow="№ IV/3 · DANH MỤC QUYỀN"
      number="IV / 3"
      title="Danh mục quyền hệ thống"
      description="Tham chiếu chuẩn cho tất cả vai trò. Khóa quyền được dùng trực tiếp trong code khi cấp/kiểm tra phân quyền."
    />

    @if (loading()) {
      <p class="center mono">đang tải…</p>
    } @else {
      @for (g of groups(); track g.group) {
        <section class="block">
          <header class="block__head">
            <h3>{{ g.label }}</h3>
            <span class="mono">{{ g.items.length }} quyền</span>
          </header>
          <table class="catalog">
            <thead>
              <tr>
                <th>Khóa</th>
                <th>Tên</th>
                <th>Mô tả</th>
              </tr>
            </thead>
            <tbody>
              @for (p of g.items; track p.key) {
                <tr>
                  <td class="key mono">{{ p.key }}</td>
                  <td class="label">{{ p.label }}</td>
                  <td class="desc">{{ p.description }}</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }
    }
  `,
  styles: [
    `
      :host { display: block; }
      .center { text-align: center; padding: 48px 0; color: var(--ink-400); }
      .block {
        margin-bottom: 24px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--r-lg);
        box-shadow: var(--sh-2);
        overflow: hidden;
      }
      .block__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding: 18px 26px;
        border-bottom: 1px solid var(--line);
        background: var(--surface-2);
      }
      .block h3 {
        font-family: var(--serif);
        font-weight: 600;
        font-size: var(--fs-24);
        font-variation-settings: 'opsz' 36, 'SOFT' 80;
        letter-spacing: -0.01em;
        margin: 0;
      }
      .block .mono { font-family: var(--mono); font-size: var(--fs-12); color: var(--ink-400); }
      .catalog { width: 100%; border-collapse: collapse; }
      .catalog thead th {
        text-align: left;
        font-family: var(--mono);
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--ink-400);
        padding: 13px 26px;
        border-bottom: 1px solid var(--line);
        background: var(--surface-2);
      }
      .catalog tbody td {
        padding: 16px 26px;
        border-bottom: 1px solid var(--line-soft);
        vertical-align: top;
      }
      .catalog tbody tr:last-child td { border-bottom: none; }
      .catalog tbody tr { transition: background 160ms var(--ease-out); }
      .catalog tbody tr:hover { background: var(--surface-2); }
      .key {
        font-family: var(--mono);
        color: var(--accent-700);
        font-size: var(--fs-12);
        letter-spacing: 0.04em;
        width: 220px;
      }
      .label {
        font-family: var(--serif);
        font-weight: 600;
        font-size: var(--fs-16);
        color: var(--ink-900);
        width: 280px;
      }
      .desc { color: var(--ink-500); font-size: var(--fs-14); line-height: 1.55; }
      @media (max-width: 720px) {
        .block__head { padding: 16px 18px; }
        .catalog thead th, .catalog tbody td { padding-left: 18px; padding-right: 18px; }
        .key, .label { width: auto; }
      }
    `,
  ],
})
export class PermissionCatalogPage implements OnInit {
  private svc = inject(AdminService);
  permissions = signal<Permission[]>([]);
  loading = signal(true);

  groups = computed<CatalogGroup[]>(() => {
    const labels: Record<string, string> = {
      document: 'Tài liệu',
      user: 'Người dùng',
      role: 'Vai trò & quyền',
      search: 'Tìm kiếm',
      system: 'Hệ thống',
    };
    const byGroup = new Map<string, Permission[]>();
    for (const p of this.permissions()) {
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

  async ngOnInit() {
    try {
      this.permissions.set(await this.svc.permissions());
    } finally {
      this.loading.set(false);
    }
  }
}
