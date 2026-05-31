import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { DocumentItem, SearchAnswer, SearchMode, SearchResult } from '../../core/models';
import { SearchService } from './search.service';
import { DocumentsService } from '../documents/documents.service';
import { UiSegmented } from '../../shared/ui/segmented/segmented';
import { UiTag } from '../../shared/ui/tag/tag';
import { UiButton } from '../../shared/ui/button/button';
import { SafeHtmlPipe } from '../../shared/pipes/safe-html.pipe';
import { formatDate, formatBytes } from '../../core/util/date';

interface ResultRow extends SearchResult {
  doc: DocumentItem;
}

@Component({
  selector: 'search-results-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, UiSegmented, UiTag, UiButton, SafeHtmlPipe],
  template: `
    <header class="hero">
      <form class="bar" (submit)="rerun($event)">
        <span class="bar__glyph">¶</span>
        <input
          type="search"
          name="q"
          [(ngModel)]="query"
          placeholder="Tra cứu…"
          autocomplete="off"
        />
        <ui-segmented
          [options]="modes"
          [value]="mode()"
          (valueChange)="mode.set($event)"
        />
        <button ui-button type="submit">Tìm</button>
      </form>
      @if (!loading()) {
        <p class="meta mono">
          <span class="meta__pulse" aria-hidden="true"></span>
          {{ results().length }} kết quả · {{ durationMs() }}ms · chế độ
          <strong>{{ modeLabel() }}</strong>
        </p>
      }
    </header>

    <div class="grid">
      <aside class="rail">
        <span class="eyebrow">Lọc</span>
        <h4 class="rail__title">Loại tài liệu</h4>
        <div class="chips">
          @for (t of typeFilters; track t.value) {
            <button
              class="chip"
              type="button"
              [class.is-active]="typeFilter() === t.value"
              (click)="setType(t.value)"
            >
              <span class="chip__count mono">{{ typeCount(t.value) }}</span>
              <span>{{ t.label }}</span>
            </button>
          }
        </div>

        <h4 class="rail__title">Sắp xếp</h4>
        <select class="select" [(ngModel)]="sortBy" name="sort">
          <option value="score">Liên quan nhất</option>
          <option value="updatedAt">Cập nhật mới</option>
          <option value="title">Tên A → Z</option>
        </select>

        <div class="rail__foot">
          <button ui-button variant="ghost" size="sm" (click)="reset()">Xóa bộ lọc</button>
        </div>
      </aside>

      <section class="results">
        @if (loading()) {
          <div class="loading">
            <span class="mono">Đang truy vấn kho lưu trữ…</span>
          </div>
        } @else if (filtered().length === 0) {
          <div class="empty">
            <span class="glyph">※</span>
            <p>Không có tài liệu nào khớp với "{{ query }}".</p>
            <p class="hint">Thử chuyển sang chế độ ngữ nghĩa hoặc mở rộng từ khóa.</p>
          </div>
        } @else {
          <ol class="list">
            @for (r of filtered(); track r.documentId; let i = $index) {
              <li class="result reveal" [style.animation-delay.ms]="60 + i * 30">
                <header class="result__head">
                  <span class="sig mono">{{ r.doc.signature }}</span>
                  <span class="score mono" [attr.data-score]="(r.score * 100).toFixed(0)">
                    <span class="score__bar" aria-hidden="true">
                      <i [style.width.%]="r.score * 100"></i>
                    </span>
                    <span class="score__v">{{ (r.score * 100).toFixed(0) }}</span>
                  </span>
                </header>
                <h3 class="result__title">
                  <a [routerLink]="['/documents', r.doc.id]">
                    <span [innerHTML]="r.highlights[0].snippet | safeHtml"></span>
                  </a>
                </h3>
                <p class="result__snippet" [innerHTML]="r.highlights[1].snippet | safeHtml"></p>
                <footer class="result__foot">
                  <ui-tag color="ink">{{ r.doc.type.toUpperCase() }}</ui-tag>
                  @if (r.doc.pageCount) {
                    <span class="mono">{{ r.doc.pageCount }} trang</span>
                  }
                  @if (r.doc.sizeBytes > 0) {
                    <span class="mono">{{ formatSize(r.doc.sizeBytes) }}</span>
                  }
                  <span class="mono">{{ formatDate(r.doc.updatedAt) }}</span>
                  <span class="dot">·</span>
                  @for (tagId of r.doc.tagIds.slice(0, 3); track tagId) {
                    <ui-tag color="amber">{{ tagLabel(tagId) }}</ui-tag>
                  }
                </footer>
              </li>
            }
          </ol>
        }
      </section>

      <aside class="answer" [class.is-collapsed]="!answerOpen()">
        <button class="answer__toggle" type="button" (click)="toggleAnswer()" [attr.aria-expanded]="answerOpen()">
          <span class="answer__eyebrow">
            <span class="answer__glyph" aria-hidden="true">❦</span>
            <span class="mono">TÓM TẮT TỪ LLM</span>
          </span>
          <span class="answer__caret">{{ answerOpen() ? '–' : '+' }}</span>
        </button>
        @if (answerOpen()) {
          @if (answer(); as ans) {
            <div class="answer__body">
              @for (line of ans.text.split('\\n'); track line) {
                <p>{{ line }}</p>
              }
              @if (ans.citations.length) {
                <h5 class="answer__cite-title">Trích dẫn</h5>
                <ul class="cites">
                  @for (c of ans.citations; track c.index) {
                    <li>
                      <span class="cite-num">[{{ c.index }}]</span>
                      <a [routerLink]="['/documents', c.documentId]">{{ docTitle(c.documentId) }}</a>
                      <p class="cite-quote">"{{ c.quote }}…"</p>
                    </li>
                  }
                </ul>
              }
            </div>
          } @else {
            <p class="answer__hint">
              Chế độ "Từ khóa" không sinh tổng hợp. Chuyển sang "Ngữ nghĩa" hoặc "Kết hợp"
              để xem câu trả lời tổng hợp kèm trích dẫn.
            </p>
          }
        }
      </aside>
    </div>
  `,
  styles: [
    `
      :host { display: block; padding-top: 34px; }
      .hero { margin-bottom: 26px; }
      .bar {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        gap: 12px;
        align-items: center;
        background: var(--surface);
        border: 1px solid var(--line);
        padding: 9px 9px 9px 22px;
        border-radius: var(--r-pill);
        box-shadow: var(--sh-2);
        margin-bottom: 10px;
        transition: box-shadow 200ms var(--ease-out), border-color 200ms var(--ease-out);
      }
      .bar:focus-within {
        border-color: var(--accent-100);
        box-shadow: var(--sh-3), 0 0 0 4px var(--accent-50);
      }
      .bar__glyph {
        font-family: var(--serif);
        color: var(--accent);
        font-size: 20px;
      }
      .bar input {
        background: transparent;
        border: none;
        outline: none;
        font-size: 16px;
        font-family: var(--serif);
        color: var(--ink-900);
        min-width: 0;
      }
      .bar input::placeholder { color: var(--ink-300); font-style: italic; }
      .meta {
        margin: 0 0 0 22px;
        font-size: 12px;
        color: var(--ink-500);
        letter-spacing: 0.02em;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .meta strong { color: var(--accent-700); font-weight: 600; }
      .meta__pulse {
        width: 7px;
        height: 7px;
        border-radius: var(--r-pill);
        background: var(--sage);
        box-shadow: 0 0 0 3px var(--sage-100);
        flex: 0 0 auto;
      }
      .grid {
        display: grid;
        grid-template-columns: 220px 1fr 350px;
        gap: 26px;
        align-items: start;
        margin-top: 26px;
      }
      .rail {
        position: sticky;
        top: 14px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .rail .eyebrow {
        font-family: var(--mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--ink-400);
        display: block;
      }
      .rail__title {
        font-family: var(--mono);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--ink-400);
        margin: 10px 0 6px;
      }
      .chips { display: flex; flex-direction: column; gap: 7px; }
      .chip {
        display: flex;
        gap: 10px;
        align-items: center;
        justify-content: space-between;
        padding: 9px 14px;
        font-size: 13.5px;
        font-weight: 500;
        color: var(--ink-700);
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--r-sm);
        box-shadow: var(--sh-1);
        transition: background 180ms var(--ease-out), color 180ms var(--ease-out),
          border-color 180ms var(--ease-out), transform 150ms var(--ease-out);
      }
      .chip:hover { transform: translateX(2px); border-color: var(--accent-100); }
      .chip.is-active {
        background: var(--ink-900);
        color: var(--bg);
        border-color: var(--ink-900);
      }
      .chip.is-active .chip__count { color: var(--ink-300); }
      .chip__count {
        font-family: var(--mono);
        font-size: 11px;
        min-width: 24px;
        text-align: right;
        color: var(--ink-400);
        order: 2;
      }
      .select {
        width: 100%;
        font: inherit;
        padding: 10px 36px 10px 14px;
        border: 1px solid var(--line);
        background: var(--surface);
        border-radius: var(--r-sm);
        box-shadow: var(--sh-1);
        font-size: 13.5px;
        color: var(--ink-700);
        cursor: pointer;
        -webkit-appearance: none;
        appearance: none;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' stroke='%236f6757' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>");
        background-repeat: no-repeat;
        background-position: right 13px center;
      }
      .select:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
      .rail__foot { margin-top: 10px; }
      .loading, .empty {
        padding: 64px 16px;
        text-align: center;
        color: var(--ink-500);
      }
      .empty .glyph {
        font-family: var(--serif);
        font-style: italic;
        font-size: 80px;
        color: var(--accent);
        opacity: 0.3;
        display: block;
        line-height: 1;
        margin-bottom: 12px;
      }
      .empty .hint { margin-top: 8px; font-style: italic; color: var(--ink-400); }
      .list { display: flex; flex-direction: column; gap: 16px; }
      .result {
        padding: 24px 26px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--r-lg);
        box-shadow: var(--sh-2);
        transition: transform 200ms var(--ease-out), box-shadow 240ms var(--ease-out);
      }
      .result:hover { transform: translateY(-3px); box-shadow: var(--sh-3); }
      .result__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        margin-bottom: 10px;
      }
      .sig {
        font-size: 12px;
        color: var(--clay);
        letter-spacing: 0.02em;
      }
      .score {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }
      .score__bar {
        width: 60px;
        height: 5px;
        border-radius: var(--r-pill);
        background: var(--bg-2);
        overflow: hidden;
      }
      .score__bar i {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, var(--accent), var(--sage));
        border-radius: var(--r-pill);
      }
      .score__v { color: var(--accent-700); font-weight: 500; }
      .result__title {
        font-family: var(--serif);
        font-size: 21px;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 1.25;
        margin: 0 0 9px;
      }
      .result__title a {
        color: var(--ink-900);
        border-bottom: none;
        transition: color 180ms var(--ease-out);
      }
      .result__title a:hover { color: var(--accent); border-bottom: none; }
      .result__snippet {
        color: var(--ink-500);
        line-height: 1.62;
        font-size: 14.5px;
        margin-bottom: 16px;
      }
      .result__snippet ::ng-deep mark,
      .result__title ::ng-deep mark {
        background: var(--amber-100);
        color: #6b4a0d;
        padding: 0.5px 3px;
        border-radius: 4px;
      }
      .result__foot {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        font-size: 11px;
        color: var(--ink-400);
        padding-top: 14px;
        border-top: 1px solid var(--line-soft);
      }
      .result__foot .mono { letter-spacing: 0.02em; }
      .dot { color: var(--ink-300); }
      .answer {
        position: sticky;
        top: 14px;
        align-self: flex-start;
        background: linear-gradient(165deg, var(--surface), var(--surface-2));
        border: 1px solid var(--accent-100);
        border-radius: var(--r-xl);
        box-shadow: var(--sh-3);
        overflow: hidden;
        max-height: calc(100vh - 120px);
      }
      .answer__toggle {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 18px 22px;
        color: var(--accent-700);
        background: var(--accent-50);
        border-bottom: 1px solid var(--accent-100);
      }
      .answer__eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-family: var(--mono);
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.13em;
        text-transform: uppercase;
        color: var(--accent-700);
      }
      .answer__glyph {
        font-family: var(--serif);
        font-size: 18px;
        color: var(--accent);
        line-height: 1;
      }
      .answer__caret {
        width: 28px;
        height: 28px;
        border-radius: 9px;
        background: var(--surface);
        box-shadow: var(--sh-1);
        display: grid;
        place-items: center;
        font-family: var(--mono);
        color: var(--accent-700);
        font-size: 16px;
      }
      .answer__body {
        padding: 22px;
        max-height: calc(100vh - 200px);
        overflow-y: auto;
      }
      .answer__body p {
        font-family: var(--serif);
        font-size: 15.5px;
        line-height: 1.72;
        color: var(--ink-700);
        margin-bottom: 14px;
      }
      .answer__cite-title {
        font-family: var(--mono);
        font-size: 10px;
        letter-spacing: 0.13em;
        text-transform: uppercase;
        color: var(--ink-400);
        margin: 18px 0 12px;
        padding-top: 18px;
        border-top: 1px dashed var(--line);
      }
      .cites { display: flex; flex-direction: column; gap: 12px; }
      .cites li {
        display: grid;
        grid-template-columns: 24px 1fr;
        gap: 8px;
        align-items: start;
      }
      .cite-num {
        font-family: var(--mono);
        color: var(--clay);
        font-size: 12px;
        font-weight: 500;
      }
      .cites li a {
        font-size: 13px;
        font-weight: 600;
        color: var(--ink-900);
        border-bottom: none;
        transition: color 180ms var(--ease-out);
      }
      .cites li a:hover { color: var(--accent); border-bottom: none; }
      .cite-quote {
        font-family: var(--serif);
        font-style: italic;
        font-size: 13px;
        color: var(--ink-500);
        line-height: 1.5;
        margin-top: 3px;
      }
      .answer__hint {
        padding: 22px;
        color: var(--ink-500);
        font-size: 13px;
        font-style: italic;
        line-height: 1.6;
      }

      @media (max-width: 1180px) {
        .grid { grid-template-columns: 1fr; }
        .answer { position: static; order: -1; }
        .rail { position: static; }
      }
      @media (max-width: 760px) {
        .bar { grid-template-columns: auto 1fr; }
        .bar ui-segmented,
        .bar [ui-button] { grid-column: 1 / -1; }
        .meta { margin-left: 8px; }
      }
    `,
  ],
})
export class SearchResultsPage implements OnInit {
  private svc = inject(SearchService);
  private docs = inject(DocumentsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  query = '';
  mode = signal<SearchMode>('hybrid');
  results = signal<ResultRow[]>([]);
  answer = signal<SearchAnswer | null>(null);
  durationMs = signal(0);
  loading = signal(true);
  answerOpen = signal(true);
  typeFilter = signal<string>('');
  sortBy = 'score';
  tagMap = new Map<string, string>();

  typeFilters = [
    { value: '', label: 'Tất cả' },
    { value: 'pdf', label: 'PDF' },
    { value: 'docx', label: 'Word' },
    { value: 'md', label: 'Markdown' },
    { value: 'link', label: 'Liên kết' },
  ];

  modes = [
    { value: 'keyword' as const, label: 'Từ khóa' },
    { value: 'semantic' as const, label: 'Ngữ nghĩa' },
    { value: 'hybrid' as const, label: 'Kết hợp' },
  ];

  filtered = computed(() => {
    let rows = this.results();
    const t = this.typeFilter();
    if (t) rows = rows.filter((r) => r.doc.type === t);
    if (this.sortBy === 'updatedAt') {
      rows = [...rows].sort((a, b) => b.doc.updatedAt.localeCompare(a.doc.updatedAt));
    } else if (this.sortBy === 'title') {
      rows = [...rows].sort((a, b) => a.doc.title.localeCompare(b.doc.title, 'vi'));
    }
    return rows;
  });

  async ngOnInit() {
    this.route.queryParamMap.subscribe(async (p) => {
      this.query = p.get('q') ?? '';
      const m = (p.get('mode') as SearchMode) ?? 'hybrid';
      this.mode.set(m);
      await this.fetch();
    });
    const tags = await this.docs.tags();
    this.tagMap = new Map(tags.map((t) => [t.id, t.label]));
  }

  async fetch() {
    if (!this.query) {
      this.results.set([]);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    try {
      const resp = await this.svc.search(this.query, this.mode());
      this.answer.set(resp.answer);
      this.durationMs.set(resp.durationMs);
      const docList = await this.docs.list({ pageSize: 100 });
      const docMap = new Map(docList.items.map((d) => [d.id, d]));
      this.results.set(
        resp.results
          .map((r) => ({ ...r, doc: docMap.get(r.documentId)! }))
          .filter((r) => !!r.doc)
      );
    } finally {
      this.loading.set(false);
    }
  }

  rerun(e: Event) {
    e.preventDefault();
    this.router.navigate(['/search/results'], {
      queryParams: { q: this.query, mode: this.mode() },
    });
  }

  setType(v: string) { this.typeFilter.set(v); }
  reset() { this.typeFilter.set(''); this.sortBy = 'score'; }
  toggleAnswer() { this.answerOpen.update((v) => !v); }

  typeCount(v: string): number {
    if (!v) return this.results().length;
    return this.results().filter((r) => r.doc.type === v).length;
  }

  modeLabel(): string {
    const m = this.mode();
    return m === 'keyword' ? 'từ khóa' : m === 'semantic' ? 'ngữ nghĩa' : 'kết hợp';
  }

  tagLabel(id: string): string {
    return this.tagMap.get(id) ?? id;
  }

  docTitle(id: string): string {
    return this.results().find((r) => r.documentId === id)?.doc.title ?? id;
  }

  formatSize = formatBytes;
  formatDate = formatDate;
}
