import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { User } from '../../../core/models';
import { makeInitials, pickAccent } from '../../../core/util/signature';

@Component({
  selector: 'ui-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (user.avatarUrl) {
      <img class="photo" [src]="user.avatarUrl" [alt]="user.displayName" />
    } @else {
      <span class="initials" [style.background]="color()">{{ initials() }}</span>
    }
  `,
  styles: [
    `
      :host {
        display: inline-block;
        position: relative;
      }
      .initials, .photo {
        display: inline-flex;
        width: var(--size, 32px);
        height: var(--size, 32px);
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        border: 1px solid var(--surface);
        box-shadow: var(--sh-1), 0 0 0 1px var(--line);
      }
      .initials {
        color: var(--bg);
        font-family: var(--serif);
        font-size: calc(var(--size, 32px) * 0.4);
        font-weight: 600;
        letter-spacing: 0.01em;
        text-transform: uppercase;
      }
      .photo { object-fit: cover; }
      :host[size='sm'] { --size: 24px; }
      :host[size='md'] { --size: 32px; }
      :host[size='lg'] { --size: 44px; }
      :host[size='xl'] { --size: 72px; }
    `,
  ],
  host: { '[attr.size]': 'size' },
})
export class UiAvatar {
  private _user = signal<User | null>(null);

  @Input({ required: true })
  set user(value: User) {
    this._user.set(value);
  }
  get user(): User {
    return this._user()!;
  }
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  initials = computed(() => {
    const u = this._user();
    return u ? makeInitials(u.displayName) : '··';
  });
  color = computed(() => {
    const u = this._user();
    return u ? pickAccent(u.id) : '#888';
  });
}
