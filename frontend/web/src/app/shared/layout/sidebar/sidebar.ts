import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  adminOnly?: boolean;
}

interface NavGroup {
  eyebrow: string;
  number: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="brand">
      <a routerLink="/search" class="brand__link">
        <span class="brand__mark">d</span>
        <span class="brand__text">
          <span class="brand__title">document<span class="dot">·</span>research</span>
          <span class="brand__sub">kho lưu trữ học thuật</span>
        </span>
      </a>
      <span class="brand__version">v0.1 · α</span>
    </div>

    <nav class="nav">
      @for (group of visibleGroups(); track group.eyebrow) {
        <section class="group">
          <header class="group__header">
            <span class="group__num">{{ group.number }}</span>
            <span class="group__eyebrow">{{ group.eyebrow }}</span>
          </header>
          <ul>
            @for (item of group.items; track item.path) {
              <li>
                <a
                  [routerLink]="item.path"
                  routerLinkActive="is-active"
                  [routerLinkActiveOptions]="{ exact: false }"
                >
                  <span class="icon" aria-hidden="true">{{ item.icon }}</span>
                  <span class="label">{{ item.label }}</span>
                </a>
              </li>
            }
          </ul>
        </section>
      }
    </nav>

    <footer class="foot">
      <span class="mono">© Đồ án K27 · HUBT</span>
    </footer>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        width: var(--shell-sidebar);
        background: var(--paper-100);
        border-right: 1px solid var(--rule);
        height: 100vh;
        position: sticky;
        top: 0;
        overflow: hidden;
      }
      .brand {
        padding: 22px 22px 18px;
        border-bottom: 1px solid var(--rule);
      }
      .brand__link {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--ink-900);
        border-bottom: none;
      }
      .brand__link:hover { border-bottom: none; }
      .brand__mark {
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--ink-900);
        color: var(--paper-50);
        font-family: var(--font-display);
        font-style: italic;
        font-weight: 500;
        font-size: 22px;
        border-radius: var(--radius-xs);
        line-height: 1;
      }
      .brand__text { display: flex; flex-direction: column; line-height: 1.2; }
      .brand__title {
        font-family: var(--font-body);
        font-weight: 600;
        font-size: var(--fs-15);
        letter-spacing: -0.005em;
        color: var(--ink-900);
      }
      .dot { color: var(--oxblood); }
      .brand__sub {
        font-family: var(--font-mono);
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--ink-500);
        margin-top: 2px;
      }
      .brand__version {
        display: block;
        margin-top: 10px;
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        color: var(--ink-500);
        letter-spacing: 0.06em;
      }
      .nav {
        flex: 1;
        padding: 18px 12px;
        overflow-y: auto;
      }
      .group + .group { margin-top: 22px; }
      .group__header {
        display: flex;
        align-items: baseline;
        gap: 8px;
        padding: 6px 12px 8px;
      }
      .group__num {
        font-family: var(--font-mono);
        font-size: 10.5px;
        color: var(--ink-300);
        letter-spacing: 0.1em;
      }
      .group__eyebrow {
        font-family: var(--font-mono);
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--ink-500);
        font-weight: 600;
      }
      ul {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      a {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px 8px 14px;
        color: var(--ink-700);
        font-family: var(--font-body);
        font-size: var(--fs-14);
        font-weight: 500;
        border-radius: var(--radius-sm);
        position: relative;
        border-bottom: none;
        transition: background 120ms var(--ease-out), color 120ms var(--ease-out);
      }
      a:hover {
        background: var(--paper-200);
        color: var(--ink-900);
        border-bottom: none;
      }
      a.is-active {
        color: var(--ink-900);
        background: var(--paper-50);
        font-weight: 600;
      }
      a.is-active::before {
        content: '';
        position: absolute;
        left: -12px;
        top: 8px;
        bottom: 8px;
        width: 2px;
        background: var(--oxblood);
      }
      .icon {
        display: inline-flex;
        width: 18px;
        height: 18px;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: var(--ink-400);
      }
      a.is-active .icon { color: var(--oxblood); }
      .foot {
        padding: 14px 22px;
        border-top: 1px solid var(--rule);
      }
      .mono {
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        color: var(--ink-400);
        letter-spacing: 0.08em;
      }
      @media (max-width: 960px) {
        :host {
          position: fixed;
          z-index: 50;
          transform: translateX(-100%);
          transition: transform 200ms var(--ease-out);
        }
        :host([open]) { transform: translateX(0); }
      }
    `,
  ],
})
export class Sidebar {
  private auth = inject(AuthStore);

  private groups: NavGroup[] = [
    {
      eyebrow: 'Tìm kiếm',
      number: 'I',
      items: [
        { label: 'Tra cứu', path: '/search', icon: '◇' },
        { label: 'Lịch sử', path: '/search/history', icon: '◷' },
      ],
    },
    {
      eyebrow: 'Tài liệu',
      number: 'II',
      items: [
        { label: 'Kho tài liệu', path: '/documents', icon: '❡' },
        { label: 'Tải lên', path: '/documents/upload', icon: '↥' },
        { label: 'Tag & taxonomy', path: '/documents/tags', icon: '✱' },
      ],
    },
    {
      eyebrow: 'Tài khoản',
      number: 'III',
      items: [
        { label: 'Hồ sơ', path: '/account/profile', icon: '◐' },
        { label: 'Bảo mật', path: '/account/security', icon: '⚿' },
        { label: 'Hoạt động', path: '/account/activity', icon: '☷' },
      ],
    },
    {
      eyebrow: 'Quản trị',
      number: 'IV',
      items: [
        { label: 'Người dùng', path: '/admin/users', icon: '☥', adminOnly: true },
        { label: 'Vai trò', path: '/admin/roles', icon: '⌘', adminOnly: true },
        { label: 'Danh mục quyền', path: '/admin/permissions', icon: '✦', adminOnly: true },
      ],
    },
  ];

  visibleGroups = computed(() => {
    const admin = this.auth.isAdmin();
    return this.groups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => !i.adminOnly || admin),
      }))
      .filter((g) => g.items.length > 0);
  });
}
