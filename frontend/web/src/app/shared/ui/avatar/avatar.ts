import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { User } from '../../../core/models';

@Component({
  selector: 'ui-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="initials" [style.background]="user.avatarColor">
      {{ user.initials }}
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-block;
        position: relative;
      }
      .initials {
        display: inline-flex;
        width: var(--size, 32px);
        height: var(--size, 32px);
        align-items: center;
        justify-content: center;
        color: var(--paper-50);
        font-family: var(--font-mono);
        font-size: calc(var(--size, 32px) * 0.34);
        font-weight: 600;
        letter-spacing: 0.04em;
        border-radius: 50%;
        text-transform: uppercase;
        border: 1px solid var(--paper-50);
        box-shadow: 0 0 0 1px var(--rule);
      }
      :host[size='sm'] { --size: 24px; }
      :host[size='md'] { --size: 32px; }
      :host[size='lg'] { --size: 44px; }
      :host[size='xl'] { --size: 72px; }
    `,
  ],
  host: { '[attr.size]': 'size' },
})
export class UiAvatar {
  @Input({ required: true }) user!: User;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
}
