import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'ui-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="left">
      @if (eyebrow) {
        <span class="eyebrow">{{ eyebrow }}</span>
      }
      <h1 class="title">
        @if (number) {
          <span class="num">{{ number }}</span>
        }
        <span>{{ title }}</span>
      </h1>
      @if (description) {
        <p class="desc">{{ description }}</p>
      }
    </div>
    <div class="right">
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      :host {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: flex-end;
        gap: 24px;
        padding: 32px 0 24px;
        border-bottom: 1px solid var(--rule);
        margin-bottom: 32px;
      }
      .eyebrow {
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--ink-500);
        display: block;
        margin-bottom: 12px;
      }
      .title {
        font-family: var(--font-display);
        font-weight: 400;
        font-size: var(--fs-48);
        font-variation-settings: 'opsz' 96, 'SOFT' 60;
        letter-spacing: -0.025em;
        line-height: 1.04;
        color: var(--ink-900);
        margin: 0;
        display: flex;
        align-items: baseline;
        gap: 16px;
      }
      .num {
        font-family: var(--font-mono);
        font-size: var(--fs-14);
        color: var(--ink-300);
        font-style: normal;
        font-weight: 500;
        letter-spacing: 0.12em;
        align-self: flex-start;
        margin-top: 14px;
      }
      .desc {
        max-width: 560px;
        margin-top: 12px;
        color: var(--ink-600);
        font-size: var(--fs-15);
        line-height: 1.55;
      }
      .right {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      }
      .right:empty { display: none; }
      @media (max-width: 720px) {
        :host {
          grid-template-columns: 1fr;
        }
        .title { font-size: var(--fs-36); }
      }
    `,
  ],
})
export class UiPageHeader {
  @Input({ required: true }) title!: string;
  @Input() eyebrow?: string;
  @Input() description?: string;
  @Input() number?: string;
}
