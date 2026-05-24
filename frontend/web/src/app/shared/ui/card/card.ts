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
        background: var(--paper-50);
        border: 1px solid var(--rule);
        border-radius: var(--radius-sm);
        padding: 24px;
      }
      :host[surface='paper'] { background: var(--paper-100); }
      :host[surface='ink'] { background: var(--ink-900); color: var(--paper-50); border-color: var(--ink-700); }
      :host[bare] {
        background: transparent;
        border: none;
        padding: 0;
      }
      :host[pad='compact'] { padding: 16px; }
      :host[pad='roomy'] { padding: 32px; }
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
