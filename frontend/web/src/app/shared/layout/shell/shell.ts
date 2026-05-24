import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Topbar } from '../topbar/topbar';

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Sidebar, Topbar],
  template: `
    <div class="frame">
      <app-sidebar />
      <div class="main">
        <app-topbar />
        <main class="content">
          <router-outlet />
        </main>
      </div>
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
        padding: 0 40px 80px;
        max-width: 1280px;
        width: 100%;
      }
      @media (max-width: 720px) {
        .content { padding: 0 20px 60px; }
      }
    `,
  ],
})
export class Shell {}
