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
      <p data-testid="empty-state">No documents yet</p>
    } @else {
      @for (doc of documents(); track doc.id) {
        <div data-testid="document-row">{{ doc.title }}</div>
      }
    }
  `,
})
export class DocumentListComponent {
  readonly documents = input.required<DocumentListItem[]>();
}
