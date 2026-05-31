import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface DocumentListItem {
  id: string;
  title: string;
}

@Component({
  selector: 'app-document-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (documents().length === 0) {
      <p data-testid="empty-state" class="empty">No documents yet</p>
    } @else {
      @for (doc of documents(); track doc.id) {
        <div data-testid="document-row" class="row">{{ doc.title }}</div>
      }
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .empty {
        font-family: var(--serif);
        font-style: italic;
        color: var(--ink-400);
        text-align: center;
        padding: 40px 20px;
      }
      .row {
        font-family: var(--serif);
        font-size: 17px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--ink-900);
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--r-lg);
        box-shadow: var(--sh-2);
        padding: 18px 22px;
        transition: transform 180ms var(--ease-out), box-shadow 220ms var(--ease-out);
      }
      .row:hover {
        transform: translateY(-2px);
        box-shadow: var(--sh-3);
      }
    `,
  ],
})
export class DocumentListComponent {
  readonly documents = input.required<DocumentListItem[]>();
}
