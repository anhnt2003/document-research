import { describe, it, expect } from 'vitest';

import { camelToSnake, snakeToCamel, toCamel, toSnake } from './case';

describe('case helpers', () => {
  it('converts simple camelCase keys to snake_case', () => {
    expect(camelToSnake('idToken')).toBe('id_token');
    expect(camelToSnake('displayName')).toBe('display_name');
    expect(camelToSnake('permissionKeys')).toBe('permission_keys');
  });

  it('converts simple snake_case keys to camelCase', () => {
    expect(snakeToCamel('id_token')).toBe('idToken');
    expect(snakeToCamel('display_name')).toBe('displayName');
    expect(snakeToCamel('permission_keys')).toBe('permissionKeys');
  });

  it('deep-transforms nested objects to snake_case', () => {
    expect(toSnake({ userId: 'u-1', userRoles: [{ roleId: 'r-1' }] })).toEqual({
      user_id: 'u-1',
      user_roles: [{ role_id: 'r-1' }],
    });
  });

  it('deep-transforms nested objects to camelCase', () => {
    expect(
      toCamel({
        user_id: 'u-1',
        user_roles: [{ role_id: 'r-1', is_system: true }],
      })
    ).toEqual({
      userId: 'u-1',
      userRoles: [{ roleId: 'r-1', isSystem: true }],
    });
  });

  it('round-trips arbitrary nested structures', () => {
    const input = {
      token: 't',
      expiresAt: '2026-01-01',
      user: { id: 'u', displayName: 'A', roleIds: ['r1', 'r2'] },
    };
    expect(toCamel(toSnake(input))).toEqual(input);
  });

  it('passes through primitives unchanged', () => {
    expect(toSnake('hello')).toBe('hello');
    expect(toSnake(42)).toBe(42);
    expect(toSnake(null)).toBeNull();
    expect(toSnake(undefined)).toBeUndefined();
  });

  it('does not mutate class instances or non-plain objects', () => {
    const blob = new Blob(['x']);
    expect(toSnake(blob)).toBe(blob);
  });
});
