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
        font-family: var(--font-body);
        font-size: var(--fs-15);
        color: var(--ink-900);
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--rule-strong);
        padding: 8px 0;
        transition: border-color 160ms var(--ease-out);
        outline: none;
      }
      :host:focus {
        border-bottom-color: var(--oxblood);
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
        padding: 10px 14px;
        border: 1px solid var(--rule-strong);
        border-radius: var(--radius-sm);
        background: var(--paper-50);
      }
      :host[ui-input='boxed']:focus {
        border-color: var(--oxblood);
      }
    `,
  ],
})
export class UiInput {
  @Input('ui-input') variant?: '' | 'boxed' | null;
}
