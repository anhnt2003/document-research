import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthStore } from '../../core/auth/auth.store';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { environment } from '../../../environments/environment';

interface GsiCredentialResponse {
  credential: string;
}

interface GsiClient {
  accounts: {
    id: {
      initialize: (cfg: {
        client_id: string;
        callback: (resp: GsiCredentialResponse) => void;
      }) => void;
      renderButton: (
        host: HTMLElement,
        opts: { theme: string; size: string; width?: number; locale?: string }
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GsiClient;
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  'invalid-request': 'Yêu cầu không hợp lệ.',
  'google-token-invalid': 'Token Google không hợp lệ. Vui lòng thử lại.',
  'email-not-verified': 'Email Google chưa xác thực.',
  'user-not-provisioned': 'Tài khoản chưa được cấp quyền. Liên hệ quản trị viên.',
  'user-locked': 'Tài khoản đang bị khoá.',
};

function mapBackendError(err: HttpErrorResponse): string {
  const type = typeof err.error?.type === 'string' ? err.error.type : '';
  for (const [slug, msg] of Object.entries(ERROR_MESSAGES)) {
    if (type.endsWith(`/errors/${slug}`)) return msg;
  }
  return 'Không thể đăng nhập. Vui lòng thử lại.';
}

@Component({
  selector: 'login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="page">
      <aside class="aside">
        <span class="aside__eyebrow">№ 01 · TRUY CẬP</span>
        <blockquote class="quote">
          <p>
            "Một thư viện được xếp ngay ngắn không phải kho chứa sách —
            mà là một <em>tâm trí</em> đang chờ được hỏi."
          </p>
          <footer class="quote__cite">— diễn giải tự do từ V. Bush, 1945</footer>
        </blockquote>

        <div class="aside__meta">
          <div>
            <span class="mono">phiên bản</span>
            <span class="display-italic">0.1 alpha</span>
          </div>
          <div>
            <span class="mono">đồ án</span>
            <span class="display-italic">khoá 27 · HUBT</span>
          </div>
          <div>
            <span class="mono">module</span>
            <span class="display-italic">document·research</span>
          </div>
        </div>
      </aside>

      <section class="panel">
        <header class="header reveal">
          <a routerLink="/" class="brand">
            <span class="brand__mark">d</span>
            <span class="brand__name">document<span class="dot">·</span>research</span>
          </a>
          <span class="eyebrow">№ 01 · TRUY CẬP</span>
          <h1>
            Đăng nhập <em>kho lưu trữ</em>
          </h1>
          <p class="lede">
            Tra cứu, tổng hợp và quản lý tài liệu nghiên cứu trong một nơi duy nhất.
          </p>
        </header>

        <div class="form reveal reveal-delay-1">
          <div #googleButton class="gsi-host" data-testid="google-button"></div>

          @if (loading()) {
            <p class="hint mono">Đang xác thực với máy chủ…</p>
          }
        </div>

        <footer class="foot reveal reveal-delay-3">
          <span class="mono">© 2026 Đồ án tốt nghiệp · Khoa CNTT · Khoá 27</span>
        </footer>
      </section>
    </div>
  `,
  styles: [
    `
      :host { display: block; min-height: 100vh; }
      .page {
        display: grid;
        grid-template-columns: 1fr 1.05fr;
        min-height: 100vh;
      }
      /* aside (editorial column) */
      .aside {
        background: var(--ink-900);
        color: var(--paper-50);
        padding: 56px 56px 40px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        overflow: hidden;
      }
      .aside::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
          radial-gradient(800px 400px at 110% -20%, rgba(184, 116, 42, 0.28), transparent 70%),
          radial-gradient(700px 500px at -10% 120%, rgba(122, 31, 37, 0.32), transparent 70%);
        opacity: 0.9;
        pointer-events: none;
      }
      .aside::after {
        content: '';
        position: absolute;
        inset: 0;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.96  0 0 0 0 0.93  0 0 0 0 0.86  0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        opacity: 0.4;
        pointer-events: none;
        mix-blend-mode: overlay;
      }
      .aside > * { position: relative; z-index: 1; }
      .aside__eyebrow {
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.24em;
        color: var(--paper-200);
        opacity: 0.7;
      }
      .quote {
        margin: 80px 0;
        max-width: 480px;
      }
      .quote p {
        font-family: var(--font-display);
        font-style: italic;
        font-size: clamp(28px, 4vw, 44px);
        font-weight: 300;
        font-variation-settings: 'opsz' 96, 'SOFT' 80;
        line-height: 1.15;
        color: var(--paper-50);
        letter-spacing: -0.015em;
      }
      .quote p em {
        font-style: italic;
        color: var(--amber);
        font-weight: 400;
      }
      .quote__cite {
        margin-top: 24px;
        font-family: var(--font-mono);
        font-size: var(--fs-13);
        letter-spacing: 0.05em;
        color: var(--paper-200);
        opacity: 0.7;
      }
      .aside__meta {
        display: grid;
        grid-template-columns: repeat(3, auto);
        gap: 32px;
        padding-top: 28px;
        border-top: 1px solid rgba(245, 241, 230, 0.12);
      }
      .aside__meta div {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .aside__meta .mono {
        font-family: var(--font-mono);
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--paper-200);
        opacity: 0.5;
      }
      .aside__meta .display-italic {
        font-family: var(--font-display);
        font-style: italic;
        font-size: var(--fs-16);
        color: var(--paper-50);
      }

      /* panel (form column) */
      .panel {
        background: var(--paper-50);
        padding: 56px 56px 32px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 32px;
        max-width: 560px;
        margin: 0 auto;
        width: 100%;
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
        border-bottom: none;
        color: inherit;
        margin-bottom: 24px;
      }
      .brand:hover { border-bottom: none; }
      .brand__mark {
        width: 28px;
        height: 28px;
        background: var(--ink-900);
        color: var(--paper-50);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-xs);
        font-family: var(--font-display);
        font-style: italic;
        font-size: 18px;
      }
      .brand__name {
        font-family: var(--font-display);
        font-style: italic;
        font-size: var(--fs-16);
      }
      .dot { color: var(--oxblood); }
      .header .eyebrow {
        display: block;
        margin-bottom: 18px;
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.22em;
        color: var(--ink-500);
      }
      .header h1 {
        font-family: var(--font-display);
        font-size: clamp(40px, 5vw, 60px);
        font-weight: 400;
        font-variation-settings: 'opsz' 120, 'SOFT' 60;
        letter-spacing: -0.03em;
        line-height: 0.98;
        margin-bottom: 16px;
      }
      .header h1 em {
        font-style: italic;
        color: var(--oxblood);
        font-variation-settings: 'opsz' 120, 'SOFT' 80;
      }
      .lede {
        font-size: var(--fs-16);
        color: var(--ink-600);
        max-width: 440px;
        line-height: 1.55;
      }

      .form {
        display: flex;
        flex-direction: column;
        gap: 22px;
      }
      .gsi-host {
        min-height: 44px;
        display: flex;
        justify-content: center;
      }
      .hint {
        text-align: center;
        color: var(--ink-400);
        font-size: var(--fs-12);
        letter-spacing: 0.04em;
        margin-top: -6px;
      }
      .foot {
        margin-top: auto;
        padding-top: 24px;
        border-top: 1px solid var(--rule);
        text-align: center;
      }
      .foot .mono {
        color: var(--ink-400);
        font-size: var(--fs-12);
        letter-spacing: 0.08em;
      }

      @media (max-width: 880px) {
        .page { grid-template-columns: 1fr; }
        .aside { padding: 40px 32px; }
        .quote { margin: 40px 0; }
        .quote p { font-size: 28px; }
        .aside__meta { grid-template-columns: 1fr 1fr; gap: 16px; }
        .panel { padding: 40px 32px; }
      }
    `,
  ],
})
export class LoginPage implements AfterViewInit {
  private auth = inject(AuthStore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  @ViewChild('googleButton', { static: true }) googleButton!: ElementRef<HTMLDivElement>;

  loading = signal(false);
  clientIdConfigured = !!environment.googleClientId;

  ngAfterViewInit(): void {
    if (!this.clientIdConfigured) {
      this.toast.error(
        'Google Client ID chưa được cấu hình. Cập nhật environment.googleClientId trước khi đăng nhập.',
        0
      );
      return;
    }
    this.waitForGoogle().then((gsi) => {
      gsi.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (resp) => void this.onCredential(resp),
      });
      gsi.accounts.id.renderButton(this.googleButton.nativeElement, {
        theme: 'outline',
        size: 'large',
        width: 320,
        locale: 'vi',
      });
    });
  }

  private waitForGoogle(timeoutMs = 5000): Promise<GsiClient> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (window.google?.accounts?.id) {
          resolve(window.google);
          return;
        }
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Google Identity Services không tải được.'));
          return;
        }
        setTimeout(check, 100);
      };
      check();
    });
  }

  private async onCredential(resp: GsiCredentialResponse): Promise<void> {
    if (!resp.credential) {
      this.toast.error('Không nhận được token từ Google.');
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.signInWithGoogle(resp.credential);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/search';
      this.router.navigateByUrl(returnUrl);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        this.toast.error(mapBackendError(err));
      } else {
        this.toast.error('Không thể đăng nhập. Vui lòng thử lại.');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
