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
        --bg: var(--oxblood);
        --fg: var(--paper-50);
        --bd: var(--oxblood);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 36px;
        padding: 0 16px;
        font-family: var(--font-body);
        font-weight: 500;
        font-size: var(--fs-14);
        letter-spacing: 0.005em;
        background: var(--bg);
        color: var(--fg);
        border: 1px solid var(--bd);
        border-radius: var(--radius-sm);
        cursor: pointer;
        text-decoration: none;
        line-height: 1;
        transition:
          background 140ms var(--ease-out),
          border-color 140ms var(--ease-out),
          color 140ms var(--ease-out),
          transform 80ms var(--ease-out);
        white-space: nowrap;
      }
      :host:hover {
        background: var(--oxblood-hover);
        border-color: var(--oxblood-hover);
      }
      :host:active {
        transform: translateY(1px);
      }
      :host[disabled],
      :host.disabled {
        opacity: 0.5;
        pointer-events: none;
      }
      :host([variant='neutral']) {
        --bg: var(--ink-900);
        --fg: var(--paper-50);
        --bd: var(--ink-900);
      }
      :host([variant='neutral']):hover {
        background: var(--ink-700);
        border-color: var(--ink-700);
      }
      :host([variant='ghost']) {
        --bg: transparent;
        --fg: var(--ink-900);
        --bd: transparent;
      }
      :host([variant='ghost']):hover {
        background: var(--paper-100);
        border-color: var(--paper-100);
      }
      :host([variant='outline']) {
        --bg: transparent;
        --fg: var(--ink-900);
        --bd: var(--rule-strong);
      }
      :host([variant='outline']):hover {
        background: var(--paper-100);
        border-color: var(--ink-900);
      }
      :host([variant='danger']) {
        --bg: var(--oxblood);
        --fg: var(--paper-50);
        --bd: var(--oxblood);
      }
      :host([variant='danger']):hover {
        background: var(--oxblood-hover);
        border-color: var(--oxblood-hover);
      }
      :host([variant='link']) {
        --bg: transparent;
        --fg: var(--oxblood);
        --bd: transparent;
        height: auto;
        padding: 0;
      }
      :host([variant='link']):hover {
        background: transparent;
        border-color: transparent;
        text-decoration: underline;
        text-underline-offset: 4px;
        text-decoration-thickness: 1px;
      }
      :host([size='sm']) {
        height: 28px;
        padding: 0 12px;
        font-size: var(--fs-13);
      }
      :host([size='lg']) {
        height: 44px;
        padding: 0 22px;
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
