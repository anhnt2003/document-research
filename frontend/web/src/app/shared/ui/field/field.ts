import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'ui-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="field">
      @if (label) {
        <span class="label">{{ label }}</span>
      }
      <span class="control">
        <ng-content></ng-content>
      </span>
      @if (hint) {
        <span class="hint">{{ hint }}</span>
      }
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
        display: block;
        font-family: var(--mono);
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--ink-500);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .control {
        display: block;
      }
      .hint {
        margin-top: 2px;
        font-family: var(--sans);
        font-size: var(--fs-13);
        line-height: 1.45;
        color: var(--ink-400);
      }
      .error {
        font-size: var(--fs-13);
        color: var(--clay);
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
