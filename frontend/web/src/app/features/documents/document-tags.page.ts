import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { Tag } from '../../core/models';
import { DocumentsService } from './documents.service';
import { UiPageHeader } from '../../shared/ui/page-header/page-header';
import { UiTag } from '../../shared/ui/tag/tag';

interface TagNode {
  tag: Tag;
  children: TagNode[];
}

@Component({
  selector: 'document-tags-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiPageHeader, UiTag],
  template: `
    <ui-page-header
      eyebrow="№ II/3 · TAG & TAXONOMY"
      number="II / 3"
      title="Cấu trúc tag"
      description="Mọi tài liệu trong kho được phân loại theo cây tag hai cấp. Tag con kế thừa visibility từ cha."
    />

    <div class="grid">
      <section class="tree">
        <span class="eyebrow">§ Cây tag</span>
        <div class="roots">
          @for (root of roots(); track root.tag.id) {
            <article class="root">
              <header class="root__head">
                <ui-tag [color]="root.tag.color">{{ root.tag.label }}</ui-tag>
                <span class="root__count mono">{{ root.tag.documentCount }} tài liệu</span>
              </header>
              @if (root.children.length) {
                <ul class="children">
                  @for (c of root.children; track c.tag.id) {
                    <li>
                      <span class="line">└</span>
                      <ui-tag [color]="c.tag.color">{{ c.tag.label }}</ui-tag>
                      <span class="children__count mono">{{ c.tag.documentCount }}</span>
                    </li>
                  }
                </ul>
              }
            </article>
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

        <ui-tag color="amber" [interactive]="true">+ Tạo tag mới</ui-tag>
        <p class="hint">
          Chức năng tạo tag sẽ liên kết với API khi backend sẵn sàng. Trong demo,
          dữ liệu được giữ trong bộ nhớ phiên.
        </p>
      </aside>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .grid {
        display: grid;
        grid-template-columns: 1fr 280px;
        gap: 56px;
      }
      .tree .eyebrow,
      .aside .eyebrow {
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--ink-500);
        display: block;
        margin-bottom: 18px;
      }
      .roots {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 8px 32px;
      }
      .root {
        padding: 20px 0;
        border-top: 1px solid var(--rule);
      }
      .root:first-child,
      .root:nth-child(2) { border-top-color: var(--rule-strong); }
      .root__head {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 12px;
      }
      .root__count {
        font-size: var(--fs-12);
        color: var(--ink-500);
        letter-spacing: 0.06em;
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
        font-family: var(--font-mono);
        color: var(--ink-300);
      }
      .children__count {
        font-size: var(--fs-12);
        color: var(--ink-500);
        margin-left: auto;
      }
      .legend {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 24px;
      }
      .legend li {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: var(--fs-13);
        color: var(--ink-600);
      }
      .hint {
        margin-top: 12px;
        font-size: var(--fs-13);
        color: var(--ink-500);
        font-style: italic;
        line-height: 1.5;
      }
      @media (max-width: 880px) {
        .grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class DocumentTagsPage implements OnInit {
  private svc = inject(DocumentsService);
  tags = signal<Tag[]>([]);

  roots = computed<TagNode[]>(() => {
    const all = this.tags();
    const byParent = new Map<string | undefined, Tag[]>();
    for (const t of all) {
      const list = byParent.get(t.parentId) ?? [];
      list.push(t);
      byParent.set(t.parentId, list);
    }
    return (byParent.get(undefined) ?? []).map((t) => ({
      tag: t,
      children: (byParent.get(t.id) ?? []).map((c) => ({ tag: c, children: [] })),
    }));
  });

  async ngOnInit() {
    this.tags.set(await this.svc.tags());
  }
}
