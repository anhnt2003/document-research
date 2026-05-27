import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService } from './toast.service';

@Component({
  selector: 'ui-toast-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack" aria-live="polite" data-testid="toast-stack">
      @for (t of svc.toasts(); track t.id) {
        <div
          class="toast"
          [attr.data-kind]="t.kind"
          [attr.data-testid]="'toast-' + t.kind"
          role="status"
        >
          <span class="msg">{{ t.message }}</span>
          <button
            type="button"
            class="close"
            aria-label="Đóng"
            (click)="svc.dismiss(t.id)"
          >×</button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host { display: contents; }
      .stack {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 1000;
        display: flex;
        flex-direction: column-reverse;
        gap: 10px;
        max-width: 360px;
        pointer-events: none;
      }
      .toast {
        pointer-events: auto;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 10px 14px;
        border-radius: var(--radius-sm);
        background: var(--paper-50);
        border: 1px solid var(--rule-strong);
        box-shadow: 0 12px 32px rgba(20, 14, 8, 0.14);
        font-size: var(--fs-13);
        line-height: 1.5;
        color: var(--ink-800);
        animation: slide-in 180ms var(--ease-out);
      }
      .toast[data-kind='error'] {
        border-left: 3px solid var(--oxblood);
        background: var(--oxblood-soft);
        color: var(--oxblood);
      }
      .toast[data-kind='success'] {
        border-left: 3px solid var(--moss);
      }
      .toast[data-kind='info'] {
        border-left: 3px solid var(--ink-700);
      }
      .msg { flex: 1; }
      .close {
        background: transparent;
        border: none;
        font-size: 18px;
        line-height: 1;
        color: inherit;
        opacity: 0.6;
        cursor: pointer;
        padding: 0 4px;
      }
      .close:hover { opacity: 1; }
      @keyframes slide-in {
        from { opacity: 0; transform: translateX(8px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @media (max-width: 600px) {
        .stack {
          right: 12px;
          left: 12px;
          bottom: 12px;
          max-width: none;
        }
      }
    `,
  ],
})
export class UiToastContainer {
  svc = inject(ToastService);
}
