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
        padding: 3px 11px;
        font-family: var(--mono);
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-weight: 500;
        border-radius: var(--r-pill);
        background: var(--surface-2);
        color: var(--ink-700);
        border: 1px solid var(--line-soft);
        line-height: 1.5;
      }
      :host[tone='moss'] { background: var(--sage-100); color: #3c533c; border-color: transparent; }
      :host[tone='amber'] { background: var(--amber-100); color: #7a5510; border-color: transparent; }
      :host[tone='rust'] { background: var(--clay-100); color: #7a3c25; border-color: transparent; }
      :host[tone='oxblood'] { background: var(--accent-50); color: var(--accent-700); border-color: transparent; }
      :host[tone='ink'] { background: var(--ink-900); color: var(--bg-2); border-color: transparent; }
    `,
  ],
  host: { '[attr.tone]': 'tone' },
})
export class UiBadge {
  @Input() tone: BadgeTone = 'neutral';
}
