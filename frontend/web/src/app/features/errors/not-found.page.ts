import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiButton } from '../../shared/ui/button/button';

@Component({
  selector: 'not-found-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, UiButton],
  template: `
    <div class="page">
      <span class="num mono">№ 404</span>
      <h1>Trang bị <em>lạc</em> trong kho lưu trữ.</h1>
      <p>Đường dẫn bạn truy cập không tồn tại — có thể tài liệu đã được lưu trữ ở vị trí khác.</p>
      <div class="actions">
        <a routerLink="/search"><button ui-button>Trở về tra cứu</button></a>
        <a routerLink="/documents"><button ui-button variant="outline">Mở kho tài liệu</button></a>
      </div>
    </div>
  `,
  styles: [
    `
      :host { display: block; min-height: 100vh; background: var(--paper-50); }
      .page {
        max-width: 720px;
        margin: 0 auto;
        padding: 120px 24px;
        text-align: center;
      }
      .num {
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        color: var(--oxblood);
        letter-spacing: 0.24em;
        text-transform: uppercase;
      }
      h1 {
        font-family: var(--font-display);
        font-size: clamp(48px, 6vw, 80px);
        font-weight: 400;
        font-variation-settings: 'opsz' 96, 'SOFT' 60;
        letter-spacing: -0.03em;
        line-height: 1;
        margin: 24px 0 18px;
      }
      h1 em { font-style: italic; color: var(--oxblood); }
      p {
        font-size: var(--fs-16);
        color: var(--ink-600);
        max-width: 440px;
        margin: 0 auto 32px;
        line-height: 1.55;
      }
      .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
      .actions a { border-bottom: none; }
    `,
  ],
})
export class NotFoundPage {}
