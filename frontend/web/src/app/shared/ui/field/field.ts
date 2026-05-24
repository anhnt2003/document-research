import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'ui-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="field">
      @if (label) {
        <span class="label">
          <span class="label__text">{{ label }}</span>
          @if (hint) {
            <span class="label__hint">{{ hint }}</span>
          }
        </span>
      }
      <span class="control">
        <ng-content></ng-content>
      </span>
      @if (error) {
        <span class="error">{{ error }}</span>
      }
    </label>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .label {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--ink-500);
      }
      .label__hint {
        text-transform: none;
        letter-spacing: 0;
        font-family: var(--font-body);
        font-size: var(--fs-13);
        color: var(--ink-400);
      }
      .control {
        display: block;
      }
      .error {
        font-size: var(--fs-13);
        color: var(--oxblood);
        font-style: italic;
      }
    `,
  ],
})
export class UiField {
  @Input() label?: string;
  @Input() hint?: string;
  @Input() error?: string;
}
