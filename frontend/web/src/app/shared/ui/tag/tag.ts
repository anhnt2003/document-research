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
        padding: 3px 11px;
        border-radius: var(--r-pill);
        background: var(--surface-2);
        color: var(--ink-700);
        font-size: var(--fs-12);
        font-weight: 500;
        line-height: 1.4;
        border: 1px solid var(--line-soft);
        white-space: nowrap;
        vertical-align: middle;
      }
      :host[interactive] {
        cursor: pointer;
        transition:
          background 160ms var(--ease-out),
          border-color 160ms var(--ease-out),
          transform 140ms var(--ease-out);
      }
      :host[interactive]:hover {
        border-color: var(--accent-100);
        transform: translateY(-1px);
      }
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--ink-400);
        flex-shrink: 0;
      }
      :host[color='oxblood'] {
        background: var(--accent-50);
        color: var(--accent-700);
        border-color: transparent;
      }
      :host[color='oxblood'] .dot { background: var(--accent); }
      :host[color='amber'] {
        background: var(--amber-100);
        color: #7a5510;
        border-color: transparent;
      }
      :host[color='amber'] .dot { background: var(--amber); }
      :host[color='moss'] {
        background: var(--sage-100);
        color: #3c533c;
        border-color: transparent;
      }
      :host[color='moss'] .dot { background: var(--sage); }
      :host[color='rust'] {
        background: var(--clay-100);
        color: #7a3c25;
        border-color: transparent;
      }
      :host[color='rust'] .dot { background: var(--clay); }
      :host[color='ink'] {
        background: #ece8e0;
        color: var(--ink-700);
        border-color: transparent;
      }
      :host[color='ink'] .dot { background: var(--ink-500); }
      :host[color='neutral'] .dot { display: none; }
      :host[color='neutral'] {
        padding-left: 11px;
      }
      :host[selected] {
        background: var(--accent);
        color: var(--bg);
        border-color: transparent;
      }
      :host[selected] .dot { background: var(--bg); }
      .label {
        font-family: var(--sans);
      }
      .x {
        margin-left: 2px;
        margin-right: -4px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        font-size: 14px;
        line-height: 1;
        color: inherit;
        opacity: 0.7;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: opacity 140ms var(--ease-out), background 140ms var(--ease-out);
      }
      .x:hover { opacity: 1; background: rgba(40, 37, 31, 0.08); }
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
