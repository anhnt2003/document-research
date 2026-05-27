import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, Output, computed, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthStore } from '../../../core/auth/auth.store';
import { UiAvatar } from '../../ui/avatar/avatar';

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, UiAvatar],
  template: `
    <button
      type="button"
      class="nav-toggle"
      [attr.aria-expanded]="navOpen"
      aria-controls="app-sidebar"
      aria-label="Mở menu điều hướng"
      (click)="toggleNav.emit()"
    >
      <span aria-hidden="true">{{ navOpen ? '✕' : '☰' }}</span>
    </button>

    <div class="left">
      @if (showCmd()) {
        <form class="cmd" (submit)="onSubmit($event)" role="search">
          <span class="cmd__kbd">⌘K</span>
          <input
            type="search"
            name="q"
            placeholder="Tra cứu nhanh trong kho lưu trữ…"
            autocomplete="off"
            [value]="query()"
            (input)="onInput($event)"
            #cmdInput
          />
          <button type="submit" aria-label="Tìm kiếm">↵</button>
        </form>
      }
    </div>

    <div class="right">
      <span class="date mono">{{ today }}</span>

      <div class="user" #userMenu>
        <button class="user__btn" type="button" (click)="toggleMenu()">
          @if (auth.user(); as user) {
            <ui-avatar [user]="user" size="sm" />
            <span class="user__name">{{ user.displayName }}</span>
            <span class="user__caret">▾</span>
          }
        </button>
        @if (menuOpen()) {
          <div class="menu" role="menu">
            <div class="menu__head">
              @if (auth.user(); as user) {
                <div class="menu__name">{{ user.displayName }}</div>
                <div class="menu__email mono">{{ user.email }}</div>
              }
            </div>
            <a routerLink="/account/profile" (click)="closeMenu()">Hồ sơ</a>
            <a routerLink="/account/activity" (click)="closeMenu()">Hoạt động</a>
            <hr />
            <button type="button" (click)="signOut()">Đăng xuất</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: 16px;
        height: var(--shell-topbar);
        padding: 0 24px;
        border-bottom: 1px solid var(--rule);
        background: rgba(250, 246, 238, 0.92);
        backdrop-filter: saturate(140%) blur(8px);
        position: sticky;
        top: 0;
        z-index: 20;
      }
      .nav-toggle {
        display: none;
        width: 36px;
        height: 36px;
        align-items: center;
        justify-content: center;
        margin-right: 4px;
        border: 1px solid var(--rule);
        border-radius: var(--radius-sm);
        background: var(--paper-50);
        color: var(--ink-700);
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        transition: background 120ms var(--ease-out), color 120ms var(--ease-out);
      }
      .nav-toggle:hover {
        background: var(--paper-100);
        color: var(--ink-900);
      }
      @media (max-width: 960px) {
        .nav-toggle { display: inline-flex; }
      }
      .left { flex: 1; max-width: 560px; }
      @media (max-width: 720px) {
        .left { max-width: none; }
        .cmd__kbd { display: none; }
        .date { display: none; }
        .user__name { display: none; }
      }
      .cmd {
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--paper-100);
        border: 1px solid var(--rule);
        border-radius: var(--radius-sm);
        padding: 0 10px 0 12px;
        height: 34px;
        transition: border-color 140ms var(--ease-out), background 140ms var(--ease-out);
      }
      .cmd:focus-within {
        border-color: var(--ink-700);
        background: var(--paper-50);
      }
      .cmd__kbd {
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        color: var(--ink-400);
        letter-spacing: 0.08em;
      }
      .cmd input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        font-size: var(--fs-14);
        color: var(--ink-900);
      }
      .cmd input::placeholder {
        color: var(--ink-400);
        font-style: italic;
      }
      .cmd button {
        color: var(--ink-500);
        font-family: var(--font-mono);
      }
      .cmd button:hover { color: var(--oxblood); }
      .right {
        display: flex;
        align-items: center;
        gap: 18px;
      }
      .date {
        color: var(--ink-500);
        letter-spacing: 0.08em;
      }
      .user { position: relative; }
      .user__btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 10px 4px 4px;
        border-radius: var(--radius-pill);
        transition: background 140ms var(--ease-out);
      }
      .user__btn:hover { background: var(--paper-100); }
      .user__name {
        font-size: var(--fs-14);
        font-weight: 500;
      }
      .user__caret {
        font-size: 10px;
        color: var(--ink-400);
      }
      .menu {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        min-width: 240px;
        background: var(--paper-50);
        border: 1px solid var(--rule);
        border-radius: var(--radius-sm);
        box-shadow: var(--shadow-md);
        padding: 6px;
        z-index: 30;
        animation: reveal-up 200ms var(--ease-out);
      }
      .menu__head {
        padding: 10px 12px 12px;
        border-bottom: 1px solid var(--rule);
        margin-bottom: 6px;
      }
      .menu__name { font-weight: 600; font-size: var(--fs-14); }
      .menu__email { font-size: var(--fs-12); color: var(--ink-500); margin-top: 2px; }
      .menu a,
      .menu button {
        display: block;
        width: 100%;
        text-align: left;
        padding: 8px 12px;
        font-size: var(--fs-14);
        color: var(--ink-800);
        border-radius: var(--radius-xs);
        border-bottom: none;
      }
      .menu a:hover,
      .menu button:hover { background: var(--paper-100); border-bottom: none; }
      .menu hr {
        margin: 6px 4px;
        border: none;
        border-top: 1px solid var(--rule);
      }
    `,
  ],
})
export class Topbar {
  auth = inject(AuthStore);
  private router = inject(Router);

  @Input() navOpen = false;
  @Output() toggleNav = new EventEmitter<void>();

  today = (() => {
    const d = new Date();
    return `${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
  })();

  query = signal('');
  menuOpen = signal(false);
  userMenu = viewChild<ElementRef<HTMLElement>>('userMenu');

  private url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  showCmd = computed(() => !this.url().startsWith('/search'));

  onInput(e: Event) {
    this.query.set((e.target as HTMLInputElement).value);
  }

  onSubmit(e: Event) {
    e.preventDefault();
    const q = this.query().trim();
    if (!q) return;
    this.router.navigate(['/search/results'], { queryParams: { q, mode: 'hybrid' } });
  }

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  async signOut() {
    await this.auth.logout();
    this.menuOpen.set(false);
    this.router.navigateByUrl('/login');
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const root = this.userMenu()?.nativeElement;
    if (root && !root.contains(e.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const el = document.querySelector<HTMLInputElement>('app-topbar input[type="search"]');
      el?.focus();
    }
    if (e.key === 'Escape') this.menuOpen.set(false);
  }
}
