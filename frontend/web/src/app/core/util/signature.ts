const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export function makeSignature(seed: string, prefix = 'DOC'): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);
  const letter = ALPHABET[abs % ALPHABET.length];
  const number = (abs % 9000) + 1000;
  return `${prefix}-${letter}${number}`;
}

export function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '··';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ACCENT_PALETTE = [
  '#7A1F25',
  '#B8742A',
  '#4A6B3F',
  '#A3492A',
  '#524A40',
  '#8B2C5A',
  '#2E5C6E',
];

export function pickAccent(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return ACCENT_PALETTE[Math.abs(h) % ACCENT_PALETTE.length];
}
