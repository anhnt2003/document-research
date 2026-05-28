import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';

import { UiPageHeader } from '../../shared/ui/page-header/page-header';
import { UiButton } from '../../shared/ui/button/button';
import { DocumentsService } from './documents.service';
import { formatBytes } from '../../core/util/date';

interface UploadingFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'queued' | 'uploading' | 'ingesting' | 'done' | 'error';
  source?: File;
  error?: string;
}

@Component({
  selector: 'document-upload-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiPageHeader, UiButton],
  template: `
    <ui-page-header
      eyebrow="№ II/2 · TẢI LÊN"
      number="II / 2"
      title="Tải lên tài liệu"
      description="Kéo–thả nhiều tệp cùng lúc. Các định dạng được hỗ trợ: PDF, DOCX, MD, TXT, hình ảnh."
    />

    <div class="layout">
      <div
        class="zone"
        [class.is-hover]="hovering()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        <div class="zone__glyph">↥</div>
        <h2 class="zone__title">
          Kéo tệp vào đây <em>hoặc</em>
        </h2>
        <label class="zone__btn">
          <input type="file" multiple (change)="onFileInput($event)" hidden />
          <span>Chọn tệp từ máy</span>
        </label>
        <p class="zone__hint mono">Hỗ trợ đa tệp · tối đa 50MB/tệp</p>
      </div>

      <aside class="aside">
        <section class="aside__block">
          <span class="aside__eyebrow mono">§ Định dạng</span>
          <ul class="formats">
            <li><span class="formats__ext mono">PDF</span><span>Báo cáo, luận văn, sách</span></li>
            <li><span class="formats__ext mono">DOCX</span><span>Bản thảo có cấu trúc heading</span></li>
            <li><span class="formats__ext mono">MD</span><span>Ghi chú &amp; tài liệu kỹ thuật</span></li>
            <li><span class="formats__ext mono">TXT</span><span>Văn bản thuần</span></li>
            <li><span class="formats__ext mono">IMG</span><span>JPG / PNG — sẽ chạy OCR</span></li>
          </ul>
        </section>

        <section class="aside__block">
          <span class="aside__eyebrow mono">§ Mẹo đặt tên</span>
          <ol class="tips">
            <li>Bắt đầu bằng <em>chủ đề</em> chứ không phải năm — dễ tìm về sau.</li>
            <li>Tránh ký tự đặc biệt; dấu tiếng Việt thì OK.</li>
            <li>Gắn tag ngay khi tải lên để tích hợp vào taxonomy.</li>
          </ol>
        </section>

        <section class="aside__block aside__block--quiet">
          <span class="aside__eyebrow mono">§ Sau khi tải lên</span>
          <p class="aside__copy">
            Hệ thống sẽ trích xuất văn bản, tạo embedding ngữ nghĩa và đưa vào chỉ mục tra cứu trong khoảng 30 giây cho mỗi tệp.
          </p>
        </section>
      </aside>
    </div>

    @if (files().length) {
      <section class="queue">
        <header class="queue__head">
          <span class="eyebrow">§ Hàng đợi</span>
          <span class="mono">{{ files().length }} tệp · {{ totalSize() }}</span>
        </header>
        <ul>
          @for (f of files(); track f.id) {
            <li class="item">
              <div class="item__main">
                <div class="item__name">
                  <span class="item__ext mono">{{ extOf(f.name) }}</span>
                  <span class="item__filename">{{ f.name }}</span>
                </div>
                <div class="item__progress">
                  <div class="bar" [style.width.%]="f.progress"></div>
                </div>
              </div>
              <div class="item__meta mono">
                <span>{{ formatBytes(f.size) }}</span>
                <span class="dot">·</span>
                <span [attr.data-status]="f.status">
                  @switch (f.status) {
                    @case ('queued') { đang chờ }
                    @case ('uploading') { đang tải lên }
                    @case ('ingesting') { đang trích xuất }
                    @case ('done') { hoàn tất }
                    @case ('error') { {{ f.error ?? 'lỗi' }} }
                  }
                </span>
              </div>
            </li>
          }
        </ul>
        <footer class="queue__foot">
          <button ui-button variant="ghost" (click)="clear()">Xóa hàng đợi</button>
        </footer>
      </section>
    }
  `,
  styles: [
    `
      :host { display: block; padding-top: 8px; }
      .layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 280px;
        gap: 40px;
        align-items: flex-start;
      }
      .aside {
        display: flex;
        flex-direction: column;
        gap: 28px;
      }
      .aside__block { display: flex; flex-direction: column; gap: 10px; }
      .aside__block--quiet { color: var(--ink-500); }
      .aside__eyebrow {
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--ink-500);
      }
      .formats {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .formats li {
        display: grid;
        grid-template-columns: 56px 1fr;
        gap: 12px;
        align-items: baseline;
        padding: 6px 0;
        border-bottom: 1px dotted var(--rule);
        font-size: var(--fs-13);
        color: var(--ink-700);
      }
      .formats li:last-child { border-bottom: none; }
      .formats__ext {
        color: var(--oxblood);
        font-size: var(--fs-12);
        letter-spacing: 0.12em;
      }
      .tips {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding-left: 20px;
        font-size: var(--fs-13);
        line-height: 1.55;
        color: var(--ink-700);
        list-style: decimal;
      }
      .tips em { font-style: italic; color: var(--oxblood); }
      .aside__copy {
        font-size: var(--fs-13);
        line-height: 1.6;
        color: var(--ink-600);
        font-style: italic;
      }
      @media (max-width: 880px) {
        .layout { grid-template-columns: 1fr; }
      }
      .zone {
        border: 1.5px dashed var(--amber);
        background:
          repeating-linear-gradient(
            -45deg,
            transparent 0,
            transparent 12px,
            rgba(184, 116, 42, 0.04) 12px,
            rgba(184, 116, 42, 0.04) 24px
          );
        padding: 64px 32px;
        text-align: center;
        transition: background 160ms var(--ease-out), border-color 160ms var(--ease-out);
      }
      .zone.is-hover {
        border-color: var(--oxblood);
        background:
          repeating-linear-gradient(
            -45deg,
            transparent 0,
            transparent 12px,
            rgba(122, 31, 37, 0.08) 12px,
            rgba(122, 31, 37, 0.08) 24px
          );
      }
      .zone__glyph {
        font-size: 56px;
        color: var(--amber);
        line-height: 1;
        margin-bottom: 14px;
      }
      .zone__title {
        font-family: var(--font-display);
        font-size: var(--fs-36);
        font-weight: 400;
        font-variation-settings: 'opsz' 72, 'SOFT' 80;
        letter-spacing: -0.02em;
        margin-bottom: 18px;
      }
      .zone__title em {
        font-style: italic;
        color: var(--oxblood);
      }
      .zone__btn {
        display: inline-block;
        padding: 10px 22px;
        background: var(--ink-900);
        color: var(--paper-50);
        font-size: var(--fs-14);
        font-weight: 500;
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: background 140ms var(--ease-out);
      }
      .zone__btn:hover { background: var(--oxblood); }
      .zone__hint {
        margin-top: 16px;
        color: var(--ink-500);
        font-size: var(--fs-12);
        letter-spacing: 0.1em;
      }

      .queue {
        margin-top: 40px;
        border-top: 1px solid var(--rule);
        padding-top: 24px;
      }
      .queue__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 16px;
      }
      .queue__head .eyebrow {
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--ink-500);
      }
      .queue__head .mono {
        font-size: var(--fs-12);
        color: var(--ink-500);
      }
      ul { display: flex; flex-direction: column; }
      .item {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 16px;
        padding: 14px 0;
        border-bottom: 1px solid var(--rule);
        align-items: center;
      }
      .item__name {
        display: flex;
        align-items: baseline;
        gap: 12px;
      }
      .item__ext {
        font-family: var(--font-mono);
        font-size: var(--fs-12);
        color: var(--oxblood);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        min-width: 44px;
      }
      .item__filename {
        font-family: var(--font-display);
        font-style: italic;
        font-size: var(--fs-16);
        color: var(--ink-900);
      }
      .item__progress {
        margin-top: 8px;
        height: 2px;
        background: var(--paper-200);
        overflow: hidden;
      }
      .bar {
        height: 100%;
        background: var(--oxblood);
        transition: width 280ms var(--ease-out);
      }
      .item__meta {
        text-align: right;
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: var(--fs-12);
        color: var(--ink-500);
      }
      .item__meta [data-status='done'] { color: var(--moss); }
      .item__meta [data-status='error'] { color: var(--oxblood); }
      .dot { color: var(--ink-300); }
      .queue__foot {
        margin-top: 16px;
        display: flex;
        justify-content: flex-end;
      }
    `,
  ],
})
export class DocumentUploadPage {
  private svc = inject(DocumentsService);
  files = signal<UploadingFile[]>([]);
  hovering = signal(false);
  formatBytes = formatBytes;

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.hovering.set(true);
  }
  onDragLeave(_e: DragEvent) {
    this.hovering.set(false);
  }

  @HostListener('window:drop', ['$event'])
  preventDrop(e: DragEvent) {
    e.preventDefault();
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.hovering.set(false);
    const list = e.dataTransfer?.files;
    if (!list) return;
    this.enqueue(Array.from(list));
  }

  onFileInput(e: Event) {
    const list = (e.target as HTMLInputElement).files;
    if (!list) return;
    this.enqueue(Array.from(list));
  }

  private enqueue(fs: File[]) {
    const newItems: UploadingFile[] = fs.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: f.name,
      size: f.size,
      type: f.type,
      progress: 0,
      status: 'queued',
      source: f,
    }));
    this.files.update((cur) => [...cur, ...newItems]);
    for (const it of newItems) this.upload(it);
  }

  private setStatus(itemId: string, patch: Partial<UploadingFile>) {
    this.files.update((cur) => cur.map((x) => (x.id === itemId ? { ...x, ...patch } : x)));
  }

  private async upload(item: UploadingFile) {
    if (!item.source) {
      this.setStatus(item.id, { status: 'error', error: 'Missing source file' });
      return;
    }
    this.setStatus(item.id, { status: 'uploading', progress: 30 });
    try {
      const dto = await this.svc.create({
        file: item.source,
        title: item.name.replace(/\.[^.]+$/, ''),
      });
      this.setStatus(item.id, { status: 'ingesting', progress: 60 });
      this.svc.streamIngestionStatus(dto.id).subscribe({
        next: (event) => {
          if (event.status === 'Ready') {
            this.setStatus(item.id, { status: 'done', progress: 100 });
          } else if (event.status === 'Failed') {
            this.setStatus(item.id, {
              status: 'error',
              progress: 0,
              error: event.error ?? 'Ingestion failed',
            });
          } else if (event.status === 'Extracting' || event.status === 'Embedding') {
            this.setStatus(item.id, { status: 'ingesting', progress: 80 });
          }
        },
        error: () => {
          this.setStatus(item.id, { status: 'error', error: 'Status stream lost' });
        },
      });
    } catch (err) {
      this.setStatus(item.id, {
        status: 'error',
        progress: 0,
        error: err instanceof Error ? err.message : 'Upload failed',
      });
    }
  }

  totalSize(): string {
    return formatBytes(this.files().reduce((acc, f) => acc + f.size, 0));
  }

  extOf(name: string): string {
    const m = name.match(/\.([^.]+)$/);
    return m ? m[1] : '?';
  }

  clear() {
    this.files.set([]);
  }
}
