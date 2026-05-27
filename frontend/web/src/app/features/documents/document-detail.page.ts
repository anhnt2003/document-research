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
      .tags { margin: 12px 0 16px; }
      .tags .eyebrow {
        display: block;
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--ink-500);
        margin-bottom: 8px;
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
    const perms = this.auth.permissions();
    return perms.has('*') || perms.has('tags:write');
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
