import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiButton } from '../../shared/ui/button/button';

@Component({
  selector: 'forbidden-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, UiButton],
  template: `
    <div class="page">
      <span class="glyph" aria-hidden="true">⚿</span>
      <span class="num mono">№ 403</span>
      <h1>
        <em>Khu vực</em> dành cho<br />người được cấp phép.
      </h1>
      <p>Bạn đã đăng nhập nhưng vai trò hiện tại không có quyền truy cập trang này.</p>
      <div class="actions">
        <a routerLink="/search"><button ui-button>Về trang tra cứu</button></a>
        <a routerLink="/account/profile"><button ui-button variant="outline">Xem quyền của tôi</button></a>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background:
          radial-gradient(1100px 700px at 50% -10%, rgba(47, 111, 106, 0.07), transparent 62%),
          radial-gradient(900px 600px at 50% 120%, rgba(192, 106, 74, 0.05), transparent 60%),
          var(--bg);
      }
      .page {
        max-width: 680px;
        margin: 0 auto;
        padding: clamp(72px, 14vh, 140px) 24px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .glyph {
        font-family: var(--serif);
        font-style: italic;
        font-size: 86px;
        line-height: 1;
        color: var(--accent);
        opacity: 0.32;
        margin-bottom: 22px;
      }
      .num {
        font-family: var(--mono);
        font-size: var(--fs-12);
        color: var(--accent-700);
        letter-spacing: 0.24em;
        text-transform: uppercase;
        display: inline-block;
        padding: 6px 16px;
        background: var(--accent-50);
        border: 1px solid var(--accent-100);
        border-radius: var(--r-pill);
      }
      h1 {
        font-family: var(--serif);
        font-size: clamp(46px, 6vw, 76px);
        font-weight: 500;
        font-variation-settings: 'opsz' 96, 'SOFT' 60;
        letter-spacing: -0.025em;
        line-height: 1.02;
        margin: 28px 0 18px;
      }
      h1 em { font-style: italic; color: var(--accent); }
      p {
        font-size: var(--fs-16);
        color: var(--ink-500);
        max-width: 46ch;
        margin: 0 auto 36px;
        line-height: 1.62;
      }
      .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
      .actions a { border-bottom: none; }
      .actions a:hover { border-bottom: none; }
    `,
  ],
})
export class ForbiddenPage {}
