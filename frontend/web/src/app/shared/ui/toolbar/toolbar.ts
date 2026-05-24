import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ui-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 0;
        border-bottom: 1px solid var(--rule);
        margin-bottom: 24px;
        flex-wrap: wrap;
      }
      :host > .spacer { flex: 1; }
    `,
  ],
})
export class UiToolbar {}
