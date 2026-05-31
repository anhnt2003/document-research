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
        color: var(--accent);
      }
      :host::before,
      :host::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--line);
        max-width: 96px;
      }
      .glyph {
        font-family: var(--serif);
        font-style: italic;
        font-size: var(--fs-20);
        opacity: 0.55;
      }
    `,
  ],
})
export class UiOrnament {
  @Input() glyph: '❧' | '※' | '§' | '¶' | '№' = '❧';
}
