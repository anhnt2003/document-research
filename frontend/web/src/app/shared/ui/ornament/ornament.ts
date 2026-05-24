import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'ui-ornament',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="glyph">{{ glyph }}</span>`,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 24px 0;
        color: var(--ink-300);
      }
      :host::before,
      :host::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--rule);
        max-width: 96px;
      }
      .glyph {
        font-family: var(--font-display);
        font-style: italic;
        font-size: var(--fs-20);
      }
    `,
  ],
})
export class UiOrnament {
  @Input() glyph: '❧' | '※' | '§' | '¶' | '№' = '❧';
}
