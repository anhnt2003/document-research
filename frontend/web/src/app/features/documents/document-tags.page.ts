import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';

import { CreateTagInput, Tag, TAG_COLORS, TagColor } from '../../core/models';
import { DocumentsService } from './documents.service';
import { UiPageHeader } from '../../shared/ui/page-header/page-header';
import { UiTag } from '../../shared/ui/tag/tag';
import { UiButton } from '../../shared/ui/button/button';
import { UiInput } from '../../shared/ui/input/input';
import { AuthStore } from '../../core/auth/auth.store';
import { ToastService } from '../../shared/ui/toast/toast.service';

interface TagNode {
  tag: Tag;
  children: TagNode[];
}

interface DraftTag {
  label: string;
  color: TagColor;
  parentId: string | null;
}

const EMPTY_DRAFT: DraftTag = { label: '', color: 'ink', parentId: null };

@Component({
  selector: 'document-tags-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NgTemplateOutlet, UiPageHeader, UiTag, UiButton, UiInput],
  template: `
    <ui-page-header
      eyebrow="№ II/3 · TAG & TAXONOMY"
      number="II / 3"
      title="Cấu trúc tag"
      description="Mọi tài liệu trong kho được phân loại theo cây tag hai cấp. Tag con kế thừa visibility từ cha."
    />

    <div class="grid">
      <section class="tree">
        <header class="tree__head">
          <span class="eyebrow">§ Cây tag</span>
          @if (canWrite()) {
            <button
              ui-button
              variant="outline"
              size="sm"
              type="button"
              data-testid="create-root-btn"
              (click)="openCreate(null)"
            >+ Tag gốc</button>
          }
        </header>

        @if (draftParentId() === null) {
          <ng-container *ngTemplateOutlet="draftForm; context: { $implicit: null }"></ng-container>
        }

        <div class="roots">
          @for (root of roots(); track root.tag.id) {
            <article class="root">
              <header class="root__head">
                @if (editingId() === root.tag.id) {
                  <ng-container *ngTemplateOutlet="editForm; context: { $implicit: root.tag }"></ng-container>
                } @else {
                  <ui-tag [color]="root.tag.color">{{ root.tag.label }}</ui-tag>
                  <span class="root__count mono">{{ root.tag.documentCount }} tài liệu</span>
                  @if (canWrite()) {
                    <span class="actions">
                      <button class="icon" type="button" (click)="openEdit(root.tag)" [attr.data-testid]="'edit-' + root.tag.id" aria-label="Sửa tag">✎</button>
                      <button class="icon" type="button" (click)="remove(root.tag)" [attr.data-testid]="'delete-' + root.tag.id" aria-label="Xoá tag">🗑</button>
                      <button class="icon" type="button" (click)="openCreate(root.tag.id)" [attr.data-testid]="'add-child-' + root.tag.id" aria-label="Thêm tag con">＋</button>
                    </span>
                  }
                }
              </header>

              @if (draftParentId() === root.tag.id) {
                <div class="indent">
                  <ng-container *ngTemplateOutlet="draftForm; context: { $implicit: root.tag.id }"></ng-container>
                </div>
              }

              @if (root.children.length) {
                <ul class="children">
                  @for (c of root.children; track c.tag.id) {
                    <li>
                      <span class="line">└</span>
                      @if (editingId() === c.tag.id) {
                        <ng-container *ngTemplateOutlet="editForm; context: { $implicit: c.tag }"></ng-container>
                      } @else {
                        <ui-tag [color]="c.tag.color">{{ c.tag.label }}</ui-tag>
                        <span class="children__count mono">{{ c.tag.documentCount }}</span>
                        @if (canWrite()) {
                          <span class="actions">
                            <button class="icon" type="button" (click)="openEdit(c.tag)" [attr.data-testid]="'edit-' + c.tag.id" aria-label="Sửa tag">✎</button>
                            <button class="icon" type="button" (click)="remove(c.tag)" [attr.data-testid]="'delete-' + c.tag.id" aria-label="Xoá tag">🗑</button>
                          </span>
                        }
                      }
                    </li>
                  }
                </ul>
              }
            </article>
          } @empty {
            <p class="empty mono">Chưa có tag nào.</p>
          }
        </div>
      </section>

      <aside class="aside">
        <span class="eyebrow">❧ Quy ước màu</span>
        <ul class="legend">
          <li><ui-tag color="oxblood">Chính</ui-tag><span>nhóm chủ đề chính</span></li>
          <li><ui-tag color="amber">Chuyên</ui-tag><span>chủ đề chuyên sâu</span></li>
          <li><ui-tag color="moss">Mở</ui-tag><span>tài nguyên mở</span></li>
          <li><ui-tag color="rust">Khác</ui-tag><span>chuyên ngành phụ</span></li>
          <li><ui-tag color="ink">Tổng quan</ui-tag><span>tài liệu nền tảng</span></li>
        </ul>
        @if (!canWrite()) {
          <p class="hint">Bạn chỉ có quyền xem. Liên hệ quản trị viên để chỉnh sửa cây tag.</p>
        }
      </aside>
    </div>

    <ng-template #draftForm let-parentId>
      <form class="form" (ngSubmit)="submitCreate()" data-testid="create-form">
        <input
          ui-input
          name="label"
          placeholder="Tên tag…"
          [(ngModel)]="draft().label"
          (ngModelChange)="patchDraft({ label: $event })"
          required
          data-testid="draft-label"
        />
        <div class="swatches">
          @for (c of colors; track c) {
            <button
              type="button"
              class="swatch"
              [attr.data-color]="c"
              [attr.data-active]="draft().color === c ? '' : null"
              [attr.data-testid]="'swatch-' + c"
              (click)="patchDraft({ color: c })"
            ></button>
          }
        </div>
        <button ui-button variant="primary" size="sm" type="submit" [disabled]="busy()" data-testid="submit-create">
          {{ busy() ? '…' : 'Tạo' }}
        </button>
        <button ui-button variant="ghost" size="sm" type="button" (click)="cancelDraft()">Huỷ</button>
      </form>
    </ng-template>

    <ng-template #editForm let-tag>
      <form class="form" (ngSubmit)="submitEdit(tag)" data-testid="edit-form">
        <input
          ui-input
          name="label"
          [(ngModel)]="draft().label"
          (ngModelChange)="patchDraft({ label: $event })"
          required
        />
        <div class="swatches">
          @for (c of colors; track c) {
            <button
              type="button"
              class="swatch"
              [attr.data-color]="c"
              [attr.data-active]="draft().color === c ? '' : null"
              (click)="patchDraft({ color: c })"
            ></button>
          }
        </div>
        <button ui-button variant="primary" size="sm" type="submit" [disabled]="busy()">Lưu</button>
        <button ui-button variant="ghost" size="sm" type="button" (click)="cancelDraft()">Huỷ</button>
      </form>
    </ng-template>
  `,
  styles: [
    `
      :host { display: block; }
      .grid {
        display: grid;
        grid-template-columns: 1fr 300px;
        gap: 28px;
      }
      .tree {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--r-lg);
        box-shadow: var(--sh-2);
        padding: 24px 26px;
      }
      .tree__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 18px;
      }
      .tree .eyebrow,
      .aside .eyebrow {
        font-family: var(--mono);
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--ink-400);
        display: block;
      }
      .roots {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 8px 32px;
      }
      .root {
        padding: 18px 0;
        border-top: 1px solid var(--line-soft);
      }
      .root:first-child,
      .root:nth-child(2) { border-top-color: var(--line); }
      .root__head {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 12px;
      }
      .root__count {
        font-size: var(--fs-12);
        color: var(--ink-400);
        letter-spacing: 0.04em;
      }
      .actions {
        margin-left: auto;
        display: inline-flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 140ms var(--ease-out);
      }
      .root:hover .actions,
      .children li:hover .actions {
        opacity: 1;
      }
      .icon {
        width: 28px;
        height: 28px;
        border-radius: var(--r-sm);
        font-size: 13px;
        color: var(--ink-500);
        background: transparent;
        border: none;
        cursor: pointer;
        transition: background 140ms var(--ease-out), color 140ms var(--ease-out);
      }
      .icon:hover {
        background: var(--surface-2);
        color: var(--accent-700);
      }
      .children {
        margin-left: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .children li {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: var(--fs-14);
      }
      .children .line {
        font-family: var(--mono);
        color: var(--ink-300);
      }
      .children__count {
        font-family: var(--mono);
        font-size: var(--fs-12);
        color: var(--ink-400);
        margin-left: auto;
      }
      .indent { margin: 8px 0 12px 28px; }
      .form {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
        padding: 12px 14px;
        background: var(--surface-2);
        border: 1px solid var(--line-soft);
        border-radius: var(--r-md);
      }
      .form input[ui-input] { flex: 1 1 160px; min-width: 0; }
      .swatches {
        display: inline-flex;
        gap: 6px;
      }
      .swatch {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 1px solid var(--line);
        cursor: pointer;
        padding: 0;
        transition: transform 140ms var(--ease-out);
      }
      .swatch:hover { transform: scale(1.12); }
      .swatch[data-color='oxblood'] { background: var(--accent); }
      .swatch[data-color='amber'] { background: var(--amber); }
      .swatch[data-color='moss'] { background: var(--sage); }
      .swatch[data-color='rust'] { background: var(--clay); }
      .swatch[data-color='ink'] { background: var(--ink-700); }
      .swatch[data-active] {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }
      .aside {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--r-lg);
        box-shadow: var(--sh-2);
        padding: 24px 26px;
        align-self: flex-start;
      }
      .legend {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin: 14px 0 0;
      }
      .legend li {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: var(--fs-13);
        color: var(--ink-500);
      }
      .hint {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--line-soft);
        font-size: var(--fs-13);
        color: var(--ink-500);
        font-style: italic;
        line-height: 1.5;
      }
      .empty {
        padding: 40px 0;
        text-align: center;
        color: var(--ink-400);
        font-family: var(--serif);
        font-style: italic;
      }
      @media (max-width: 880px) {
        .grid { grid-template-columns: 1fr; }
        .tree, .aside { padding: 20px; }
      }
    `,
  ],
})
export class DocumentTagsPage implements OnInit {
  private svc = inject(DocumentsService);
  private auth = inject(AuthStore);
  private toast = inject(ToastService);

