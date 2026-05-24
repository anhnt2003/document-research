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
  status: 'queued' | 'uploading' | 'done' | 'error';
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
                    @case ('uploading') { {{ f.progress.toFixed(0) }}% }
                    @case ('done') { hoàn tất }
                    @case ('error') { lỗi }
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
    }));
    this.files.update((cur) => [...cur, ...newItems]);
    for (const it of newItems) this.simulate(it);
  }

  private simulate(item: UploadingFile) {
    this.files.update((cur) =>
      cur.map((x) => (x.id === item.id ? { ...x, status: 'uploading' } : x))
    );
    const total = item.size > 0 ? item.size : 100000;
    const step = Math.max(total / 30, 5000);
    let loaded = 0;
    const tick = () => {
      loaded += step;
      const p = Math.min(100, (loaded / total) * 100);
      this.files.update((cur) =>
        cur.map((x) =>
          x.id === item.id
            ? { ...x, progress: p, status: p >= 100 ? 'done' : 'uploading' }
            : x
        )
      );
      if (p < 100) setTimeout(tick, 90 + Math.random() * 80);
      else this.tryCreate(item);
    };
    setTimeout(tick, 200);
  }

  private async tryCreate(item: UploadingFile) {
    try {
      await this.svc.create({
        title: item.name.replace(/\.[^.]+$/, ''),
        summary: 'Tài liệu vừa được tải lên — chưa có tóm tắt.',
        type: this.extOf(item.name).toLowerCase() as 'pdf' | 'docx' | 'md' | 'link' | 'image',
        sizeBytes: item.size,
        tagIds: [],
      });
    } catch {
      this.files.update((cur) =>
        cur.map((x) => (x.id === item.id ? { ...x, status: 'error' } : x))
      );
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
