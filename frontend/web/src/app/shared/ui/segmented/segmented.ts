import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

@Component({
  selector: 'ui-segmented',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="segments" role="tablist">
      @for (opt of options; track opt.value) {
        <button
          role="tab"
          type="button"
          [class.is-active]="opt.value === value"
          [attr.aria-selected]="opt.value === value"
          (click)="select(opt.value)"
        >
          <span class="label">{{ opt.label }}</span>
          @if (opt.description) {
            <span class="desc">{{ opt.description }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .segments {
        display: inline-flex;
        border: 1px solid var(--rule-strong);
        border-radius: var(--radius-sm);
        background: var(--paper-50);
        padding: 3px;
        gap: 0;
      }
      button {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        padding: 8px 18px;
        font-size: var(--fs-14);
        font-weight: 500;
        color: var(--ink-500);
        border-radius: var(--radius-xs);
        transition: background 140ms var(--ease-out), color 140ms var(--ease-out);
        line-height: 1.2;
      }
      button:hover { color: var(--ink-900); }
      button.is-active {
        background: var(--ink-900);
        color: var(--paper-50);
      }
      button.is-active .desc { color: var(--paper-200); }
      .desc {
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        font-weight: 400;
        margin-top: 2px;
        color: var(--ink-400);
        letter-spacing: 0.04em;
      }
      :host[block] .segments { display: flex; width: 100%; }
      :host[block] button { flex: 1; }
    `,
  ],
  host: { '[attr.block]': 'block ? "" : null' },
})
export class UiSegmented<T extends string = string> {
  @Input({ required: true }) options!: SegmentOption<T>[];
  @Input({ required: true }) value!: T;
  @Input() block = false;
  @Output() valueChange = new EventEmitter<T>();

  select(v: T) {
    if (v !== this.value) this.valueChange.emit(v);
  }
}
