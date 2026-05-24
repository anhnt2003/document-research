import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Role } from '../../../core/models';
import { AdminService } from '../admin.service';
import { UiPageHeader } from '../../../shared/ui/page-header/page-header';
import { UiButton } from '../../../shared/ui/button/button';
import { UiField } from '../../../shared/ui/field/field';
import { UiInput } from '../../../shared/ui/input/input';

@Component({
  selector: 'user-invite-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, UiPageHeader, UiButton, UiField, UiInput],
  template: `
    <ui-page-header
      eyebrow="№ IV/1 · MỜI MỚI"
      number="IV / 1.b"
      title="Mời người dùng"
      description="Gửi lời mời qua email — người được mời sẽ tự thiết lập mật khẩu khi đăng nhập lần đầu."
    >
      <a routerLink="/admin/users"><button ui-button variant="ghost">← Danh sách</button></a>
    </ui-page-header>

    <form class="form" (submit)="submit($event)">
      <ui-field label="Email" hint="Bắt buộc">
        <input ui-input type="email" required [(ngModel)]="email" name="email" placeholder="ten.cua.ho@hubt.edu.vn" />
      </ui-field>
      <ui-field label="Tên hiển thị">
        <input ui-input type="text" [(ngModel)]="displayName" name="displayName" />
      </ui-field>
      <ui-field label="Chức danh">
        <input ui-input type="text" [(ngModel)]="title" name="title" />
      </ui-field>
      <ui-field label="Đơn vị">
        <input ui-input type="text" [(ngModel)]="department" name="department" />
      </ui-field>
      <ui-field label="Vai trò mặc định">
        <select [(ngModel)]="roleId" name="role" class="select">
          @for (r of roles(); track r.id) {
            <option [value]="r.id">{{ r.name }} — {{ r.description }}</option>
          }
        </select>
      </ui-field>
      <div class="actions">
        <button ui-button size="lg" type="submit" [disabled]="loading()">
          {{ loading() ? 'Đang gửi…' : 'Gửi lời mời' }}
        </button>
      </div>
    </form>
  `,
  styles: [
    `
      :host { display: block; }
      .form {
        display: flex;
        flex-direction: column;
        gap: 22px;
        max-width: 560px;
      }
      .select {
        font: inherit;
        padding: 8px 12px;
        border: 1px solid var(--rule-strong);
        background: var(--paper-50);
        border-radius: var(--radius-sm);
        width: 100%;
      }
      .actions { margin-top: 16px; }
    `,
  ],
})
export class UserInvitePage implements OnInit {
  private svc = inject(AdminService);
  private router = inject(Router);

  email = '';
  displayName = '';
  title = '';
  department = '';
  roleId = 'role-viewer';
  loading = signal(false);
  roles = signal<Role[]>([]);

  async ngOnInit() {
    this.roles.set(await this.svc.roles());
  }

  async submit(e: Event) {
    e.preventDefault();
    if (!this.email) return;
    this.loading.set(true);
    try {
      await this.svc.createUser({
        email: this.email,
        displayName: this.displayName || this.email.split('@')[0],
        title: this.title,
        department: this.department,
        roleIds: [this.roleId],
      });
      this.router.navigateByUrl('/admin/users');
    } finally {
      this.loading.set(false);
    }
  }
}
