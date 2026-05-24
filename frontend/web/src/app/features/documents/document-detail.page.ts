import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { DocumentItem, Tag, User } from '../../core/models';
import { DocumentsService } from './documents.service';
import { UiButton } from '../../shared/ui/button/button';
import { UiTag } from '../../shared/ui/tag/tag';
import { UiBadge } from '../../shared/ui/badge/badge';
import { UiAvatar } from '../../shared/ui/avatar/avatar';
import { UiOrnament } from '../../shared/ui/ornament/ornament';
import { UiEmptyState } from '../../shared/ui/empty-state/empty-state';
import { formatBytes, formatDateLong } from '../../core/util/date';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../../core/api/api.config';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'document-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, UiButton, UiTag, UiBadge, UiAvatar, UiOrnament, UiEmptyState],
  template: `
    @if (doc(); as d) {
      <article class="page reveal">
        <header class="head">
          <a routerLink="/documents" class="crumb">← Kho tài liệu</a>
          <div class="head__inner">
            <span class="eyebrow mono">{{ d.signature }} · {{ d.type.toUpperCase() }}</span>
            <h1 class="title">{{ d.title }}</h1>
            <p class="summary">{{ d.summary }}</p>
            <div class="head__meta mono">
              <span>{{ formatDateLong(d.updatedAt) }}</span>
              <span class="dot">·</span>
              <span>{{ d.pageCount ?? '—' }} trang</span>
              @if (d.sizeBytes) {
                <span class="dot">·</span>
                <span>{{ formatBytes(d.sizeBytes) }}</span>
              }
              <span class="dot">·</span>
              <span>{{ d.language === 'en' ? 'EN' : 'VI' }}</span>
            </div>
          </div>
          <div class="head__actions">
            <button ui-button variant="ghost">★ Lưu</button>
            <button ui-button variant="outline">↗ Chia sẻ</button>
            <button ui-button>↧ Tải về</button>
          </div>
        </header>

        <ui-ornament glyph="❧" />

        <div class="body">
          <section class="content">
            <h2 class="content__h2">Tóm tắt</h2>
            <p class="lede">{{ d.summary }}</p>

            <h2 class="content__h2">Nội dung mở rộng</h2>
            <p class="body__p">{{ d.body }}</p>

            @if (related().length > 0) {
              <ui-ornament glyph="※" />
              <h2 class="content__h2">Tài liệu liên quan</h2>
              <ul class="related">
                @for (r of related(); track r.id) {
                  <li>
                    <a [routerLink]="['/documents', r.id]">
                      <span class="related__sig mono">{{ r.signature }}</span>
                      <span class="related__title">{{ r.title }}</span>
                    </a>
                  </li>
                }
              </ul>
            }
          </section>

          <aside class="sidebar">
            <section>
              <span class="label">Loại</span>
              <ui-tag color="ink">{{ d.type.toUpperCase() }}</ui-tag>
            </section>
            <section>
              <span class="label">Visibility</span>
              <ui-badge [tone]="visTone(d.visibility)">{{ visLabel(d.visibility) }}</ui-badge>
            </section>
            <section>
              <span class="label">Tag</span>
              <div class="tags">
                @for (t of docTags(); track t.id) {
                  <ui-tag [color]="t.color">{{ t.label }}</ui-tag>
                }
              </div>
            </section>
            <section>
              <span class="label">Tác giả</span>
              <ul class="authors">
                @for (a of authors(); track a.id) {
                  <li>
                    <ui-avatar [user]="a" size="sm" />
                    <div>
                      <span class="author__name">{{ a.displayName }}</span>
                      <span class="author__role mono">{{ a.title }}</span>
                    </div>
                  </li>
                }
              </ul>
            </section>
            <section>
              <span class="label">Mốc thời gian</span>
              <ul class="timeline">
                <li>
                  <span class="mono">{{ formatDateLong(d.uploadedAt) }}</span>
                  <span>Tải lên</span>
                </li>
                <li>
                  <span class="mono">{{ formatDateLong(d.updatedAt) }}</span>
                  <span>Cập nhật gần nhất</span>
                </li>
              </ul>
            </section>
            <section class="sig-block">
              <span class="label">Mã thư viện</span>
              <span class="sig-block__value">{{ d.signature }}</span>
            </section>
          </aside>
        </div>
      </article>
    } @else if (loading()) {
      <p class="loading mono">đang tải…</p>
    } @else {
      <ui-empty-state
        glyph="✺"
        title="Không tìm thấy tài liệu"
        description="Tài liệu có thể đã bị gỡ, đổi vị trí, hoặc bạn nhập sai mã thư viện. Quay lại kho lưu trữ để tiếp tục tra cứu."
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
        grid-template-columns: 1fr auto;
        gap: 24px;
        align-items: flex-start;
        padding-bottom: 32px;
      }
      .head__inner { grid-column: 1; }
      .head__actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
        grid-column: 2;
        grid-row: 2;
      }
      .eyebrow {
        font-size: var(--fs-12);
        color: var(--oxblood);
        letter-spacing: 0.18em;
        text-transform: uppercase;
        display: block;
        margin-bottom: 14px;
      }
      .title {
        font-family: var(--font-display);
        font-size: clamp(36px, 5vw, 64px);
        font-weight: 400;
        font-variation-settings: 'opsz' 96, 'SOFT' 60;
        letter-spacing: -0.025em;
        line-height: 1.04;
        margin: 0 0 16px;
      }
      .summary {
        max-width: 720px;
        font-size: var(--fs-18);
        color: var(--ink-700);
        line-height: 1.55;
        font-family: var(--font-display);
        font-style: italic;
        font-variation-settings: 'opsz' 36, 'SOFT' 100;
        margin-bottom: 18px;
      }
      .head__meta {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
        color: var(--ink-500);
        font-size: var(--fs-12);
        letter-spacing: 0.06em;
      }
      .dot { color: var(--ink-300); }

      .body {
        display: grid;
        grid-template-columns: minmax(0, 2fr) 280px;
        gap: 56px;
      }
      .content { min-width: 0; }
      .content__h2 {
        font-family: var(--font-display);
        font-size: var(--fs-24);
        font-style: italic;
        font-variation-settings: 'opsz' 36, 'SOFT' 80;
        color: var(--ink-800);
        margin: 28px 0 14px;
      }
      .lede {
        font-size: var(--fs-16);
        line-height: 1.65;
        color: var(--ink-700);
      }
      .body__p {
        font-size: var(--fs-15);
        line-height: 1.7;
        color: var(--ink-700);
      }
      .related { display: flex; flex-direction: column; gap: 10px; }
      .related a {
        display: grid;
        grid-template-columns: 80px 1fr;
        gap: 14px;
        padding: 10px 0;
        border-bottom: 1px solid var(--rule);
        color: inherit;
      }
      .related a:hover { border-bottom-color: var(--oxblood); }
      .related__sig {
        color: var(--oxblood);
        font-size: var(--fs-12);
        letter-spacing: 0.08em;
      }
      .related__title {
        font-family: var(--font-display);
        font-style: italic;
        font-size: var(--fs-16);
        color: var(--ink-900);
      }

      .sidebar {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .sidebar section {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--rule);
      }
      .sidebar section:last-child { border-bottom: none; }
      .label {
        font-family: var(--font-mono);
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--ink-500);
      }
      .tags { display: flex; flex-wrap: wrap; gap: 6px; }
      .authors { display: flex; flex-direction: column; gap: 12px; }
      .authors li { display: flex; align-items: center; gap: 10px; }
      .author__name { font-size: var(--fs-14); color: var(--ink-900); }
      .author__role {
        display: block;
        font-size: var(--fs-12);
        color: var(--ink-500);
        margin-top: 2px;
      }
      .timeline {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .timeline li {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 8px 0;
        border-bottom: 1px dotted var(--rule);
      }
      .timeline li:last-child { border-bottom: none; }
      .timeline li .mono {
        font-size: var(--fs-12);
        color: var(--ink-500);
        letter-spacing: 0.06em;
      }
      .timeline li span:last-child {
        font-size: var(--fs-13);
        color: var(--ink-700);
      }
      .sig-block__value {
        font-family: var(--font-mono);
        font-size: var(--fs-20);
        color: var(--oxblood);
        letter-spacing: 0.1em;
      }
      .loading { padding: 64px; text-align: center; color: var(--ink-400); }

      @media (max-width: 880px) {
        .head { grid-template-columns: 1fr; }
        .body { grid-template-columns: 1fr; gap: 32px; }
      }
    `,
  ],
})
export class DocumentDetailPage implements OnInit {
  private svc = inject(DocumentsService);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private config = inject(API_CONFIG);

  doc = signal<DocumentItem | null>(null);
  authors = signal<User[]>([]);
  docTags = signal<Tag[]>([]);
  related = signal<DocumentItem[]>([]);
  loading = signal(true);

  formatBytes = formatBytes;
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
      const d = await this.svc.get(id);
      this.doc.set(d);
      const [users, tags, related] = await Promise.all([
        firstValueFrom(this.http.get<User[]>(`${this.config.baseUrl}/users`)),
        this.svc.tags(),
        this.svc.list({ pageSize: 100 }),
      ]);
      this.authors.set(users.filter((u) => d.authorIds.includes(u.id)));
      this.docTags.set(tags.filter((t) => d.tagIds.includes(t.id)));
      this.related.set(
        related.items
          .filter((r) => r.id !== d.id && r.tagIds.some((t) => d.tagIds.includes(t)))
          .slice(0, 4)
      );
    } catch {
      this.doc.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  visTone(v: string): 'moss' | 'amber' | 'ink' {
    return v === 'public' ? 'moss' : v === 'team' ? 'amber' : 'ink';
  }
  visLabel(v: string): string {
    return v === 'public' ? 'Công khai' : v === 'team' ? 'Nhóm' : 'Riêng tư';
  }
}
