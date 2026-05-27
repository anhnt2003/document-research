import { Injectable, signal } from '@angular/core';

export type ToastKind = 'error' | 'success' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  error(message: string, durationMs = 5000) {
    this.push('error', message, durationMs);
  }

  success(message: string, durationMs = 3500) {
    this.push('success', message, durationMs);
  }

  info(message: string, durationMs = 3500) {
    this.push('info', message, durationMs);
  }

  dismiss(id: number) {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(kind: ToastKind, message: string, durationMs: number) {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, kind, message }]);
    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
  }
}
