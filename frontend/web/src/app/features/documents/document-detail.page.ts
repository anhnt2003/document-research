import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { DocumentDto } from '../../core/models';
import { DocumentsService } from './documents.service';
import { UiButton } from '../../shared/ui/button/button';
import { UiOrnament } from '../../shared/ui/ornament/ornament';
import { UiEmptyState } from '../../shared/ui/empty-state/empty-state';
import { formatDateLong } from '../../core/util/date';

@Component({
  selector: 'document-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, UiButton, UiOrnament, UiEmptyState],
  template: `
    @if (doc(); as d) {
      <article class="page reveal" data-testid="document-detail">
        <header class="head">
          <a routerLink="/documents" class="crumb">← Kho tài liệu</a>
          <div class="head__inner">
            <span class="eyebrow mono">{{ d.id }}</span>
            <h1 class="title">{{ d.title }}</h1>
            <div class="head__meta mono">
              <span>{{ formatDateLong(d.createdAt) }}</span>
            </div>
          </div>
        </header>

        <ui-ornament glyph="❧" />

        <section class="content">
          <h2 class="content__h2">Nội dung</h2>
          <p class="body__p" data-testid="document-body">{{ d.body }}</p>
        </section>
      </article>
    } @else if (loading()) {
      <p class="loading mono">đang tải…</p>
    } @else {
      <ui-empty-state
        glyph="✺"
        title="Không tìm thấy tài liệu"
        description="Tài liệu có thể đã bị gỡ, đổi vị trí, hoặc bạn nhập sai mã. Quay lại kho lưu trữ để tiếp tục tra cứu."
      >
        <a routerLink="/documents">
          <button ui-button>Về kho tài liệu</button>
        </a>
        <a routerLink="/search">
          <button ui-button variant="outline">Tra cứu</button>
        </a>
      </ui-empty-state>
    }
  `,
  styles: [
    `
      :host { display: block; padding-top: 24px; }
      .crumb {
        font-family: var(--font-display);
        font-style: italic;
        color: var(--ink-500);
        font-size: var(--fs-14);
        display: inline-block;
        margin-bottom: 20px;
      }
      .head {
        display: grid;
        grid-template-columns: 1fr;
        gap: 24px;
        padding-bottom: 32px;
      }
      .eyebrow {
        font-size: var(--fs-12);
        color: var(--ink-500);
        letter-spacing: 0.08em;
      }
      .title {
        font-family: var(--font-display);
        font-size: var(--fs-44);
        line-height: 1.05;
        margin: 8px 0 12px;
      }
      .head__meta {
        display: flex;
        gap: 12px;
        font-size: var(--fs-13);
        color: var(--ink-500);
      }
      .content__h2 {
        font-family: var(--font-display);
        font-style: italic;
        font-size: var(--fs-28);
        margin: 24px 0 12px;
      }
      .body__p {
        font-size: var(--fs-17);
        line-height: 1.65;
        color: var(--ink-800);
        white-space: pre-wrap;
      }
      .loading { padding: 64px; text-align: center; color: var(--ink-400); }
    `,
  ],
})
export class DocumentDetailPage implements OnInit {
  private svc = inject(DocumentsService);
  private route = inject(ActivatedRoute);

  doc = signal<DocumentDto | null>(null);
  loading = signal(true);

  formatDateLong = formatDateLong;

  ngOnInit() {
    this.route.paramMap.subscribe(async (p) => {
      const id = p.get('id');
      if (!id) return;
      await this.load(id);
    });
  }

  async load(id: string) {
    this.loading.set(true);
    try {
      this.doc.set(await this.svc.get(id));
    } catch {
      this.doc.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
