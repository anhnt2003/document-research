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
      <span class="eyebrow reveal"><span class="num">№ I</span> · TÌM KIẾM</span>
      <h1 class="display reveal reveal-delay-1">
        Đặt một câu hỏi, <em>kho lưu trữ</em> sẽ đọc giúp bạn.
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
        <button type="submit" aria-label="Tra cứu">Tra cứu</button>
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

      <div class="prompts__chips prompts__chips--hero reveal reveal-delay-4">
        <span class="chips__lbl mono">Gợi ý</span>
        @for (p of suggestions; track p) {
          <a
            class="chip"
            [routerLink]="['/search/results']"
            [queryParams]="{ q: p, mode: 'hybrid' }"
            >{{ p }}</a
          >
        }
      </div>
    </div>

    <section class="recent">
      <div class="section-rule">
        <h3>Truy vấn gần đây</h3>
        <span class="line"></span>
        <a routerLink="/search/history" class="more">Toàn bộ lịch sử →</a>
      </div>

      @if (loading()) {
        <p class="loading mono">đang tải lịch sử…</p>
      } @else if (history().length === 0) {
        <p class="empty">Chưa có truy vấn nào. Hãy bắt đầu bằng câu hỏi của bạn ở trên.</p>
      } @else {
        <ul class="recent__list">
          @for (h of history().slice(0, 6); track h.id; let i = $index) {
            <li class="recent__item reveal" [style.animation-delay.ms]="80 + i * 40">
              <a [routerLink]="['/search/results']" [queryParams]="{ q: h.q, mode: h.mode }">
                <span class="recent__main">
                  <span class="recent__q">{{ h.q }}</span>
                  <span class="recent__meta">
                    <ui-tag color="ink">{{ modeLabel(h.mode) }}</ui-tag>
                    <span class="mono">{{ h.resultCount }} kết quả · {{ h.durationMs }}ms</span>
                  </span>
                </span>
                <span class="recent__side">
                  <span class="recent__time mono">{{ h.executedAt | relativeDate }}</span>
                  <span class="recent__replay mono">↻ Chạy lại</span>
                </span>
              </a>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        padding-top: 40px;
      }
      .hero {
        position: relative;
        max-width: 960px;
        margin: 0 auto 40px;
        padding: 56px clamp(28px, 5vw, 68px) 48px;
        background: linear-gradient(160deg, var(--surface) 0%, var(--surface-2) 100%);
        border: 1px solid var(--line);
        border-radius: var(--r-xl);
        box-shadow: var(--sh-3);
        overflow: hidden;
      }
      .hero::after {
        content: '❦';
        position: absolute;
        right: 6%;
        top: 50%;
        transform: translateY(-50%);
        font-family: var(--serif);
        font-size: 230px;
        line-height: 1;
        color: var(--accent);
        opacity: 0.05;
        pointer-events: none;
      }
      .hero > * {
        position: relative;
        z-index: 1;
      }
      .eyebrow {
        font-family: var(--mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--accent-700);
        display: inline-flex;
        align-items: center;
        gap: 9px;
        margin-bottom: 18px;
      }
      .eyebrow .num {
        color: var(--ink-400);
      }
      h1.display {
        font-family: var(--serif);
        font-size: clamp(34px, 5.2vw, 56px);
        font-weight: 500;
        letter-spacing: -0.025em;
        line-height: 1.04;
        max-width: 18ch;
        margin: 0;
      }
      h1 em {
        font-style: italic;
        color: var(--accent);
      }
      .lede {
        max-width: 54ch;
        margin: 16px 0 0;
        color: var(--ink-500);
        font-size: 17px;
        line-height: 1.55;
      }
      .search {
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 760px;
        margin-top: 34px;
        background: var(--surface);
        border: 1px solid var(--line);
        padding: 9px 9px 9px 24px;
        border-radius: var(--r-pill);
        box-shadow: var(--sh-2);
        transition: box-shadow 220ms var(--ease-out), border-color 220ms var(--ease-out),
          transform 220ms var(--ease-out);
      }
      .search:focus-within {
        border-color: var(--accent-100);
        box-shadow: var(--sh-3), 0 0 0 5px var(--accent-50);
        transform: translateY(-1px);
      }
      .search__glyph {
        font-family: var(--serif);
        color: var(--accent);
        font-size: 22px;
        flex: 0 0 auto;
      }
      .search input {
        flex: 1;
        min-width: 0;
        background: transparent;
        border: none;
        outline: none;
        font-family: var(--serif);
        font-size: 18px;
        color: var(--ink-900);
      }
      .search input::placeholder {
        color: var(--ink-300);
        font-style: italic;
      }
      .search button {
        height: 46px;
        padding: 0 26px;
        flex: 0 0 auto;
        background: var(--accent);
        color: #fff;
        font-weight: 600;
        font-size: 15px;
        border-radius: var(--r-pill);
        box-shadow: var(--sh-accent);
        transition: background 180ms var(--ease-out), transform 160ms var(--ease-out);
      }
      .search button:hover {
        background: var(--accent-700);
        transform: translateY(-1px);
      }
      .search button:active {
        transform: translateY(0);
      }
      .mode {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-top: 22px;
        flex-wrap: wrap;
      }
      .mode__hint {
        font-size: 12px;
        color: var(--ink-500);
        font-style: italic;
        letter-spacing: 0.04em;
        font-family: var(--sans);
      }
      .prompts__chips--hero {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
        align-items: center;
        margin-top: 24px;
      }
      .chips__lbl {
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--ink-400);
        margin-right: 4px;
      }
      .chip {
        padding: 7px 15px;
        border-radius: var(--r-pill);
        background: var(--surface);
        border: 1px solid var(--line);
        font-size: 13px;
        color: var(--ink-700);
        font-family: var(--serif);
        font-style: italic;
        transition: transform 160ms var(--ease-out), box-shadow 200ms var(--ease-out),
          color 180ms var(--ease-out), border-color 180ms var(--ease-out);
      }
      .chip:hover {
        transform: translateY(-1px);
        box-shadow: var(--sh-2);
        color: var(--accent-700);
        border-color: var(--accent-100);
      }
      .recent {
        max-width: 960px;
        margin: 0 auto 64px;
      }
      .section-rule {
        display: flex;
        align-items: center;
        gap: 14px;
        margin: 42px 0 18px;
      }
      .section-rule h3 {
        font-family: var(--serif);
        font-weight: 600;
        font-size: 21px;
        letter-spacing: -0.01em;
      }
      .section-rule .line {
        flex: 1;
        height: 1px;
        background: var(--line);
      }
      .more {
        font-family: var(--mono);
        font-size: 12px;
        color: var(--ink-400);
        white-space: nowrap;
        transition: color 160ms var(--ease-out);
      }
      .more:hover {
        color: var(--accent-700);
      }
      .loading,
      .empty {
        padding: 24px 0;
        text-align: center;
        color: var(--ink-400);
        font-style: italic;
      }
      .recent__list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .recent__item a {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 20px;
        padding: 18px 22px;
        color: inherit;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--r-lg);
        box-shadow: var(--sh-1);
        transition: transform 180ms var(--ease-out), box-shadow 220ms var(--ease-out);
      }
      .recent__item a:hover {
        transform: translateY(-2px);
        box-shadow: var(--sh-3);
      }
      .recent__main {
        display: block;
        min-width: 0;
      }
      .recent__q {
        display: block;
        font-family: var(--serif);
        font-style: italic;
        font-size: 18px;
        color: var(--ink-900);
        line-height: 1.25;
      }
      .recent__meta {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        margin-top: 7px;
        color: var(--ink-400);
        font-size: 11.5px;
        font-family: var(--mono);
        letter-spacing: 0.04em;
        flex-wrap: wrap;
      }
      .recent__side {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        flex: 0 0 auto;
      }
      .recent__time {
        font-size: 11px;
        color: var(--ink-400);
      }
      .recent__replay {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 13px;
        border-radius: var(--r-pill);
        background: var(--bg-2);
        font-size: 12.5px;
        font-weight: 600;
        color: var(--ink-700);
        transition: background 180ms var(--ease-out), color 180ms var(--ease-out);
      }
      .recent__item a:hover .recent__replay {
        background: var(--accent);
        color: #fff;
      }

      @media (max-width: 640px) {
        :host { padding-top: 24px; }
        .hero { padding: 40px 24px 36px; }
        .search {
          padding: 8px 8px 8px 16px;
          gap: 10px;
        }
        .search input { font-size: var(--fs-16); }
        .search button { padding: 0 18px; }
        .mode { gap: 10px; }
        .recent__item a {
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .recent__side {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
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
