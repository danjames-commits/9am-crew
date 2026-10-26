import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminFromToken } from './auth';

function deps(profile: { is_admin: boolean; approved: boolean } | null, sub: string | null = 'user-1') {
  return {
    verify: async () => sub,
    client: () =>
      ({
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: profile }) }) }) }),
      }) as unknown as SupabaseClient,
  };
}

describe('adminFromToken', () => {
  it('no token → null', async () => {
    expect(await adminFromToken(undefined, deps({ is_admin: true, approved: true }))).toBeNull();
  });
  it('bad token → null', async () => {
    expect(await adminFromToken('x', deps({ is_admin: true, approved: true }, null))).toBeNull();
  });
  it('approved admin → caller with userId', async () => {
    const caller = await adminFromToken('x', deps({ is_admin: true, approved: true }));
    expect(caller?.userId).toBe('user-1');
  });
  it('non-admin → null', async () => {
    expect(await adminFromToken('x', deps({ is_admin: false, approved: true }))).toBeNull();
  });
  it('unapproved admin → null', async () => {
    expect(await adminFromToken('x', deps({ is_admin: true, approved: false }))).toBeNull();
  });
  it('no profile → null', async () => {
    expect(await adminFromToken('x', deps(null))).toBeNull();
  });
});
