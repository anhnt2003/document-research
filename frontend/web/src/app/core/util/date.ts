const RTF = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
const DTF = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const DTF_LONG = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});
const DTF_TIME = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(iso: string): string {
  return DTF.format(new Date(iso));
}

export function formatDateLong(iso: string): string {
  return DTF_LONG.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${DTF.format(d)} · ${DTF_TIME.format(d)}`;
}

export function relative(iso: string, ref = new Date()): string {
  const d = new Date(iso);
  const diffSec = Math.round((d.getTime() - ref.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return RTF.format(diffSec, 'second');
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return RTF.format(diffMin, 'minute');
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return RTF.format(diffHr, 'hour');
  const diffDay = Math.round(diffHr / 24);
  if (Math.abs(diffDay) < 7) return RTF.format(diffDay, 'day');
  const diffWk = Math.round(diffDay / 7);
  if (Math.abs(diffWk) < 5) return RTF.format(diffWk, 'week');
  const diffMo = Math.round(diffDay / 30);
  if (Math.abs(diffMo) < 12) return RTF.format(diffMo, 'month');
  return RTF.format(Math.round(diffDay / 365), 'year');
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
