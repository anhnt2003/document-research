import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { UiButton } from '../../shared/ui/button/button';
import { UiField } from '../../shared/ui/field/field';
import { UiInput } from '../../shared/ui/input/input';

@Component({
  selector: 'forgot-password-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, UiButton, UiField, UiInput],
  template: `
    <div class="page">
      <section class="card reveal">
        <span class="eyebrow">№ 02 · KHÔI PHỤC</span>
        <h1>Đặt lại <em>mật khẩu</em></h1>
        <p class="lede">
          Nhập email gắn với tài khoản. Chúng tôi sẽ gửi hướng dẫn để bạn tạo
          mật khẩu mới.
        </p>

        @if (sent()) {
          <div class="ok">
            <span class="ok__glyph">❧</span>
            <p>
              Đã gửi hướng dẫn tới <strong>{{ email }}</strong>.
              <br />
              Bạn có thể đóng cửa sổ này và kiểm tra hộp thư.
            </p>
          </div>
        } @else {
          <form (submit)="onSubmit($event)" class="form">
            <ui-field label="Email">
              <input
                ui-input
                type="email"
                name="email"
                [(ngModel)]="email"
                placeholder="ten.cua.ban@hubt.edu.vn"
                required
              />
            </ui-field>
            <button ui-button size="lg" [block]="true" type="submit">Gửi hướng dẫn</button>
          </form>
        }

        <a routerLink="/login" class="back">← Quay lại đăng nhập</a>
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background:
          radial-gradient(800px 500px at 50% 0%, rgba(184, 116, 42, 0.06), transparent 70%),
          var(--paper-50);
      }
      .page {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 64px 24px;
        min-height: 100vh;
      }
      .card {
        max-width: 480px;
        width: 100%;
        background: var(--paper-50);
        padding: 48px;
        border: 1px solid var(--rule);
      }
      .eyebrow {
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.22em;
        color: var(--ink-500);
        display: block;
        margin-bottom: 16px;
      }
      h1 {
        font-family: var(--font-display);
        font-size: var(--fs-48);
        font-weight: 400;
        font-variation-settings: 'opsz' 96, 'SOFT' 60;
        letter-spacing: -0.025em;
        line-height: 1.04;
        margin-bottom: 12px;
      }
      h1 em {
        font-style: italic;
        color: var(--oxblood);
      }
      .lede { color: var(--ink-600); margin-bottom: 28px; line-height: 1.55; }
      .form { display: flex; flex-direction: column; gap: 20px; }
      .ok {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        padding: 20px;
        background: var(--moss-soft);
        border-left: 2px solid var(--moss);
      }
      .ok__glyph {
        font-family: var(--font-display);
        font-style: italic;
        color: var(--moss);
        font-size: 32px;
        line-height: 1;
      }
      .ok p { color: var(--ink-700); line-height: 1.5; }
      .back {
        display: inline-block;
        margin-top: 28px;
        font-family: var(--font-display);
        font-style: italic;
        color: var(--ink-500);
      }
    `,
  ],
})
export class ForgotPasswordPage {
  email = '';
  sent = signal(false);

  onSubmit(e: Event) {
    e.preventDefault();
    if (!this.email) return;
    this.sent.set(true);
  }
}
