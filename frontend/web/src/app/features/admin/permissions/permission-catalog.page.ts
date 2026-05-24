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
      .block { margin-bottom: 36px; }
      .block__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--rule);
        margin-bottom: 8px;
      }
      .block h3 {
        font-family: var(--font-display);
        font-style: italic;
        font-size: var(--fs-24);
        font-variation-settings: 'opsz' 36, 'SOFT' 80;
        margin: 0;
      }
      .block .mono { font-size: var(--fs-12); color: var(--ink-500); }
      .catalog { width: 100%; border-collapse: collapse; }
      .catalog thead th {
        text-align: left;
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--ink-500);
        padding: 12px 0;
        border-bottom: 1px solid var(--rule);
      }
      .catalog tbody td {
        padding: 14px 0;
        border-bottom: 1px solid var(--rule);
        vertical-align: top;
      }
      .key {
        color: var(--oxblood);
        font-size: var(--fs-12);
        letter-spacing: 0.06em;
        width: 220px;
      }
      .label {
        font-family: var(--font-display);
        font-style: italic;
        font-size: var(--fs-16);
        color: var(--ink-900);
        width: 280px;
      }
      .desc { color: var(--ink-600); font-size: var(--fs-14); line-height: 1.5; }
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
