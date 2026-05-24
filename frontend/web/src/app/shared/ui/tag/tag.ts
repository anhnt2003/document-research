import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

type TagColor = 'oxblood' | 'amber' | 'moss' | 'rust' | 'ink' | 'neutral';

@Component({
  selector: 'ui-tag',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="dot"></span>
    <span class="label"><ng-content></ng-content></span>
    @if (removable) {
      <button class="x" type="button" (click)="remove.emit()" aria-label="Bỏ tag">×</button>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 9px 3px 8px;
        border-radius: var(--radius-pill);
        background: var(--paper-100);
        color: var(--ink-700);
        font-size: var(--fs-12);
        font-weight: 500;
        line-height: 1.4;
        border: 1px solid transparent;
        white-space: nowrap;
        vertical-align: middle;
      }
      :host[interactive] {
        cursor: pointer;
        transition:
          background 140ms var(--ease-out),
          border-color 140ms var(--ease-out);
      }
      :host[interactive]:hover {
        background: var(--paper-200);
        border-color: var(--rule);
      }
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--ink-400);
        flex-shrink: 0;
      }
      :host[color='oxblood'] .dot { background: var(--oxblood); }
      :host[color='amber'] .dot { background: var(--amber); }
      :host[color='moss'] .dot { background: var(--moss); }
      :host[color='rust'] .dot { background: var(--rust); }
      :host[color='ink'] .dot { background: var(--ink-700); }
      :host[color='neutral'] .dot { display: none; }
      :host[color='neutral'] {
        padding-left: 9px;
      }
      :host[selected] {
        background: var(--ink-900);
        color: var(--paper-50);
      }
      :host[selected] .dot { background: var(--paper-50); }
      .label {
        font-family: var(--font-body);
      }
      .x {
        margin-left: 2px;
        margin-right: -3px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        font-size: 14px;
        line-height: 1;
        color: var(--ink-500);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .x:hover { color: var(--oxblood); background: var(--oxblood-soft); }
    `,
  ],
  host: {
    '[attr.color]': 'color',
    '[attr.interactive]': 'interactive ? "" : null',
    '[attr.selected]': 'selected ? "" : null',
  },
})
export class UiTag {
  @Input() color: TagColor = 'neutral';
  @Input() interactive = false;
  @Input() selected = false;
  @Input() removable = false;
  @Output() remove = new EventEmitter<void>();
}
