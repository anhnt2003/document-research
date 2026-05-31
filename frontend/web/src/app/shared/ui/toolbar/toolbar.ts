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
        padding: 14px 18px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--r-lg);
        box-shadow: var(--sh-2);
        margin-bottom: 24px;
        flex-wrap: wrap;
      }
      :host > .spacer { flex: 1; }
    `,
  ],
})
export class UiToolbar {}
