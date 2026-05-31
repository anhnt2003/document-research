import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Sidebar } from '../sidebar/sidebar';
import { Topbar } from '../topbar/topbar';
import { UiToastContainer } from '../../ui/toast/toast-container';

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Sidebar, Topbar, UiToastContainer],
  template: `
    <div class="frame" [class.is-nav-open]="navOpen()">
      <app-sidebar [open]="navOpen()" />
      <button
        type="button"
        class="backdrop"
        aria-label="Đóng menu"
        (click)="navOpen.set(false)"
      ></button>
      <div class="main">
        <app-topbar
          [navOpen]="navOpen()"
          (toggleNav)="navOpen.update((v) => !v)"
        />
        <main class="content">
          <router-outlet />
        </main>
      </div>
      <ui-toast-container />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
      }
      .frame {
        display: grid;
        grid-template-columns: auto 1fr;
        min-height: 100vh;
      }
      .main {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .content {
        flex: 1;
        padding: 34px 28px 56px;
        max-width: var(--maxw, 1340px);
        width: 100%;
        margin: 0 auto;
      }
      .backdrop {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 40;
        background: rgba(40, 37, 31, 0.4);
        backdrop-filter: blur(2px);
        border: none;
        cursor: pointer;
        opacity: 0;
        transition: opacity 250ms var(--ease-out);
        pointer-events: none;
      }
      @media (max-width: 960px) {
        .frame { grid-template-columns: 1fr; }
        .frame.is-nav-open .backdrop {
          display: block;
          opacity: 1;
          pointer-events: auto;
        }
      }
      @media (max-width: 720px) {
        .content { padding: 24px 16px 48px; }
      }
    `,
  ],
})
export class Shell {
  private router = inject(Router);
  navOpen = signal(false);

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.navOpen.set(false));
  }
}
