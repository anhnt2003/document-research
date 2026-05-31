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
        grid-template-columns: minmax(0, 1fr) 300px;
        gap: 32px;
        align-items: flex-start;
      }
      .aside {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .aside__block {
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--r-lg);
        box-shadow: var(--sh-1);
        padding: 20px 22px;
      }
      .aside__block--quiet {
        background: var(--surface-2);
        color: var(--ink-500);
      }
      .aside__eyebrow {
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--ink-400);
      }
      .formats {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .formats li {
        display: grid;
        grid-template-columns: 56px 1fr;
        gap: 12px;
        align-items: baseline;
        padding: 8px 0;
        border-bottom: 1px solid var(--line-soft);
        font-size: var(--fs-13);
        color: var(--ink-700);
      }
      .formats li:last-child { border-bottom: none; }
      .formats__ext {
        color: var(--clay);
        font-size: var(--fs-12);
        letter-spacing: 0.1em;
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
      .tips em { font-style: italic; color: var(--accent); }
      .aside__copy {
        font-size: var(--fs-13);
        line-height: 1.6;
        color: var(--ink-500);
        font-style: italic;
        font-family: var(--serif);
      }
      @media (max-width: 880px) {
        .layout { grid-template-columns: 1fr; }
      }
      .zone {
        border: 1.5px dashed var(--line-strong);
        background: linear-gradient(160deg, var(--surface) 0%, var(--surface-2) 100%);
        border-radius: var(--r-xl);
        box-shadow: var(--sh-2);
        padding: 72px 32px;
        text-align: center;
        transition: background 180ms var(--ease-out), border-color 180ms var(--ease-out), box-shadow 200ms var(--ease-out);
      }
      .zone.is-hover {
        border-color: var(--accent);
        background: var(--accent-50);
        box-shadow: var(--sh-3), 0 0 0 5px var(--accent-50);
      }
      .zone__glyph {
        font-size: 56px;
        color: var(--accent);
        line-height: 1;
        margin-bottom: 14px;
      }
      .zone__title {
        font-family: var(--serif);
        font-size: clamp(28px, 4vw, 36px);
        font-weight: 500;
        letter-spacing: -0.02em;
        margin-bottom: 20px;
      }
      .zone__title em {
        font-style: italic;
        color: var(--accent);
      }
      .zone__btn {
        display: inline-flex;
        align-items: center;
        height: 44px;
        padding: 0 24px;
        background: var(--accent);
        color: #fff;
        font-size: var(--fs-14);
        font-weight: 600;
        border-radius: var(--r-pill);
        cursor: pointer;
        box-shadow: var(--sh-accent);
        transition: background 180ms var(--ease-out), transform 160ms var(--ease-out);
      }
      .zone__btn:hover { background: var(--accent-700); transform: translateY(-1px); }
      .zone__btn:active { transform: translateY(0); }
      .zone__hint {
        margin-top: 16px;
        color: var(--ink-400);
        font-size: var(--fs-12);
        letter-spacing: 0.08em;
      }

      .queue {
        margin-top: 28px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--r-lg);
        box-shadow: var(--sh-2);
        padding: 22px 24px;
      }
      .queue__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 8px;
        padding-bottom: 14px;
        border-bottom: 1px solid var(--line-soft);
      }
      .queue__head .eyebrow {
        font-family: var(--mono);
        font-size: var(--fs-12);
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--ink-400);
      }
      .queue__head .mono {
        font-size: var(--fs-12);
        color: var(--ink-400);
      }
      ul { display: flex; flex-direction: column; }
      .item {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 16px;
        padding: 16px 0;
        border-bottom: 1px solid var(--line-soft);
        align-items: center;
      }
      .item:last-child { border-bottom: none; }
      .item__name {
        display: flex;
        align-items: baseline;
        gap: 12px;
      }
      .item__ext {
        font-family: var(--mono);
        font-size: var(--fs-12);
        color: var(--clay);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        min-width: 44px;
      }
      .item__filename {
        font-family: var(--serif);
        font-weight: 600;
        font-size: var(--fs-16);
        color: var(--ink-900);
        letter-spacing: -0.01em;
      }
      .item__progress {
        margin-top: 10px;
        height: 5px;
        background: var(--bg-2);
        border-radius: var(--r-pill);
        overflow: hidden;
      }
      .bar {
        height: 100%;
        background: linear-gradient(90deg, var(--accent), var(--sage));
        border-radius: var(--r-pill);
        transition: width 280ms var(--ease-out);
      }
      .item__meta {
        text-align: right;
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: var(--fs-12);
        color: var(--ink-400);
      }
      .item__meta [data-status='done'] { color: var(--sage); font-weight: 500; }
      .item__meta [data-status='error'] { color: var(--clay); font-weight: 500; }
      .item__meta [data-status='ingesting'],
      .item__meta [data-status='uploading'] { color: var(--amber); font-weight: 500; }
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
