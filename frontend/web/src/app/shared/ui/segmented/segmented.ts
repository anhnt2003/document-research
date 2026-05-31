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
        border: 1px solid var(--line);
        border-radius: var(--r-pill);
        background: var(--bg-2);
        padding: 3px;
        gap: 2px;
      }
      button {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        padding: 7px 16px;
        font-size: var(--fs-13);
        font-weight: 600;
        color: var(--ink-500);
        border-radius: var(--r-pill);
        transition:
          background 180ms var(--ease-out),
          color 180ms var(--ease-out),
          box-shadow 180ms var(--ease-out);
        line-height: 1.2;
      }
      button:hover { color: var(--ink-900); }
      button.is-active {
        background: var(--surface);
        color: var(--accent-700);
        box-shadow: var(--sh-1);
      }
      button.is-active .desc { color: var(--accent); }
      .desc {
        font-family: var(--mono);
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
