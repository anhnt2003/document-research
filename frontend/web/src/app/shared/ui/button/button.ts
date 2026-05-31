import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

type Variant = 'primary' | 'neutral' | 'ghost' | 'outline' | 'danger' | 'link';
type Size = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ui-button, button[ui-button], a[ui-button]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  styles: [
    `
      :host {
        --btn-bg:var(--accent);
        --fg: var(--bg);
        --bd: var(--accent);
        --sh: var(--sh-accent);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 42px;
        padding: 0 20px;
        font-family: var(--sans);
        font-weight: 600;
        font-size: var(--fs-14);
        letter-spacing: 0.005em;
        background: var(--btn-bg);
        color: var(--fg);
        border: 1px solid var(--bd);
        border-radius: var(--r-pill);
        cursor: pointer;
        text-decoration: none;
        line-height: 1;
        box-shadow: var(--sh);
        transition:
          background 180ms var(--ease-out),
          border-color 180ms var(--ease-out),
          color 180ms var(--ease-out),
          box-shadow 200ms var(--ease-out),
          transform 160ms var(--ease-out);
        white-space: nowrap;
      }
      :host:hover {
        background: var(--accent-700);
        border-color: var(--accent-700);
        transform: translateY(-1px);
      }
      :host:active {
        transform: translateY(0) scale(0.985);
      }
      :host:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 3px;
      }
      :host[disabled],
      :host.disabled {
        opacity: 0.5;
        pointer-events: none;
        box-shadow: none;
      }
      :host([variant='neutral']) {
        --btn-bg:var(--ink-900);
        --fg: var(--bg-2);
        --bd: var(--ink-900);
        --sh: var(--sh-2);
      }
      :host([variant='neutral']):hover {
        background: var(--ink-700);
        border-color: var(--ink-700);
      }
      :host([variant='ghost']) {
        --btn-bg:transparent;
        --fg: var(--ink-500);
        --bd: transparent;
        --sh: none;
      }
      :host([variant='ghost']):hover {
        background: var(--surface-2);
        border-color: transparent;
        color: var(--ink-900);
        transform: none;
      }
      :host([variant='outline']) {
        --btn-bg:var(--surface);
        --fg: var(--ink-700);
        --bd: var(--line);
        --sh: var(--sh-1);
      }
      :host([variant='outline']):hover {
        background: var(--surface-2);
        border-color: var(--accent-100);
        color: var(--ink-900);
        box-shadow: var(--sh-2);
      }
      :host([variant='danger']) {
        --btn-bg:var(--clay);
        --fg: var(--bg);
        --bd: var(--clay);
        --sh: var(--sh-2);
      }
      :host([variant='danger']):hover {
        background: var(--clay);
        border-color: var(--clay);
        filter: brightness(0.92);
      }
      :host([variant='link']) {
        --btn-bg:transparent;
        --fg: var(--accent);
        --bd: transparent;
        --sh: none;
        height: auto;
        padding: 0;
      }
      :host([variant='link']):hover {
        background: transparent;
        border-color: transparent;
        transform: none;
        color: var(--accent-700);
        text-decoration: underline;
        text-underline-offset: 4px;
        text-decoration-thickness: 1px;
      }
      :host([size='sm']) {
        height: 34px;
        padding: 0 14px;
        font-size: var(--fs-13);
      }
      :host([size='lg']) {
        height: 46px;
        padding: 0 26px;
        font-size: var(--fs-15);
      }
      :host([block]) {
        width: 100%;
      }
    `,
  ],
  host: {
    '[attr.variant]': 'variant',
    '[attr.size]': 'size',
    '[attr.block]': 'block ? "" : null',
  },
})
export class UiButton {
  @Input() variant: Variant = 'primary';
  @Input() size: Size = 'md';
  @Input() block = false;
}