  readonly colors = TAG_COLORS;
  tags = signal<Tag[]>([]);
  draftParentId = signal<string | null | undefined>(undefined); // undefined = no draft, null = root draft, string = child draft
  editingId = signal<string | null>(null);
  draft = signal<DraftTag>({ ...EMPTY_DRAFT });
  busy = signal(false);

  canWrite = computed(() => this.auth.isAdmin() || this.auth.permissions().has('tags:write'));

  roots = computed<TagNode[]>(() => {
    const all = this.tags();
    const byParent = new Map<string | null | undefined, Tag[]>();
    for (const t of all) {
      const key = t.parentId ?? null;
      const list = byParent.get(key) ?? [];
      list.push(t);
      byParent.set(key, list);
    }
    return (byParent.get(null) ?? []).map((t) => ({
      tag: t,
      children: (byParent.get(t.id) ?? []).map((c) => ({ tag: c, children: [] })),
    }));
  });

  async ngOnInit() {
    await this.refresh();
  }

  async refresh() {
    try {
      this.tags.set(await this.svc.tags());
    } catch (e) {
      this.toast.error(this.errMessage(e));
    }
  }

  openCreate(parentId: string | null) {
    this.editingId.set(null);
    this.draftParentId.set(parentId);
    this.draft.set({ ...EMPTY_DRAFT, parentId });
  }

