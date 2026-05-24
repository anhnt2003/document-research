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
          {{ results().length }} kết quả · {{ durationMs() }}ms · chế độ {{ modeLabel() }}
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
                    score {{ (r.score * 100).toFixed(0) }}
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
      :host { display: block; padding-top: 40px; }
      .hero { padding-bottom: 20px; border-bottom: 1px solid var(--rule); margin-bottom: 24px; }
      .bar {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        gap: 12px;
        align-items: center;
        background: var(--paper-50);
        border: 1px solid var(--rule-strong);
        padding: 0 20px;
        height: 56px;
      }
      .bar:focus-within { border-color: var(--ink-900); }
      .bar__glyph {
        font-family: var(--font-display);
        font-style: italic;
        color: var(--ink-400);
        font-size: var(--fs-20);
      }
      .bar input {
        background: transparent;
        border: none;
        outline: none;
        font-size: var(--fs-16);
        font-family: var(--font-body);
        color: var(--ink-900);
        min-width: 0;
      }
      .bar input::placeholder { color: var(--ink-400); font-style: italic; }
      .meta {
        margin-top: 12px;
        font-size: var(--fs-12);
        color: var(--ink-500);
        letter-spacing: 0.06em;
      }
      .grid {
        display: grid;
        grid-template-columns: 220px 1fr 320px;
        gap: 40px;
      }
      .rail .eyebrow {
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--ink-500);
        display: block;
        margin-bottom: 16px;
      }
      .rail__title {
        font-family: var(--font-display);
        font-style: italic;
        font-size: var(--fs-16);
        color: var(--ink-800);
        margin: 22px 0 10px;
      }
      .chips { display: flex; flex-direction: column; gap: 1px; }
      .chip {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 8px 8px;
        font-size: var(--fs-14);
        color: var(--ink-700);
        border-radius: var(--radius-sm);
        transition: background 120ms var(--ease-out);
      }
      .chip:hover { background: var(--paper-100); }
      .chip.is-active {
        background: var(--ink-900);
        color: var(--paper-50);
      }
      .chip.is-active .chip__count { color: var(--paper-200); }
      .chip__count {
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        min-width: 28px;
        text-align: right;
        color: var(--ink-400);
      }
      .select {
        width: 100%;
        font: inherit;
        padding: 8px 12px;
        border: 1px solid var(--rule-strong);
        background: var(--paper-50);
        border-radius: var(--radius-sm);
      }
      .rail__foot { margin-top: 22px; }
      .loading, .empty {
        padding: 48px 16px;
        text-align: center;
        color: var(--ink-500);
      }
      .empty .glyph {
        font-family: var(--font-display);
        font-style: italic;
        font-size: 64px;
        color: var(--rule-strong);
        display: block;
        margin-bottom: 12px;
      }
      .empty .hint { margin-top: 8px; font-style: italic; color: var(--ink-400); }
      .list { display: flex; flex-direction: column; }
      .result {
        padding: 22px 0;
        border-bottom: 1px solid var(--rule);
      }
      .result:first-child { padding-top: 4px; }
      .result__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 8px;
      }
      .sig {
        font-size: var(--fs-12);
        color: var(--oxblood);
        letter-spacing: 0.1em;
      }
      .score {
        font-size: var(--fs-12);
        color: var(--ink-500);
        letter-spacing: 0.06em;
      }
      .result__title {
        font-family: var(--font-display);
        font-size: var(--fs-24);
        font-weight: 400;
        font-variation-settings: 'opsz' 48, 'SOFT' 50;
        letter-spacing: -0.015em;
        line-height: 1.2;
        margin: 0 0 8px;
      }
      .result__title a {
        color: var(--ink-900);
        border-bottom: none;
      }
      .result__title a:hover { color: var(--oxblood); border-bottom: none; }
      .result__snippet {
        color: var(--ink-700);
        line-height: 1.55;
        font-size: var(--fs-15);
        margin-bottom: 12px;
      }
      .result__foot {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        font-size: var(--fs-12);
        color: var(--ink-500);
      }
      .result__foot .mono { letter-spacing: 0.04em; }
      .dot { color: var(--ink-300); }
      .answer {
        position: sticky;
        top: 80px;
        align-self: flex-start;
        background: var(--moss-soft);
        border: 1px solid var(--rule);
        border-left: 2px solid var(--moss);
        max-height: calc(100vh - 120px);
        overflow-y: auto;
      }
      .answer__toggle {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 12px 16px;
        color: var(--ink-700);
        border-bottom: 1px solid var(--rule);
      }
      .answer__eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--moss);
      }
      .answer__glyph {
        font-family: var(--font-display);
        font-style: italic;
        font-size: var(--fs-18);
        color: var(--moss);
        line-height: 1;
      }
      .answer__caret {
        font-family: var(--font-mono);
        color: var(--ink-500);
        font-size: var(--fs-16);
      }
      .answer__body {
        padding: 16px;
      }
      .answer__body p {
        font-size: var(--fs-14);
        line-height: 1.6;
        color: var(--ink-700);
        margin-bottom: 8px;
      }
      .answer__cite-title {
        font-family: var(--font-display);
        font-style: italic;
        font-size: var(--fs-15);
        color: var(--ink-700);
        margin: 18px 0 8px;
      }
      .cites { display: flex; flex-direction: column; gap: 14px; }
      .cite-num {
        font-family: var(--font-mono);
        color: var(--oxblood);
        font-size: var(--fs-12);
        margin-right: 6px;
      }
      .cite-quote {
        font-style: italic;
        font-size: var(--fs-13);
        color: var(--ink-500);
        margin-top: 2px;
      }
      .answer__hint {
        padding: 16px;
        color: var(--ink-500);
        font-size: var(--fs-13);
        font-style: italic;
      }

      @media (max-width: 1100px) {
        .grid { grid-template-columns: 1fr; }
        .answer { position: static; }
        .rail { display: none; }
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
