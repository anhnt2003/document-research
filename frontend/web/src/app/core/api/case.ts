const CAMEL_TO_SNAKE = /[A-Z]/g;
const SNAKE_TO_CAMEL = /_([a-z0-9])/g;

export function camelToSnake(key: string): string {
  return key.replace(CAMEL_TO_SNAKE, (m) => `_${m.toLowerCase()}`);
}

export function snakeToCamel(key: string): string {
  return key.replace(SNAKE_TO_CAMEL, (_m, c: string) => c.toUpperCase());
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function transformKeys(
  value: unknown,
  transform: (key: string) => string
): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => transformKeys(v, transform));
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[transform(k)] = transformKeys(v, transform);
    }
    return out;
  }
  return value;
}

export function toSnake<T = unknown>(value: T): T {
  return transformKeys(value, camelToSnake) as T;
}

export function toCamel<T = unknown>(value: T): T {
  return transformKeys(value, snakeToCamel) as T;
}