  openEdit(tag: Tag) {
    this.draftParentId.set(undefined);
    this.editingId.set(tag.id);
    this.draft.set({ label: tag.label, color: tag.color, parentId: tag.parentId ?? null });
  }

  cancelDraft() {
    this.draftParentId.set(undefined);
    this.editingId.set(null);
    this.draft.set({ ...EMPTY_DRAFT });
  }

  patchDraft(patch: Partial<DraftTag>) {
    this.draft.set({ ...this.draft(), ...patch });
  }

  async submitCreate() {
    if (this.busy()) return;
    const d = this.draft();
    if (!d.label.trim()) {
      this.toast.error('Tên tag không được rỗng.');
      return;
    }
    this.busy.set(true);
    try {
      const input: CreateTagInput = {
        label: d.label.trim(),
        color: d.color,
        parentId: d.parentId,
      };
      await this.svc.createTag(input);
      this.toast.success(`Đã tạo tag "${input.label}".`);
      this.cancelDraft();
      await this.refresh();
    } catch (e) {
      this.toast.error(this.errMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  async submitEdit(tag: Tag) {
    if (this.busy()) return;
    const d = this.draft();
    if (!d.label.trim()) {
      this.toast.error('Tên tag không được rỗng.');
      return;
    }
    this.busy.set(true);
    try {
      await this.svc.updateTag(tag.id, {
        label: d.label.trim(),
        color: d.color,
        parentId: tag.parentId ?? null,
      });
      this.toast.success(`Đã cập nhật tag "${d.label.trim()}".`);
      this.cancelDraft();
      await this.refresh();
    } catch (e) {
      this.toast.error(this.errMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  async remove(tag: Tag) {
    if (this.busy()) return;
    if (!confirm(`Xoá tag "${tag.label}"?`)) return;
    this.busy.set(true);
    try {
      await this.svc.deleteTag(tag.id);
      this.toast.success(`Đã xoá tag "${tag.label}".`);
      await this.refresh();
    } catch (e) {
      this.toast.error(this.errMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  private errMessage(e: unknown): string {
    if (e instanceof HttpErrorResponse && e.error && typeof e.error === 'object') {
      const body = e.error as { detail?: string; title?: string };
      return body.detail ?? body.title ?? `Lỗi ${e.status}`;
    }
    return 'Đã có lỗi xảy ra. Thử lại.';
  }
}
