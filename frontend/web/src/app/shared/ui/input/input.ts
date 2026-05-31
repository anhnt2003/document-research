import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'input[ui-input], textarea[ui-input]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        font-family: var(--sans);
        font-size: var(--fs-15);
        color: var(--ink-900);
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--line-strong);
        padding: 8px 0;
        transition: border-color 180ms var(--ease-out);
        outline: none;
      }
      :host:focus {
        border-bottom-color: var(--accent);
        outline: none;
      }
      :host::placeholder {
        color: var(--ink-300);
        font-style: italic;
      }
      :host[disabled] {
        color: var(--ink-400);
        cursor: not-allowed;
      }
      :host[ui-input='boxed'] {
        padding: 11px 16px;
        border: 1px solid var(--line);
        border-radius: var(--r-md);
        background: var(--surface);
        box-shadow: var(--sh-1);
        transition:
          border-color 180ms var(--ease-out),
          box-shadow 200ms var(--ease-out);
      }
      :host[ui-input='boxed']:focus {
        border-color: var(--accent-100);
        box-shadow: var(--sh-1), 0 0 0 4px var(--accent-50);
      }
    `,
  ],
})
export class UiInput {
  @Input('ui-input') variant?: '' | 'boxed' | null;
}
