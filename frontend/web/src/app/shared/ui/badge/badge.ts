import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

type BadgeTone = 'neutral' | 'moss' | 'amber' | 'rust' | 'oxblood' | 'ink';

@Component({
  selector: 'ui-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 8px;
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-weight: 500;
        border-radius: var(--radius-xs);
        background: var(--paper-100);
        color: var(--ink-700);
        line-height: 1.6;
      }
      :host[tone='moss'] { background: var(--moss-soft); color: var(--moss); }
      :host[tone='amber'] { background: var(--amber-soft); color: var(--amber); }
      :host[tone='rust'] { background: var(--rust-soft); color: var(--rust); }
      :host[tone='oxblood'] { background: var(--oxblood-soft); color: var(--oxblood); }
      :host[tone='ink'] { background: var(--ink-900); color: var(--paper-50); }
    `,
  ],
  host: { '[attr.tone]': 'tone' },
})
export class UiBadge {
  @Input() tone: BadgeTone = 'neutral';
}
