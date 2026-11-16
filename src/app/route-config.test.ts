import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const APP = dirname(fileURLToPath(import.meta.url));

function files(dir: string, name: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name), name) : e.name === name ? [join(dir, e.name)] : [],
  );
}

describe('route config', () => {
  // A loading.tsx only shows when the segment it sits in changes. Without one beside
  // each page, tapping from /workouts into /workouts/[date] (same parent segment)
  // leaves the old screen up until the server finishes.
  it('gives every signed-in page its own loading screen', () => {
    const missing = files(join(APP, '(app)'), 'page.tsx')
      .map(dirname)
      .filter((dir) => !existsSync(join(dir, 'loading.tsx')))
      .map((dir) => relative(APP, dir));
    expect(missing).toEqual([]);
  });

  // Pages read cookies, so they render per request anyway. force-dynamic adds
  // nothing but also turns off fetch caching, e.g. the 30-minute weather cache.
  it("doesn't force pages dynamic", () => {
    const forced = [...files(APP, 'page.tsx'), ...files(APP, 'layout.tsx')]
      .filter((f) => /export const dynamic\s*=\s*['"]force-dynamic['"]/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(APP, f));
    expect(forced).toEqual([]);
  });
});
