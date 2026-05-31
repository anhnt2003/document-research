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
        padding: 72px 32px;
        color: var(--ink-500);
      }
      .glyph {
        font-family: var(--serif);
        font-style: italic;
        font-size: 80px;
        line-height: 1;
        color: var(--accent);
        opacity: 0.3;
        margin-bottom: 18px;
      }
      .title {
        font-family: var(--serif);
        font-weight: 600;
        font-size: var(--fs-24);
        font-variation-settings: 'opsz' 36;
        color: var(--ink-900);
        margin-bottom: 8px;
      }
      .desc {
        max-width: 38ch;
        line-height: 1.6;
        margin-bottom: 18px;
        color: var(--ink-500);
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
