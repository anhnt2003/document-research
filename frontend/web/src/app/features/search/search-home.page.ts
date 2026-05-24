import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { SearchMode, SearchQuery } from '../../core/models';
import { SearchService } from './search.service';
import { UiSegmented } from '../../shared/ui/segmented/segmented';
import { UiTag } from '../../shared/ui/tag/tag';
import { RelativeDatePipe } from '../../shared/pipes/relative-date.pipe';

@Component({
  selector: 'search-home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, UiSegmented, UiTag, RelativeDatePipe],
  template: `
    <div class="hero">
      <span class="eyebrow reveal">№ I · TÌM KIẾM</span>
      <h1 class="display reveal reveal-delay-1">
        Hỏi <em>kho lưu trữ.</em>
      </h1>
      <p class="lede reveal reveal-delay-2">
        Tra cứu hơn 20 tài liệu học thuật bằng từ khóa cổ điển hoặc ngữ nghĩa
        bằng vector embedding. Câu trả lời được tổng hợp kèm trích dẫn.
      </p>

      <form class="search reveal reveal-delay-3" (submit)="run($event)">
        <span class="search__glyph">¶</span>
        <input
          type="search"
          name="q"
          [(ngModel)]="query"
          placeholder="vd: pgvector benchmark, kiến trúc hexagonal, RAG faithfulness…"
          autocomplete="off"
          autofocus
        />
        <button type="submit" aria-label="Tra cứu">→</button>
      </form>

      <div class="mode reveal reveal-delay-4">
        <ui-segmented
          [options]="modes"
          [value]="mode()"
          (valueChange)="mode.set($event)"
        />
        <span class="mode__hint mono">
          @if (mode() === 'keyword') { tìm khớp chính xác từ khóa }
          @if (mode() === 'semantic') { tìm theo ngữ nghĩa qua vector embedding }
          @if (mode() === 'hybrid') { kết hợp keyword + semantic, có rerank }
        </span>
      </div>
    </div>

    <section class="recent">
      <header class="recent__head">
        <span class="eyebrow">§ Gần đây</span>
        <a routerLink="/search/history" class="more">Toàn bộ lịch sử →</a>
      </header>

      @if (loading()) {
        <p class="loading mono">đang tải lịch sử…</p>
      } @else if (history().length === 0) {
        <p class="empty">Chưa có truy vấn nào. Hãy bắt đầu bằng câu hỏi của bạn ở trên.</p>
      } @else {
        <ul class="recent__list">
          @for (h of history().slice(0, 6); track h.id; let i = $index) {
            <li class="recent__item reveal" [style.animation-delay.ms]="80 + i * 40">
              <a [routerLink]="['/search/results']" [queryParams]="{ q: h.q, mode: h.mode }">
                <span class="recent__q">{{ h.q }}</span>
                <span class="recent__meta">
                  <ui-tag color="ink">{{ modeLabel(h.mode) }}</ui-tag>
                  <span class="mono">{{ h.resultCount }} kết quả · {{ h.durationMs }}ms</span>
                  <span class="mono">{{ h.executedAt | relativeDate }}</span>
                </span>
              </a>
            </li>
          }
        </ul>
      }
    </section>

    <aside class="prompts">
      <span class="eyebrow">❧ Gợi ý tra cứu</span>
      <div class="prompts__chips">
        @for (p of suggestions; track p) {
          <a [routerLink]="['/search/results']" [queryParams]="{ q: p, mode: 'hybrid' }">
            <ui-tag color="amber" [interactive]="true">{{ p }}</ui-tag>
          </a>
        }
      </div>
    </aside>
  `,
  styles: [
    `
      :host {
        display: block;
        padding-top: 56px;
      }
      .hero {
        max-width: 760px;
        margin: 0 auto;
        padding-bottom: 64px;
        text-align: center;
        position: relative;
      }
      .eyebrow {
        font-family: var(--font-mono);
        font-size: var(--fs-13);
        text-transform: uppercase;
        letter-spacing: 0.24em;
        color: var(--ink-500);
        display: inline-block;
        margin-bottom: 18px;
      }
      h1.display {
        font-family: var(--font-display);
        font-size: clamp(48px, 7vw, 88px);
        font-weight: 300;
        font-variation-settings: 'opsz' 144, 'SOFT' 60;
        letter-spacing: -0.035em;
        line-height: 0.98;
        margin: 0;
      }
      h1 em {
        font-style: italic;
        color: var(--oxblood);
        font-variation-settings: 'opsz' 144, 'SOFT' 90;
      }
      .lede {
        max-width: 560px;
        margin: 22px auto 36px;
        color: var(--ink-600);
        font-size: var(--fs-16);
        line-height: 1.55;
      }
      .search {
        display: flex;
        align-items: center;
        gap: 14px;
        background: var(--paper-50);
        border: 1px solid var(--rule-strong);
        height: 68px;
        padding: 0 24px;
        border-radius: var(--radius-sm);
        transition: border-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out);
        text-align: left;
      }
      .search:focus-within {
        border-color: var(--ink-900);
        box-shadow: 0 0 0 3px rgba(122, 31, 37, 0.08);
      }
      .search__glyph {
        font-family: var(--font-display);
        font-style: italic;
        color: var(--ink-400);
        font-size: var(--fs-24);
      }
      .search input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        font-family: var(--font-body);
        font-size: var(--fs-18);
        color: var(--ink-900);
      }
      .search input::placeholder {
        color: var(--ink-400);
        font-style: italic;
      }
      .search button {
        width: 44px;
        height: 44px;
        background: var(--ink-900);
        color: var(--paper-50);
        font-size: var(--fs-20);
        border-radius: var(--radius-xs);
        transition: background 140ms var(--ease-out);
      }
      .search button:hover { background: var(--oxblood); }
      .mode {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        margin-top: 24px;
        flex-wrap: wrap;
      }
      .mode__hint {
        font-size: var(--fs-12);
        color: var(--ink-500);
        font-style: italic;
        letter-spacing: 0.04em;
        font-family: var(--font-body);
      }
      .recent {
        max-width: 760px;
        margin: 0 auto 56px;
      }
      .recent__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding-bottom: 14px;
        border-bottom: 1px solid var(--rule);
        margin-bottom: 8px;
      }
      .more {
        font-family: var(--font-display);
        font-style: italic;
        color: var(--ink-500);
        font-size: var(--fs-14);
      }
      .loading,
      .empty {
        padding: 24px 0;
        text-align: center;
        color: var(--ink-400);
        font-style: italic;
      }
      .recent__list { display: flex; flex-direction: column; }
      .recent__item {
        border-bottom: 1px solid var(--rule);
      }
      .recent__item a {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 16px;
        align-items: baseline;
        padding: 16px 4px;
        color: inherit;
        border-bottom: none;
        transition: background 120ms var(--ease-out);
      }
      .recent__item a:hover {
        background: var(--paper-100);
        border-bottom: none;
      }
      .recent__q {
        font-family: var(--font-display);
        font-style: italic;
        font-size: var(--fs-20);
        color: var(--ink-900);
        line-height: 1.2;
      }
      .recent__meta {
        display: inline-flex;
        align-items: center;
        gap: 14px;
        color: var(--ink-500);
        font-size: var(--fs-12);
        font-family: var(--font-mono);
        letter-spacing: 0.04em;
      }
      .prompts {
        max-width: 760px;
        margin: 0 auto 80px;
        text-align: center;
      }
      .prompts__chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
        margin-top: 14px;
      }
      .prompts__chips a { border-bottom: none; }
      .prompts__chips a:hover { border-bottom: none; }

      @media (max-width: 640px) {
        :host { padding-top: 24px; }
        .hero { padding-bottom: 40px; }
        .search { height: 56px; padding: 0 16px; gap: 10px; }
        .search input { font-size: var(--fs-16); }
        .search button { width: 38px; height: 38px; }
        .mode { gap: 10px; }
        .recent__item a {
          grid-template-columns: 1fr;
          gap: 8px;
        }
        .recent__q { font-size: var(--fs-18); }
        .recent__meta {
          flex-wrap: wrap;
          gap: 8px 10px;
        }
      }
    `,
  ],
})
export class SearchHomePage implements OnInit {
  private svc = inject(SearchService);
  private router = inject(Router);

  query = '';
  mode = signal<SearchMode>('hybrid');
  history = signal<SearchQuery[]>([]);
  loading = signal(true);

  modes = [
    { value: 'keyword' as const, label: 'Từ khóa', description: 'BM25' },
    { value: 'semantic' as const, label: 'Ngữ nghĩa', description: 'vector' },
    { value: 'hybrid' as const, label: 'Kết hợp', description: 'rerank' },
  ];

  suggestions = [
    'pgvector benchmark',
    'embedding tiếng Việt',
    'kiến trúc hexagonal',
    'RAG faithfulness',
    'angular 21 signals',
    'luận văn chấm điểm tự động',
  ];

  async ngOnInit() {
    try {
      this.history.set(await this.svc.history());
    } finally {
      this.loading.set(false);
    }
  }

  run(e: Event) {
    e.preventDefault();
    const q = this.query.trim();
    if (!q) return;
    this.router.navigate(['/search/results'], { queryParams: { q, mode: this.mode() } });
  }

  modeLabel(m: SearchMode): string {
    return m === 'keyword' ? 'từ khóa' : m === 'semantic' ? 'ngữ nghĩa' : 'kết hợp';
  }
}
