import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { SearchQuery } from '../../core/models';
import { SearchService } from './search.service';
import { UiPageHeader } from '../../shared/ui/page-header/page-header';
import { UiTag } from '../../shared/ui/tag/tag';
import { UiButton } from '../../shared/ui/button/button';
import { UiEmptyState } from '../../shared/ui/empty-state/empty-state';
import { UiInput } from '../../shared/ui/input/input';
import { formatDate, formatDateTime } from '../../core/util/date';

@Component({
  selector: 'search-history-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, UiPageHeader, UiTag, UiButton, UiEmptyState, UiInput],
  template: `
    <ui-page-header
      eyebrow="№ I/2 · LỊCH SỬ"
      number="0 / 8"
      title="Lịch sử tra cứu"
      description="Mọi truy vấn của bạn được lưu lại để dễ chạy lại hoặc đối chiếu trong báo cáo."
    >
      <button ui-button variant="outline" (click)="filterPinned.set(!filterPinned())">
        {{ filterPinned() ? 'Hiện tất cả' : 'Chỉ ghim' }}
      </button>
    </ui-page-header>

    <div class="filters">
      <input
        ui-input
        type="search"
        [(ngModel)]="searchText"
        placeholder="Lọc theo từ khóa trong câu hỏi…"
      />
      <select [(ngModel)]="modeFilter" name="mode" class="select">
        <option value="">Mọi chế độ</option>
        <option value="keyword">Từ khóa</option>
        <option value="semantic">Ngữ nghĩa</option>
        <option value="hybrid">Kết hợp</option>
      </select>
    </div>

    @if (loading()) {
      <p class="mono center">đang tải lịch sử…</p>
    } @else if (filtered().length === 0) {
      <ui-empty-state
        glyph="※"
        title="Chưa có truy vấn nào"
        description="Mọi câu hỏi bạn đặt cho kho lưu trữ sẽ hiển thị tại đây."
      >
        <a routerLink="/search">
          <button ui-button>Bắt đầu tìm kiếm</button>
        </a>
      </ui-empty-state>
    } @else {
      <ol class="timeline">
        @for (item of filtered(); track item.id; let i = $index) {
          <li class="entry reveal" [style.animation-delay.ms]="60 + i * 40">
            <aside class="when">
              <span class="day">{{ dayOf(item.executedAt) }}</span>
              <span class="month mono">{{ monthOf(item.executedAt) }}</span>
              <span class="full mono">{{ formatDateTime(item.executedAt) }}</span>
            </aside>
            <div class="body">
              <div class="body__head">
                @if (item.pinned) {
                  <span class="pin" title="Đã ghim">❧</span>
                }
                <h3 class="query">
                  <a [routerLink]="['/search/results']" [queryParams]="{ q: item.q, mode: item.mode }">
                    {{ item.q }}
                  </a>
                </h3>
              </div>
              <div class="body__meta">
                <ui-tag color="ink">{{ modeLabel(item.mode) }}</ui-tag>
                <span class="mono">{{ item.resultCount }} kết quả</span>
                <span class="dot">·</span>
                <span class="mono">{{ item.durationMs }}ms</span>
                @if (item.filters.tagIds && item.filters.tagIds.length) {
                  <span class="dot">·</span>
                  <span class="mono">{{ item.filters.tagIds.length }} bộ lọc tag</span>
                }
                @if (item.filters.types && item.filters.types.length) {
                  <span class="dot">·</span>
                  <span class="mono">loại {{ item.filters.types.join(', ') }}</span>
                }
              </div>
            </div>
            <div class="actions">
              <a [routerLink]="['/search/results']" [queryParams]="{ q: item.q, mode: item.mode }">
                <button ui-button variant="ghost" size="sm">Chạy lại</button>
              </a>
              <button ui-button variant="ghost" size="sm" (click)="togglePin(item)">
                {{ item.pinned ? 'Bỏ ghim' : 'Ghim' }}
              </button>
              <button ui-button variant="ghost" size="sm" (click)="remove(item)">Xóa</button>
            </div>
          </li>
        }
      </ol>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .filters {
        display: grid;
        grid-template-columns: 1fr 200px;
        gap: 16px;
        margin-bottom: 32px;
      }
      .select {
        font: inherit;
        padding: 10px 14px;
        border: 1px solid var(--line);
        background: var(--surface);
        border-radius: var(--r-pill);
        box-shadow: var(--sh-1);
        font-size: 13.5px;
        color: var(--ink-700);
      }
      .center { text-align: center; padding: 48px 0; color: var(--ink-400); }
      .timeline { display: flex; flex-direction: column; gap: 14px; }
      .entry {
        display: grid;
        grid-template-columns: 120px 1fr auto;
        gap: 26px;
        padding: 22px 26px;
        align-items: center;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--r-lg);
        box-shadow: var(--sh-1);
        transition: transform 180ms var(--ease-out), box-shadow 220ms var(--ease-out);
      }
      .entry:hover { transform: translateY(-2px); box-shadow: var(--sh-3); }
      .when {
        display: flex;
        flex-direction: column;
        gap: 4px;
        color: var(--ink-500);
      }
      .day {
        font-family: var(--serif);
        font-size: var(--fs-48);
        font-weight: 600;
        color: var(--ink-900);
        line-height: 1;
      }
      .month {
        text-transform: uppercase;
        font-size: 10px;
        letter-spacing: 0.16em;
        color: var(--ink-400);
      }
      .full {
        font-size: 11px;
        color: var(--ink-300);
        margin-top: 4px;
        letter-spacing: 0.02em;
      }
      .body__head {
        display: flex;
        gap: 10px;
        align-items: baseline;
      }
      .pin {
        font-family: var(--serif);
        font-style: italic;
        color: var(--accent);
        font-size: var(--fs-20);
      }
      .query {
        font-family: var(--serif);
        font-size: 22px;
        font-weight: 500;
        font-style: italic;
        letter-spacing: -0.015em;
        line-height: 1.2;
      }
      .query a { color: var(--ink-900); border-bottom: none; transition: color 180ms var(--ease-out); }
      .query a:hover { color: var(--accent); border-bottom: none; }
      .body__meta {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
        margin-top: 9px;
        color: var(--ink-400);
        font-family: var(--mono);
        font-size: 11.5px;
        letter-spacing: 0.02em;
      }
      .dot { color: var(--ink-300); }
      .actions {
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-self: center;
      }
      @media (max-width: 760px) {
        .filters { grid-template-columns: 1fr; }
        .entry {
          grid-template-columns: 1fr;
          gap: 14px;
          padding: 20px 18px;
        }
        .when { flex-direction: row; align-items: baseline; gap: 10px; }
        .day { font-size: var(--fs-30); }
        .full { display: none; }
        .actions { flex-direction: row; flex-wrap: wrap; }
      }
    `,
  ],
})
export class SearchHistoryPage implements OnInit {
  private svc = inject(SearchService);

