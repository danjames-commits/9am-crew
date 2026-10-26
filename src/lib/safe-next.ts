/** A post-sign-in destination that stays on this site; anything else becomes '/'. */
export function safeNext(raw: string | null | undefined, origin: string): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  try {
    const u = new URL(raw, origin);
    return u.origin === origin ? u.pathname + u.search : '/';
  } catch {
    return '/';
  }
}
