import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { DocumentItem, Tag } from '../../core/models';
import { DocumentsService } from './documents.service';
import { UiPageHeader } from '../../shared/ui/page-header/page-header';
import { UiButton } from '../../shared/ui/button/button';
import { UiTag } from '../../shared/ui/tag/tag';
import { UiBadge } from '../../shared/ui/badge/badge';
import { UiInput } from '../../shared/ui/input/input';
import { UiEmptyState } from '../../shared/ui/empty-state/empty-state';
import { RelativeDatePipe } from '../../shared/pipes/relative-date.pipe';
import { formatBytes } from '../../core/util/date';

type View = 'table' | 'grid';

@Component({
  selector: 'document-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    SlicePipe,
    UiPageHeader,
    UiButton,
    UiTag,
    UiBadge,
    UiInput,
    UiEmptyState,
    RelativeDatePipe,
  ],
  template: `
    <ui-page-header
      eyebrow="№ II · KHO TÀI LIỆU"
      number="II / 1"
      title="Kho tài liệu"
      description="Toàn bộ tài liệu trong kho lưu trữ, có thể lọc theo loại, tag, và visibility."
    >
      <a routerLink="/documents/upload">
        <button ui-button>↥ Tải lên</button>
      </a>
    </ui-page-header>

    <div class="bar">
      <input
        ui-input
        type="search"
        [(ngModel)]="q"
        (ngModelChange)="apply()"
        placeholder="Lọc theo tên hoặc tóm tắt…"
        class="search"
      />
      <select [(ngModel)]="typeFilter" (ngModelChange)="apply()" class="select">
        <option value="">Mọi loại</option>
        <option value="pdf">PDF</option>
        <option value="docx">Word</option>
        <option value="md">Markdown</option>
        <option value="link">Liên kết</option>
      </select>
      <select [(ngModel)]="tagFilter" (ngModelChange)="apply()" class="select">
        <option value="">Mọi tag</option>
        @for (t of tags(); track t.id) {
          <option [value]="t.id">{{ t.label }}</option>
        }
      </select>
      <select [(ngModel)]="sort" (ngModelChange)="apply()" class="select">
        <option value="updatedAt">Cập nhật mới</option>
        <option value="uploadedAt">Mới tải lên</option>
        <option value="title">Tên A → Z</option>
      </select>
      <span class="spacer"></span>
      <div class="view-toggle" role="tablist" [class.is-locked]="isNarrow()">
        <button
          type="button"
          [class.is-active]="view() === 'table'"
          (click)="view.set('table')"
        >☷ Bảng</button>
        <button
          type="button"
          [class.is-active]="view() === 'grid'"
          (click)="view.set('grid')"
        >▥ Lưới</button>
      </div>
    </div>

    @if (loading()) {
      <p class="center mono">đang tải tài liệu…</p>
    } @else if (items().length === 0) {
      <ui-empty-state
        glyph="❧"
        title="Chưa có tài liệu nào khớp"
        description="Thử bỏ bộ lọc hoặc tải lên tài liệu mới."
      />
    } @else {
      @if (effectiveView() === 'table') {
        <table class="table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tiêu đề</th>
              <th>Loại</th>
              <th>Tag</th>
              <th>Visibility</th>
              <th>Cập nhật</th>
              <th>Dung lượng</th>
            </tr>
          </thead>
          <tbody>
            @for (d of items(); track d.id; let i = $index) {
              <tr class="reveal" [style.animation-delay.ms]="40 + i * 20">
                <td class="sig">{{ d.signature }}</td>
                <td class="title-cell">
                  <a [routerLink]="['/documents', d.id]">{{ d.title }}</a>
                  <p class="snippet">{{ d.summary | slice: 0:120 }}{{ d.summary.length > 120 ? '…' : '' }}</p>
                </td>
                <td><ui-tag color="ink">{{ d.type.toUpperCase() }}</ui-tag></td>
                <td>
                  <div class="tags">
                    @for (t of d.tagIds.slice(0, 2); track t) {
                      <ui-tag color="amber">{{ tagLabel(t) }}</ui-tag>
                    }
                    @if (d.tagIds.length > 2) {
                      <span class="mono">+{{ d.tagIds.length - 2 }}</span>
                    }
                  </div>
                </td>
                <td>
                  <ui-badge [tone]="visTone(d.visibility)">
                    {{ visLabel(d.visibility) }}
                  </ui-badge>
                </td>
                <td class="mono">{{ d.updatedAt | relativeDate }}</td>
                <td class="mono">{{ d.sizeBytes ? formatBytes(d.sizeBytes) : '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <div class="grid">
          @for (d of items(); track d.id; let i = $index) {
            <article class="card reveal" [style.animation-delay.ms]="40 + i * 30">
              <header class="card__head">
                <span class="card__sig mono">{{ d.signature }}</span>
                <ui-tag color="ink">{{ d.type.toUpperCase() }}</ui-tag>
              </header>
              <h3 class="card__title">
                <a [routerLink]="['/documents', d.id]">{{ d.title }}</a>
              </h3>
              <p class="card__summary">{{ d.summary }}</p>
              <footer class="card__foot">
                <div class="card__tags">
                  @for (t of d.tagIds.slice(0, 3); track t) {
                    <ui-tag color="amber">{{ tagLabel(t) }}</ui-tag>
                  }
                </div>
                <div class="card__meta mono">
                  <span>{{ d.updatedAt | relativeDate }}</span>
                  @if (d.sizeBytes) {
                    <span class="dot">·</span>
                    <span>{{ formatBytes(d.sizeBytes) }}</span>
                  }
                </div>
              </footer>
            </article>
          }
        </div>
      }
    }
  `,
  styles: [
    `
      :host { display: block; }
      .bar {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 14px 0 22px;
        flex-wrap: wrap;
      }
      .search { min-width: 260px; flex: 1; }
      .select {
        font: inherit;
        padding: 8px 12px;
        border: 1px solid var(--rule-strong);
        background: var(--paper-50);
        border-radius: var(--radius-sm);
      }
      .spacer { flex: 1; }
      .view-toggle {
        display: inline-flex;
        border: 1px solid var(--rule-strong);
        border-radius: var(--radius-sm);
        overflow: hidden;
      }
      .view-toggle.is-locked { display: none; }
      .view-toggle button {
        padding: 8px 12px;
        font-size: var(--fs-13);
        color: var(--ink-500);
        background: var(--paper-50);
        border-left: 1px solid var(--rule-strong);
      }
      .view-toggle button:first-child { border-left: none; }
      .view-toggle button.is-active {
        background: var(--ink-900);
        color: var(--paper-50);
      }
      .center { text-align: center; padding: 48px 0; color: var(--ink-400); }
      .table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--fs-14);
      }
      .table thead th {
        text-align: left;
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--ink-500);
        padding: 14px 16px;
        border-bottom: 1px solid var(--rule);
      }
      .table tbody td {
        padding: 16px;
        border-bottom: 1px solid var(--rule);
        vertical-align: top;
        transition: background 120ms var(--ease-out);
      }
      .table tbody tr:hover td { background: var(--paper-100); }
      .table tbody tr:hover td:first-child {
        box-shadow: inset 2px 0 0 var(--oxblood);
      }
      .sig {
        font-family: var(--font-mono);
        color: var(--oxblood);
        font-size: var(--fs-12);
        letter-spacing: 0.06em;
        white-space: nowrap;
        padding-right: 8px !important;
      }
      .title-cell a {
        font-family: var(--font-display);
        font-size: var(--fs-18);
        font-weight: 400;
        font-variation-settings: 'opsz' 36;
        color: var(--ink-900);
        border-bottom: none;
        letter-spacing: -0.01em;
      }
      .title-cell a:hover { color: var(--oxblood); border-bottom: 1px solid var(--oxblood); }
      .snippet {
        font-size: var(--fs-13);
        color: var(--ink-500);
        margin-top: 4px;
        line-height: 1.5;
      }
      .tags { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
      .mono { font-family: var(--font-mono); font-size: var(--fs-12); color: var(--ink-500); letter-spacing: 0.04em; }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }
      .card {
        padding: 22px;
        background: var(--paper-50);
        border: 1px solid var(--rule);
        display: flex;
        flex-direction: column;
        gap: 12px;
        transition: border-color 140ms var(--ease-out), transform 140ms var(--ease-out);
      }
      .card:hover {
        border-color: var(--ink-700);
        transform: translateY(-1px);
      }
      .card__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
      }
      .card__sig {
        font-size: var(--fs-12);
        color: var(--oxblood);
        letter-spacing: 0.08em;
        font-weight: 500;
      }
      .card__title {
        font-family: var(--font-display);
        font-size: var(--fs-20);
        font-weight: 400;
        font-variation-settings: 'opsz' 36, 'SOFT' 50;
        letter-spacing: -0.01em;
        line-height: 1.2;
        margin: 0;
      }
      .card__title a {
        color: var(--ink-900);
        border-bottom: none;
      }
      .card__title a:hover { color: var(--oxblood); }
      .card__summary {
        color: var(--ink-600);
        line-height: 1.5;
        font-size: var(--fs-14);
        flex: 1;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .card__foot {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding-top: 12px;
        border-top: 1px solid var(--rule);
      }
      .card__tags { display: flex; flex-wrap: wrap; gap: 6px; }
      .card__meta {
        display: flex;
        gap: 8px;
        align-items: center;
        color: var(--ink-500);
      }
      .dot { color: var(--ink-300); }

      @media (max-width: 1100px) {
        .table thead th:nth-child(5),
        .table tbody td:nth-child(5),
        .table thead th:nth-child(7),
        .table tbody td:nth-child(7) {
          display: none;
        }
      }
      @media (max-width: 880px) {
        .table thead th:nth-child(3),
        .table tbody td:nth-child(3),
        .table thead th:nth-child(4),
        .table tbody td:nth-child(4) {
          display: none;
        }
        .snippet { -webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; }
      }
      @media (max-width: 720px) {
        .bar { gap: 8px; }
        .search { min-width: 0; flex-basis: 100%; }
        .select { flex: 1; min-width: 0; }
        .grid { grid-template-columns: 1fr; gap: 12px; }
        .card { padding: 18px; }
      }
    `,
  ],
})
export class DocumentListPage implements OnInit {
  private svc = inject(DocumentsService);
  formatBytes = formatBytes;

