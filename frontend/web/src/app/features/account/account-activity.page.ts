import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { API_CONFIG } from '../../core/api/api.config';
import { ActivityEvent } from '../../core/models';
import { UiPageHeader } from '../../shared/ui/page-header/page-header';
import { formatDateTime } from '../../core/util/date';

@Component({
  selector: 'account-activity-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiPageHeader],
  template: `
    <ui-page-header
      eyebrow="№ III/3 · HOẠT ĐỘNG"
      number="III / 3"
      title="Nhật ký hoạt động"
      description="Toàn bộ thao tác gần nhất trên tài khoản — có thể tải về để đối chiếu."
    />

    @if (loading()) {
      <p class="center mono">đang tải nhật ký…</p>
    } @else {
      <ol class="log">
        @for (e of events(); track e.id; let i = $index) {
          <li class="evt reveal" [style.animation-delay.ms]="40 + i * 25">
            <span class="when mono">{{ formatDateTime(e.at) }}</span>
            <span class="rail"></span>
            <div class="body">
              <span class="action">{{ e.action }}</span>
              @if (e.target) {
                <span class="target mono">{{ e.target }}</span>
              }
            </div>
          </li>
        }
      </ol>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .center { text-align: center; padding: 48px 0; color: var(--ink-400); }
      .log { display: flex; flex-direction: column; }
      .evt {
        display: grid;
        grid-template-columns: 180px 12px 1fr;
        gap: 16px;
        padding: 14px 0;
        align-items: baseline;
        border-bottom: 1px solid var(--rule);
      }
      .when {
        color: var(--ink-500);
        font-size: var(--fs-12);
        letter-spacing: 0.04em;
      }
      .rail {
        width: 2px;
        background: var(--rule);
        height: 32px;
        margin: -10px 0;
        justify-self: center;
        position: relative;
      }
      .rail::before {
        content: '';
        position: absolute;
        top: 8px;
        left: -3px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--oxblood);
        border: 2px solid var(--paper-50);
      }
      .action {
        font-family: var(--font-display);
        font-style: italic;
        font-size: var(--fs-18);
        color: var(--ink-900);
      }
      .target {
        display: block;
        margin-top: 4px;
        font-size: var(--fs-13);
        color: var(--ink-500);
      }
      @media (max-width: 720px) {
        .evt { grid-template-columns: 1fr; gap: 4px; }
        .rail { display: none; }
      }
    `,
  ],
})
export class AccountActivityPage implements OnInit {
  private http = inject(HttpClient);
  private config = inject(API_CONFIG);

  events = signal<ActivityEvent[]>([]);
  loading = signal(true);
  formatDateTime = formatDateTime;

  async ngOnInit() {
    try {
      this.events.set(
        await firstValueFrom(
          this.http.get<ActivityEvent[]>(`${this.config.baseUrl}/account/activity`)
        )
      );
    } finally {
      this.loading.set(false);
    }
  }
}
