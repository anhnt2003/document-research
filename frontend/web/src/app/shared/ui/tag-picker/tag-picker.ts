import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Tag } from '../../../core/models';
import { UiTag } from '../tag/tag';

@Component({
  selector: 'ui-tag-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, UiTag],
  template: `
    <div class="selected" data-testid="tag-picker-selected">
      @for (t of selectedTags(); track t.id) {
        <ui-tag
          [color]="t.color"
          [removable]="editable()"
          (remove)="emitRemove(t.id)"
        >{{ t.label }}</ui-tag>
      } @empty {
        <span class="empty mono">Chưa có tag.</span>
      }
    </div>

    @if (editable()) {
      <div class="add" data-testid="tag-picker-add">
        @if (open()) {
          <input
            type="search"
            class="filter"
            [(ngModel)]="query"
            (ngModelChange)="onQuery($event)"
            placeholder="Lọc tag…"
            data-testid="tag-picker-filter"
          />
          <ul class="options">
            @for (t of available(); track t.id) {
              <li>
                <button
                  type="button"
                  class="option"
                  [attr.data-testid]="'tag-option-' + t.id"
                  (click)="emitAdd(t.id)"
                >
                  <ui-tag [color]="t.color">{{ t.label }}</ui-tag>
                </button>
              </li>
            } @empty {
              <li class="empty mono">không có tag phù hợp</li>
            }
          </ul>
          <button type="button" class="close" (click)="open.set(false)">đóng</button>
        } @else {
          <button
            type="button"
            class="trigger"
            data-testid="tag-picker-open"
            (click)="open.set(true)"
          >+ thêm tag</button>
        }
      </div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .selected {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
        margin-bottom: 8px;
      }
      .empty { color: var(--ink-400); font-size: var(--fs-12); }
      .add { position: relative; display: inline-block; }
      .trigger {
        font-family: var(--mono);
        font-size: var(--fs-12);
        color: var(--ink-500);
        background: var(--surface);
        border: 1px dashed var(--line-strong);
        border-radius: var(--r-pill);
        padding: 5px 13px;
        cursor: pointer;
        transition:
          color 160ms var(--ease-out),
          border-color 160ms var(--ease-out),
          background 160ms var(--ease-out);
      }
      .trigger:hover {
        color: var(--accent-700);
        border-color: var(--accent-100);
        background: var(--accent-50);
      }
      .filter {
        font-size: var(--fs-14);
        padding: 8px 14px;
        border: 1px solid var(--line);
        border-radius: var(--r-md);
        background: var(--surface);
        box-shadow: var(--sh-1);
        margin-right: 8px;
        outline: none;
        transition: border-color 180ms var(--ease-out), box-shadow 200ms var(--ease-out);
      }
      .filter:focus {
        border-color: var(--accent-100);
        box-shadow: var(--sh-1), 0 0 0 4px var(--accent-50);
      }
      .options {
        list-style: none;
        padding: 6px;
        margin: 8px 0 0;
        max-height: 240px;
        overflow-y: auto;
        border: 1px solid var(--line);
        border-radius: var(--r-md);
        background: var(--surface);
        box-shadow: var(--sh-3);
      }
      .option {
        display: block;
        width: 100%;
        text-align: left;
        background: transparent;
        border: none;
        padding: 5px 8px;
        border-radius: var(--r-sm);
        cursor: pointer;
        transition: background 140ms var(--ease-out);
      }
      .option:hover { background: var(--surface-2); }
      .close {
        margin-left: 4px;
        font-size: var(--fs-12);
        background: transparent;
        border: none;
        color: var(--ink-500);
        cursor: pointer;
      }
      .close:hover { color: var(--accent-700); }
    `,
  ],
})
export class UiTagPicker {
  readonly availableTags = input<Tag[]>([]);
  readonly selectedIds = input<string[]>([]);
  readonly editable = input(false);

  @Output() add = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();

  open = signal(false);
  query = '';
  private filter = signal('');

  selectedTags = computed(() => {
    const ids = new Set(this.selectedIds());
    return this.availableTags().filter((t) => ids.has(t.id));
  });

  available = computed(() => {
    const ids = new Set(this.selectedIds());
    const q = this.filter().trim().toLowerCase();
    return this.availableTags()
      .filter((t) => !ids.has(t.id))
      .filter((t) => !q || t.label.toLowerCase().includes(q));
  });

  onQuery(value: string) {
    this.filter.set(value);
  }

  emitAdd(id: string) {
    this.add.emit(id);
    this.open.set(false);
    this.query = '';
    this.filter.set('');
  }

  emitRemove(id: string) {
    this.remove.emit(id);
  }
}
