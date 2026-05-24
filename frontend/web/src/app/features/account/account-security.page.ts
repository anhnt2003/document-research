import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { UiPageHeader } from '../../shared/ui/page-header/page-header';
import { UiButton } from '../../shared/ui/button/button';
import { UiField } from '../../shared/ui/field/field';
import { UiInput } from '../../shared/ui/input/input';
import { UiBadge } from '../../shared/ui/badge/badge';

interface Session {
  id: string;
  device: string;
  ip: string;
  location: string;
  lastActive: string;
  current: boolean;
}

@Component({
  selector: 'account-security-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, UiPageHeader, UiButton, UiField, UiInput, UiBadge],
  template: `
    <ui-page-header
      eyebrow="№ III/2 · BẢO MẬT"
      number="III / 2"
      title="Bảo mật & phiên đăng nhập"
      description="Mật khẩu, xác thực hai yếu tố, và quản lý các phiên đang hoạt động."
    />

    <div class="layout">
      <section class="block">
        <h3 class="block__title">Đổi mật khẩu</h3>
        <p class="block__hint">Mật khẩu mới cần dài tối thiểu 12 ký tự, có chữ và số.</p>
        <form class="form">
          <ui-field label="Mật khẩu hiện tại">
            <input ui-input type="password" name="current" placeholder="••••••••" />
          </ui-field>
          <ui-field label="Mật khẩu mới">
            <input ui-input type="password" name="new" placeholder="••••••••" />
          </ui-field>
          <ui-field label="Xác nhận mật khẩu mới">
            <input ui-input type="password" name="confirm" placeholder="••••••••" />
          </ui-field>
          <div class="actions">
            <button ui-button>Lưu mật khẩu mới</button>
          </div>
        </form>
      </section>

      <section class="block">
        <h3 class="block__title">Xác thực hai yếu tố (2FA)</h3>
        <div class="twofa">
          <div>
            <ui-badge tone="amber">SẮP RA MẮT</ui-badge>
            <p>Khi sẵn sàng, bạn có thể bật 2FA bằng ứng dụng Authenticator hoặc khoá vật lý.</p>
          </div>
          <button ui-button variant="outline" disabled>Bật 2FA</button>
        </div>
      </section>

      <section class="block">
        <div class="sessions__head">
          <h3 class="block__title">Phiên đang hoạt động</h3>
          @if (hasOthers()) {
            <button ui-button variant="outline" size="sm" (click)="terminateOthers()">
              Đăng xuất các thiết bị khác
            </button>
          }
        </div>
        <ul class="sessions">
          @for (s of sessions(); track s.id) {
            <li class="session" [class.is-current]="s.current">
              <div class="session__main">
                <div class="session__top">
                  <span class="session__device">{{ s.device }}</span>
                  @if (s.current) {
                    <ui-badge tone="moss">THIẾT BỊ HIỆN TẠI</ui-badge>
                  }
                </div>
                <div class="session__meta mono">
                  <span>{{ s.ip }}</span>
                  <span class="dot">·</span>
                  <span>{{ s.location }}</span>
                  <span class="dot">·</span>
                  <span>{{ s.lastActive }}</span>
                </div>
              </div>
              @if (!s.current) {
                <button ui-button variant="ghost" size="sm" (click)="terminate(s)">Kết thúc</button>
              }
            </li>
          }
        </ul>
      </section>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .layout { display: flex; flex-direction: column; gap: 40px; }
      .block { padding-bottom: 32px; border-bottom: 1px solid var(--rule); }
      .block:last-child { border-bottom: none; }
      .block__title {
        font-family: var(--font-display);
        font-size: var(--fs-24);
        font-weight: 400;
        font-style: italic;
        font-variation-settings: 'opsz' 36, 'SOFT' 80;
        margin: 0 0 8px;
      }
      .block__hint {
        color: var(--ink-500);
        font-size: var(--fs-14);
        margin-bottom: 18px;
      }
      .form {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        max-width: 640px;
      }
      .form ui-field:first-child { grid-column: 1 / -1; }
      .actions { grid-column: 1 / -1; display: flex; gap: 12px; }
      .twofa {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 16px 18px;
        background: var(--paper-100);
        border: 1px solid var(--rule);
        border-radius: var(--radius-sm);
      }
      .twofa p { margin-top: 6px; color: var(--ink-600); font-size: var(--fs-14); }
      .sessions__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 16px;
        margin-bottom: 8px;
      }
      .sessions__head .block__title { margin-bottom: 0; }
      .sessions { display: flex; flex-direction: column; }
      .session {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 14px 16px;
        margin: 0 -16px;
        border-bottom: 1px solid var(--rule);
        border-radius: var(--radius-sm);
      }
      .session.is-current {
        background: var(--moss-soft);
        border-bottom-color: transparent;
        position: relative;
      }
      .session.is-current::before {
        content: '';
        position: absolute;
        left: 0;
        top: 8px;
        bottom: 8px;
        width: 2px;
        background: var(--moss);
        border-radius: 1px;
      }
      .session__top { display: flex; align-items: center; gap: 12px; }
      .session__device {
        font-family: var(--font-display);
        font-style: italic;
        font-size: var(--fs-18);
        color: var(--ink-900);
      }
      .session__meta {
        margin-top: 4px;
        color: var(--ink-500);
        font-size: var(--fs-12);
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .dot { color: var(--ink-300); }
    `,
  ],
})
export class AccountSecurityPage {
  sessions = signal<Session[]>([
    {
      id: 's-1',
      device: 'MacBook · Safari',
      ip: '113.161.74.22',
      location: 'Hà Nội, VN',
      lastActive: 'vừa xong',
      current: true,
    },
    {
      id: 's-2',
      device: 'iPhone 15 Pro · Safari iOS',
      ip: '113.161.74.83',
      location: 'Hà Nội, VN',
      lastActive: '2 giờ trước',
      current: false,
    },
    {
      id: 's-3',
      device: 'Chrome · Windows',
      ip: '171.225.62.91',
      location: 'TP. Hồ Chí Minh, VN',
      lastActive: '3 ngày trước',
      current: false,
    },
  ]);

  hasOthers = computed(() => this.sessions().some((s) => !s.current));

  terminate(s: Session) {
    this.sessions.update((list) => list.filter((x) => x.id !== s.id));
  }

  terminateOthers() {
    this.sessions.update((list) => list.filter((s) => s.current));
  }
}