  items = signal<SearchQuery[]>([]);
  loading = signal(true);
  searchText = '';
  modeFilter = '';
  filterPinned = signal(false);

  filtered = computed(() => {
    let rows = this.items();
    const t = this.searchText.trim().toLowerCase();
    if (t) rows = rows.filter((r) => r.q.toLowerCase().includes(t));
    if (this.modeFilter) rows = rows.filter((r) => r.mode === this.modeFilter);
    if (this.filterPinned()) rows = rows.filter((r) => r.pinned);
    return rows;
  });

  async ngOnInit() {
    try {
      this.items.set(await this.svc.history());
    } finally {
      this.loading.set(false);
    }
  }

  async togglePin(item: SearchQuery) {
    await this.svc.togglePin(item.id);
    this.items.update((list) =>
      list.map((x) => (x.id === item.id ? { ...x, pinned: !x.pinned } : x))
    );
  }

  async remove(item: SearchQuery) {
    if (!confirm(`Xóa truy vấn "${item.q}"?`)) return;
    await this.svc.deleteHistoryItem(item.id);
    this.items.update((list) => list.filter((x) => x.id !== item.id));
  }

  dayOf(iso: string): string {
    return new Date(iso).getDate().toString().padStart(2, '0');
  }

  monthOf(iso: string): string {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('vi-VN', { month: 'short', year: 'numeric' })
      .format(d)
      .toUpperCase();
  }

  modeLabel(m: string): string {
    return m === 'keyword' ? 'từ khóa' : m === 'semantic' ? 'ngữ nghĩa' : 'kết hợp';
  }

  formatDate = formatDate;
  formatDateTime = formatDateTime;
}
