import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
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
  host: {
    id: 'app-sidebar',
    '[class.is-open]': 'open',
    '[attr.aria-hidden]': 'isMobileHidden()',
  },
  template: `
    <div class="brand">
      <a routerLink="/search" class="brand__link">
        <span class="brand__mark">d</span>
        <span class="brand__text">
          <span class="brand__title">document<span class="dot">·</span>research</span>
          <span class="brand__sub">kho lưu trữ học thuật</span>
        </span>
      </a>
    </div>

    <nav class="nav" aria-label="Điều hướng chính">
      @for (group of visibleGroups(); track group.eyebrow) {
        <section class="group" [attr.aria-labelledby]="'navgroup-' + group.number">
          <header class="group__header" [id]="'navgroup-' + group.number">
            <span class="group__num" aria-hidden="true">{{ group.number }}</span>
            <span class="group__eyebrow">{{ group.eyebrow }}</span>
          </header>
          <ul>
            @for (item of group.items; track item.path) {
              <li>
                <a
                  [routerLink]="item.path"
                  routerLinkActive="is-active"
                  ariaCurrentWhenActive="page"
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
      <span class="ver-pill"><span class="ver-pill__dot" aria-hidden="true"></span> v0.1 · α</span>
      <span class="copyfoot">© Đồ án K27 · HUBT</span>
    </footer>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        width: var(--shell-sidebar);
        padding: 22px 18px 18px;
        background: var(--surface);
        border-right: 1px solid var(--line);
        box-shadow: var(--sh-1);
        height: 100vh;
        position: sticky;
        top: 0;
        overflow: hidden;
      }
      .brand {
        padding: 6px 8px 18px;
      }
      .brand__link {
        display: flex;
        align-items: center;
        gap: 13px;
        color: var(--ink-900);
        border-bottom: none;
        min-width: 0;
      }
      .brand__link:hover { border-bottom: none; }
      .brand__mark {
        width: 46px;
        height: 46px;
        flex: 0 0 auto;
        display: grid;
        place-items: center;
        background: var(--ink-900);
        color: var(--bg);
        font-family: var(--serif);
        font-style: italic;
        font-weight: 600;
        font-size: 26px;
        border-radius: 14px;
        line-height: 1;
        box-shadow: var(--sh-2), inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }
      .brand__mark::after {
        content: '·';
        color: var(--accent);
        margin-left: 1px;
      }
      .brand__text {
        display: flex;
        flex-direction: column;
        gap: 1px;
        line-height: 1.2;
        min-width: 0;
      }
      .brand__title {
        font-family: var(--serif);
        font-weight: 600;
        font-size: 18px;
        letter-spacing: -0.01em;
        color: var(--ink-900);
        white-space: nowrap;
      }
      .dot { color: var(--accent); }
      .brand__sub {
        font-family: var(--serif);
        font-style: italic;
        font-size: 11px;
        color: var(--ink-400);
      }
      .nav {
        flex: 1;
        margin: 0 -6px;
        padding: 4px 6px;
        overflow-y: auto;
        scrollbar-width: thin;
      }
      .nav::-webkit-scrollbar { width: 6px; }
      .nav::-webkit-scrollbar-thumb { background: var(--line); border-radius: 99px; }
      .group { margin-bottom: 18px; }
      .group__header {
        display: flex;
        align-items: baseline;
        gap: 7px;
        padding: 0 12px 8px;
      }
      .group__num {
        font-family: var(--mono);
        font-size: 10px;
        color: var(--accent);
        font-weight: 500;
        letter-spacing: 0.16em;
      }
      .group__eyebrow {
        font-family: var(--mono);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--ink-400);
      }
      ul {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      a {
        display: flex;
        align-items: center;
        gap: 11px;
        width: 100%;
        padding: 9px 12px;
        color: var(--ink-700);
        font-family: var(--sans);
        font-size: 14px;
        font-weight: 500;
        text-align: left;
        border-radius: var(--r-sm);
        border-bottom: none;
        transition: background 180ms var(--ease-out), color 180ms var(--ease-out),
          transform 180ms var(--ease-out);
      }
      a:hover {
        background: var(--surface-2);
        color: var(--ink-900);
        border-bottom: none;
      }
      a:hover .icon { color: var(--accent); }
      a.is-active {
        color: var(--accent-700);
        background: var(--accent-50);
        font-weight: 600;
      }
      a.is-active .icon { color: var(--accent); }
      .icon {
        display: inline-flex;
        width: 22px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        font-family: var(--serif);
        font-size: 16px;
        color: var(--ink-400);
        transition: color 180ms var(--ease-out);
      }
      .foot {
        padding: 16px 12px 6px;
        border-top: 1px solid var(--line-soft);
        margin-top: 6px;
      }
      .ver-pill {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 5px 11px;
        background: var(--bg-2);
        border-radius: var(--r-pill);
        font-family: var(--mono);
        font-size: 11px;
        color: var(--ink-500);
        margin-bottom: 10px;
      }
      .ver-pill__dot {
        width: 6px;
        height: 6px;
        border-radius: 99px;
        background: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-100);
      }
      .copyfoot {
        display: block;
        font-family: var(--serif);
        font-style: italic;
        font-size: 11px;
        color: var(--ink-400);
      }
      @media (max-width: 960px) {
        :host {
          position: fixed;
          z-index: 50;
          top: 0;
          left: 0;
          width: min(320px, 86vw);
          transform: translateX(-100%);
          transition: transform 220ms var(--ease-out);
          box-shadow: var(--sh-4);
        }
        :host(.is-open) { transform: translateX(0); }
      }
    `,
  ],
})
export class Sidebar {
  private auth = inject(AuthStore);

  @Input() open = false;

  isMobileHidden() {
    if (typeof window === 'undefined') return null;
    if (window.matchMedia('(max-width: 960px)').matches && !this.open) return 'true';
    return null;
  }

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
