import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { DocumentListComponent } from './document-list.component';

describe('DocumentListComponent', () => {
  let fixture: ComponentFixture<DocumentListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentListComponent);
  });

  it('shows the empty state when there are no documents', () => {
    fixture.componentRef.setInput('documents', []);
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector(
      '[data-testid="empty-state"]',
    );
    expect(emptyState).not.toBeNull();
    expect(emptyState!.textContent).toContain('No documents yet');
  });

  it('renders one row per document with the title text', () => {
    fixture.componentRef.setInput('documents', [
      { id: '1', title: 'RFC 7231' },
      { id: '2', title: 'RFC 9110' },
    ]);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll(
      '[data-testid="document-row"]',
    );
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('RFC 7231');
    expect(rows[1].textContent).toContain('RFC 9110');
  });
});
