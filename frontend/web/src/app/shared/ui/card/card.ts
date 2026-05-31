import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'ui-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  styles: [
    `
      :host {
        display: block;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--r-lg);
        box-shadow: var(--sh-2);
        padding: 24px 26px;
        transition:
          box-shadow 240ms var(--ease-out),
          transform 200ms var(--ease-out),
          border-color 200ms var(--ease-out);
      }
      :host(:hover) {
        box-shadow: var(--sh-3);
        transform: translateY(-2px);
      }
      :host[surface='paper'] { background: var(--surface-2); }
      :host[surface='ink'] {
        background: var(--ink-900);
        color: var(--bg-2);
        border-color: var(--ink-700);
      }
      :host[bare] {
        background: transparent;
        border: none;
        box-shadow: none;
        padding: 0;
      }
      :host[bare]:hover {
        box-shadow: none;
        transform: none;
      }
      :host[pad='compact'] { padding: 16px 18px; }
      :host[pad='roomy'] { padding: 32px 36px; }
    `,
  ],
  host: {
    '[attr.surface]': 'surface',
    '[attr.pad]': 'pad',
    '[attr.bare]': 'bare ? "" : null',
  },
})
export class UiCard {
  @Input() surface: 'paper' | 'ink' | 'default' = 'default';
  @Input() pad: 'compact' | 'default' | 'roomy' = 'default';
  @Input() bare = false;
}
