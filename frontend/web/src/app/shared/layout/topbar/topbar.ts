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
        padding: 0 28px;
        border-bottom: 1px solid var(--line-soft);
        background: rgba(244, 240, 232, 0.78);
        backdrop-filter: saturate(140%) blur(14px);
        -webkit-backdrop-filter: saturate(140%) blur(14px);
        position: sticky;
        top: 0;
        z-index: 20;
      }
      .nav-toggle {
        display: none;
        width: 40px;
        height: 40px;
        align-items: center;
        justify-content: center;
        margin-right: 4px;
        border: none;
        border-radius: 12px;
        background: var(--surface);
        box-shadow: var(--sh-1);
        color: var(--ink-700);
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        transition: background 180ms var(--ease-out), color 180ms var(--ease-out);
      }
      .nav-toggle:hover {
        background: var(--surface-2);
        color: var(--ink-900);
      }
      @media (max-width: 960px) {
        .nav-toggle { display: inline-flex; }
      }
      .left { flex: 1; max-width: 520px; }
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
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--r-pill);
        box-shadow: var(--sh-1);
        padding: 8px 8px 8px 16px;
        transition: box-shadow 200ms var(--ease-out), border-color 200ms var(--ease-out);
      }
      .cmd:focus-within {
        box-shadow: var(--sh-2), 0 0 0 4px var(--accent-50);
        border-color: var(--accent-100);
      }
      .cmd__kbd {
        font-family: var(--mono);
        font-size: 11px;
        color: var(--ink-400);
        padding: 3px 7px;
        background: var(--bg-2);
        border-radius: 7px;
      }
      .cmd input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        font-size: 14px;
        color: var(--ink-900);
      }
      .cmd input::placeholder {
        color: var(--ink-400);
      }
      .cmd button {
        width: 30px;
        height: 30px;
        flex: 0 0 auto;
        border-radius: 9px;
        background: var(--ink-900);
        color: var(--bg);
        display: grid;
        place-items: center;
        font-size: 14px;
        transition: background 180ms var(--ease-out), transform 180ms var(--ease-out);
      }
      .cmd button:hover { background: var(--accent); }
      .cmd button:active { transform: scale(0.93); }
      .right {
        display: flex;
        align-items: center;
        gap: 18px;
        margin-left: auto;
      }
      .date {
        font-family: var(--mono);
        font-size: 12px;
        color: var(--ink-500);
      }
      .user { position: relative; }
      .user__btn {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 5px 10px 5px 5px;
        border-radius: var(--r-pill);
        transition: background 180ms var(--ease-out);
      }
      .user__btn:hover { background: var(--surface); }
      .user__name {
        font-size: 13px;
        font-weight: 600;
      }
      .user__caret {
        font-size: 11px;
        color: var(--ink-400);
      }
      .menu {
        position: absolute;
        top: calc(100% + 10px);
        right: 0;
        width: 248px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--r-md);
        box-shadow: var(--sh-4);
        padding: 8px;
        z-index: 30;
        animation: reveal-up 180ms var(--ease-out);
      }
      .menu__head {
        padding: 10px 12px 12px;
        border-bottom: 1px solid var(--line-soft);
        margin-bottom: 6px;
      }
      .menu__name { font-weight: 600; font-size: 14px; }
      .menu__email {
        font-family: var(--mono);
        font-size: 11px;
        color: var(--ink-400);
        margin-top: 2px;
      }
      .menu a,
      .menu button {
        display: block;
        width: 100%;
        text-align: left;
        padding: 9px 12px;
        font-size: 13.5px;
        color: var(--ink-700);
        border-radius: 9px;
        border-bottom: none;
        transition: background 150ms var(--ease-out);
      }
      .menu a:hover,
      .menu button:hover { background: var(--surface-2); border-bottom: none; }
      .menu button[type='button'] { color: var(--clay); }
      .menu hr {
        margin: 6px 4px;
        border: none;
        border-top: 1px solid var(--line-soft);
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