  items = signal<DocumentItem[]>([]);
  tags = signal<Tag[]>([]);
  loading = signal(true);
  view = signal<View>('table');
  isNarrow = signal(false);
  effectiveView = computed<View>(() => (this.isNarrow() ? 'grid' : this.view()));
  q = '';
  typeFilter = '';
  tagFilter = '';
  sort: 'updatedAt' | 'uploadedAt' | 'title' = 'updatedAt';
  tagMap = computed(() => new Map(this.tags().map((t) => [t.id, t.label])));

  constructor() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(max-width: 720px)');
      const sync = () => this.isNarrow.set(mq.matches);
      sync();
      mq.addEventListener('change', sync);
    }
  }

  async ngOnInit() {
    this.tags.set(await this.svc.tags());
    await this.apply();
  }

  async apply() {
    this.loading.set(true);
    try {
      const page = await this.svc.list({
        q: this.q,
        type: this.typeFilter,
        tag: this.tagFilter,
        sort: this.sort,
        pageSize: 50,
      });
      this.items.set(page.items);
    } finally {
      this.loading.set(false);
    }
  }

  tagLabel(id: string): string {
    return this.tagMap().get(id) ?? id;
  }

  visTone(v: string): 'moss' | 'amber' | 'ink' {
    return v === 'public' ? 'moss' : v === 'team' ? 'amber' : 'ink';
  }
  visLabel(v: string): string {
    return v === 'public' ? 'Công khai' : v === 'team' ? 'Nhóm' : 'Riêng tư';
  }
}
