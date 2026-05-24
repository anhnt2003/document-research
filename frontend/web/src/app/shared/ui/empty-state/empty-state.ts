import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'ui-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="glyph">{{ glyph }}</div>
    @if (title) {
      <h3 class="title">{{ title }}</h3>
    }
    @if (description) {
      <p class="desc">{{ description }}</p>
    }
    <div class="actions">
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 48px 32px;
        color: var(--ink-500);
      }
      .glyph {
        font-family: var(--font-display);
        font-style: italic;
        font-size: 80px;
        line-height: 1;
        color: var(--rule-strong);
        margin-bottom: 16px;
      }
      .title {
        font-style: italic;
        font-size: var(--fs-20);
        font-variation-settings: 'opsz' 36, 'SOFT' 80;
        color: var(--ink-800);
        margin-bottom: 8px;
      }
      .desc {
        max-width: 420px;
        line-height: 1.6;
        margin-bottom: 16px;
      }
      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: center;
      }
      .actions:empty { display: none; }
    `,
  ],
})
export class UiEmptyState {
  @Input() glyph = '❧';
  @Input() title?: string;
  @Input() description?: string;
}
