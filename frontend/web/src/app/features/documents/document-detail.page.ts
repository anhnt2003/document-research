import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { DocumentDto, Tag } from '../../core/models';
import { DocumentsService } from './documents.service';
import { UiButton } from '../../shared/ui/button/button';
import { UiOrnament } from '../../shared/ui/ornament/ornament';
import { UiEmptyState } from '../../shared/ui/empty-state/empty-state';
import { UiTagPicker } from '../../shared/ui/tag-picker/tag-picker';
import { AuthStore } from '../../core/auth/auth.store';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { formatDateLong } from '../../core/util/date';

@Component({
  selector: 'document-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, UiButton, UiOrnament, UiEmptyState, UiTagPicker],
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

        <section class="tags" data-testid="document-tags">
          <span class="eyebrow mono">§ Tag</span>
          <ui-tag-picker
            [availableTags]="allTags()"
            [selectedIds]="docTagIds()"
            [editable]="canWrite()"
            (add)="attachTag($event)"
            (remove)="detachTag($event)"
          ></ui-tag-picker>
        </section>

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
      .page {
        max-width: 880px;
      }
      .crumb {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: var(--serif);
        font-style: italic;
        color: var(--ink-500);
        font-size: var(--fs-14);
        padding: 6px 14px;
        border-radius: var(--r-pill);
        background: var(--surface);
        border: 1px solid var(--line);
        box-shadow: var(--sh-1);
        margin-bottom: 24px;
        transition: color 180ms var(--ease-out), border-color 180ms var(--ease-out);
      }
      .crumb:hover { color: var(--accent-700); border-color: var(--accent-100); }
      .head {
        display: grid;
        grid-template-columns: 1fr;
        gap: 24px;
        padding-bottom: 32px;
      }
      .eyebrow {
        font-family: var(--mono);
        font-size: var(--fs-12);
        color: var(--accent-700);
        letter-spacing: 0.13em;
        text-transform: uppercase;
      }
      .title {
        font-family: var(--serif);
        font-weight: 600;
        font-size: clamp(30px, 4vw, 42px);
        letter-spacing: -0.02em;
        line-height: 1.05;
        margin: 10px 0 12px;
      }
      .head__meta {
        display: flex;
        gap: 12px;
        font-family: var(--mono);
        font-size: var(--fs-13);
        color: var(--ink-400);
      }
      .tags,
      .shares,
      .content {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--r-lg);
        box-shadow: var(--sh-2);
        padding: 24px 26px;
      }
      .tags { margin: 12px 0 18px; }
      .shares { margin: 0 0 18px; }
      .tags .eyebrow,
      .shares .eyebrow {
        display: block;
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--ink-400);
        margin-bottom: 12px;
      }
      .content { margin-top: 8px; }
      .content__h2 {
        font-family: var(--serif);
        font-weight: 600;
        font-size: 24px;
        letter-spacing: -0.01em;
        margin: 0 0 14px;
      }
      .content__h2 em { font-style: italic; color: var(--accent); }
      .body__p {
        font-family: var(--serif);
        font-size: 16px;
        line-height: 1.72;
        color: var(--ink-700);
        white-space: pre-wrap;
      }
      .loading { padding: 64px; text-align: center; color: var(--ink-400); }
      @media (max-width: 720px) {
        .tags,
        .shares,
        .content { padding: 20px; }
      }
    `,
  ],
})
export class DocumentDetailPage implements OnInit {
  private svc = inject(DocumentsService);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthStore);
  private toast = inject(ToastService);

  doc = signal<DocumentDto | null>(null);
  loading = signal(true);
  allTags = signal<Tag[]>([]);
  docTags = signal<Tag[]>([]);
  docTagIds = computed(() => this.docTags().map((t) => t.id));

  canWrite = computed(() => {
    const d = this.doc();
    return d ? this.auth.canEditDocument(d) : false;
  });

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
      const [doc, allTags, docTags] = await Promise.all([
        this.svc.get(id),
        this.svc.tags(),
        this.svc.documentTags(id).catch(() => [] as Tag[]),
      ]);
      this.doc.set(doc);
      this.allTags.set(allTags);
      this.docTags.set(docTags);
    } catch {
      this.doc.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async attachTag(tagId: string) {
    const d = this.doc();
    if (!d) return;
    try {
      await this.svc.attachTags(d.id, [tagId]);
      this.docTags.set(await this.svc.documentTags(d.id));
    } catch (e) {
      this.toast.error(this.errMessage(e));
    }
  }

  async detachTag(tagId: string) {
    const d = this.doc();
    if (!d) return;
    try {
      await this.svc.detachTag(d.id, tagId);
      this.docTags.set(await this.svc.documentTags(d.id));
    } catch (e) {
      this.toast.error(this.errMessage(e));
    }
  }

  private errMessage(e: unknown): string {
    if (typeof e === 'object' && e !== null && 'error' in e) {
      const body = (e as { error: { detail?: string; title?: string } | undefined }).error;
      if (body && typeof body === 'object') {
        return body.detail ?? body.title ?? 'Đã có lỗi xảy ra.';
      }
    }
    return 'Đã có lỗi xảy ra.';
  }
}
