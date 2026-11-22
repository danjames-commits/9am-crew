# Chat Reactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let chat members see who reacted to a message, and make reacting work like iMessage and Instagram: hold for a menu, double-tap for ❤️, one pill on the bubble's corner, with haptics.

**Architecture:** Three pure, unit-tested modules carry the logic:
- `src/lib/reactions.ts`: pill summary, per-person list, label.
- `src/lib/useMessagePress.ts`: a `pressMachine` that handles hold and double-tap timing, plus a thin React hook around it.
- `src/lib/haptics.ts`: `navigator.vibrate`, with an iPhone switch-input fallback.

A new `ReactionMenu` component renders the hold menu. `ChatRoom.tsx` wires them together and replaces the old chips and picker. There are no database changes.

**Tech Stack:** Next.js App Router (client component), React 19, Supabase JS (realtime is already subscribed), TypeScript, Vitest (node environment, `src/**/*.test.ts` only), and plain CSS in `src/app/globals.css`.

**Spec:** `docs/superpowers/specs/2026-11-22-chat-reactions-design.md`

## Global Constraints

- No schema changes and no migrations. The six emoji stay `👍 ❤️ 😂 🔥 💪 🎉`, in that order (the DB check constraint requires it).
- A person may still have several different emoji on one message.
- Hold is 450 ms and is cancelled by more than 10 px of movement. Double-tap means a second release within 300 ms and 30 px of the first, on the same message.
- A single tap on a message does nothing. Links still open.
- A double-tap only ever *adds* ❤️. It never removes it.
- Don't change PR cards or cheers (`PrCard`, `CheerPop`, the `cheers` table).
- No new npm dependencies.
- Colours come from existing CSS variables only, and must work in light and dark (`:root[data-dark]`). Animations must be turned off under `prefers-reduced-motion`.
- Copy, exactly:
  - menu heading "Reactions"
  - your own name in the list "You"
  - pill label "`N` reactions: `emoji n`, …. Show who reacted." ("1 reaction" when there's one)
  - keyboard hint in the bubble label "Press Enter for reactions."
- Tests: `npm test`. Type-check: `npx tsc --noEmit`.
- Work on branch `feat/chat-reactions`, created from `docs/chat-reactions-design`.
- Commits end with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Map

| File | Status | Responsibility |
|---|---|---|
| `src/lib/reactions.ts` | Create | `Reaction` type, `REACTIONS`, `same`, `summarize`, `byPerson`, `pillLabel` |
| `src/lib/reactions.test.ts` | Create | Unit tests for the above |
| `src/lib/haptics.ts` | Create | `haptic(ms)`: vibrate, or the iPhone switch fallback |
| `src/lib/haptics.test.ts` | Create | Unit tests with stubbed globals |
| `src/lib/useMessagePress.ts` | Create | `pressMachine` (pure timing) + `useMessagePress` hook (DOM props) |
| `src/lib/useMessagePress.test.ts` | Create | Fake-timer tests of `pressMachine` |
| `src/components/ReactionMenu.tsx` | Create | Hold-menu overlay: emoji bar, message preview, who-reacted list |
| `src/components/ChatRoom.tsx` | Modify | Pill, menu, gestures, names fix, delete rollback, pop, close on delete |
| `src/app/globals.css` | Modify | Replace `.reactions`/`.react-chip`/`.react-pick` with pill and menu styles |

---

### Task 0: Branch

- [ ] **Step 1: Create the feature branch**

```bash
git switch docs/chat-reactions-design
git switch -c feat/chat-reactions
```

---

### Task 1: Reaction helpers

**Files:**
- Create: `src/lib/reactions.ts`
- Test: `src/lib/reactions.test.ts`

**Interfaces:**
- Produces:
  - `interface Reaction { message_id: number; user_id: string; emoji: string }`
  - `const REACTIONS: readonly ['👍','❤️','😂','🔥','💪','🎉']`
  - `same(a: Reaction, b: Reaction): boolean`
  - `interface Summary { top: string[]; total: number; mine: boolean; counts: { emoji: string; n: number }[] }`
  - `summarize(list: Reaction[], meId: string): Summary`. `list` must already be filtered to one message.
  - `byPerson(list: Reaction[], meId: string): { userId: string; emojis: string[] }[]`
  - `pillLabel(s: Summary): string`

- [ ] **Step 1: Write the failing tests**

`src/lib/reactions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { byPerson, pillLabel, REACTIONS, same, summarize, type Reaction } from './reactions';

const r = (user_id: string, emoji: string, message_id = 1): Reaction => ({ message_id, user_id, emoji });

describe('REACTIONS', () => {
  it('matches the database check constraint, in order', () => {
    expect([...REACTIONS]).toEqual(['👍', '❤️', '😂', '🔥', '💪', '🎉']);
  });
});

describe('same', () => {
  it('compares message, user and emoji', () => {
    expect(same(r('a', '👍'), r('a', '👍'))).toBe(true);
    expect(same(r('a', '👍'), r('a', '❤️'))).toBe(false);
    expect(same(r('a', '👍'), r('b', '👍'))).toBe(false);
    expect(same(r('a', '👍', 1), r('a', '👍', 2))).toBe(false);
  });
});

describe('summarize', () => {
  it('is empty for no reactions', () => {
    expect(summarize([], 'me')).toEqual({ top: [], total: 0, mine: false, counts: [] });
  });

  it('puts the most used first, caps top at 3, and counts every reaction', () => {
    const list = [r('a', '👍'), r('a', '❤️'), r('b', '❤️'), r('c', '❤️'), r('b', '😂'), r('c', '😂'), r('d', '🔥'), r('e', '🔥')];
    const s = summarize(list, 'me');
    expect(s.top).toEqual(['❤️', '😂', '🔥']);
    expect(s.total).toBe(8);
    expect(s.counts).toEqual([
      { emoji: '❤️', n: 3 },
      { emoji: '😂', n: 2 },
      { emoji: '🔥', n: 2 },
      { emoji: '👍', n: 1 },
    ]);
  });

  it('breaks ties by the order of the emoji set', () => {
    expect(summarize([r('a', '🎉'), r('b', '👍')], 'me').top).toEqual(['👍', '🎉']);
  });

  it('flags when one of the reactions is mine', () => {
    expect(summarize([r('a', '👍')], 'me').mine).toBe(false);
    expect(summarize([r('a', '👍'), r('me', '🔥')], 'me').mine).toBe(true);
  });
});

describe('byPerson', () => {
  it('puts me first, then others by first reaction, emoji in set order', () => {
    const list = [r('b', '🔥'), r('a', '❤️'), r('me', '😂'), r('b', '👍')];
    expect(byPerson(list, 'me')).toEqual([
      { userId: 'me', emojis: ['😂'] },
      { userId: 'b', emojis: ['👍', '🔥'] },
      { userId: 'a', emojis: ['❤️'] },
    ]);
  });

  it('keeps arrival order when I have not reacted', () => {
    expect(byPerson([r('b', '👍'), r('a', '👍')], 'me').map((p) => p.userId)).toEqual(['b', 'a']);
  });

  it('is empty for no reactions', () => {
    expect(byPerson([], 'me')).toEqual([]);
  });
});

describe('pillLabel', () => {
  it('lists every emoji with its count', () => {
    const list = [r('a', '❤️'), r('b', '❤️'), r('c', '❤️'), r('a', '😂'), r('b', '😂'), r('c', '🔥'), r('d', '🔥')];
    expect(pillLabel(summarize(list, 'me'))).toBe('7 reactions: ❤️ 3, 😂 2, 🔥 2. Show who reacted.');
  });

  it('uses the singular for one', () => {
    expect(pillLabel(summarize([r('a', '👍')], 'me'))).toBe('1 reaction: 👍 1. Show who reacted.');
  });
});
```

- [ ] **Step 2: Run the tests to check they fail**

Run: `npx vitest run src/lib/reactions.test.ts`
Expected: FAIL, because `./reactions` can't be resolved.

- [ ] **Step 3: Implement**

`src/lib/reactions.ts`:

```ts
/** Emoji reactions on chat messages (table message_reactions, migration 027). */
export interface Reaction {
  message_id: number;
  user_id: string;
  emoji: string;
}

/** The six emoji, in display order. Must match the database check constraint. */
export const REACTIONS = ['👍', '❤️', '😂', '🔥', '💪', '🎉'] as const;

export const same = (a: Reaction, b: Reaction) => a.message_id === b.message_id && a.user_id === b.user_id && a.emoji === b.emoji;

export interface Summary {
  /** Up to three distinct emoji, most used first (ties in set order). */
  top: string[];
  total: number;
  /** One of these reactions is mine. */
  mine: boolean;
  counts: { emoji: string; n: number }[];
}

/** What the pill on a message shows. `list` is one message's reactions. */
export function summarize(list: Reaction[], meId: string): Summary {
  // Array.prototype.sort is stable, so equal counts keep the set order.
  const counts = REACTIONS.map((emoji) => ({ emoji: emoji as string, n: list.filter((r) => r.emoji === emoji).length }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n);
  return { top: counts.slice(0, 3).map((c) => c.emoji), total: list.length, mine: list.some((r) => r.user_id === meId), counts };
}

/** Who reacted, one row per person: me first, then everyone else by their first reaction. */
export function byPerson(list: Reaction[], meId: string): { userId: string; emojis: string[] }[] {
  const order: string[] = [];
  for (const r of list) if (!order.includes(r.user_id)) order.push(r.user_id);
  const ids = order.includes(meId) ? [meId, ...order.filter((id) => id !== meId)] : order;
  return ids.map((userId) => ({ userId, emojis: REACTIONS.filter((e) => list.some((r) => r.user_id === userId && r.emoji === e)) }));
}

/** Screen-reader label for the pill. */
export function pillLabel(s: Summary): string {
  const parts = s.counts.map((c) => `${c.emoji} ${c.n}`).join(', ');
  return `${s.total} ${s.total === 1 ? 'reaction' : 'reactions'}: ${parts}. Show who reacted.`;
}
```

- [ ] **Step 4: Run the tests to check they pass**

Run: `npx vitest run src/lib/reactions.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/reactions.ts src/lib/reactions.test.ts
git commit -m "Chat reactions: pure helpers for the pill summary and who-reacted list

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Haptics helper

**Files:**
- Create: `src/lib/haptics.ts`
- Test: `src/lib/haptics.test.ts`

**Interfaces:**
- Produces: `haptic(ms?: number): void`. It is safe to call during server rendering (it does nothing there).

**Background:** iPhone Safari has no `navigator.vibrate`. Since Safari 18, toggling a native `<input type="checkbox" switch>` plays the system haptic, so we keep one hidden `<label>` wrapping that input and `click()` the label. This is a widely used workaround, not a documented API. It's tested here with stubbed globals and on a real iPhone in Task 5.

- [ ] **Step 1: Write the failing tests**

`src/lib/haptics.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The module caches its hidden label, so load a fresh copy for each test.
async function load() {
  vi.resetModules();
  return (await import('./haptics')).haptic;
}

function fakeDocument() {
  const made: { tag: string; el: Record<string, unknown> }[] = [];
  const doc = {
    createElement: (tag: string) => {
      const el: Record<string, unknown> = {
        style: {},
        attrs: {} as Record<string, string>,
        children: [] as unknown[],
        setAttribute(k: string, v: string) {
          (this.attrs as Record<string, string>)[k] = v;
        },
        appendChild(c: unknown) {
          (this.children as unknown[]).push(c);
        },
        click: vi.fn(),
      };
      made.push({ tag, el });
      return el;
    },
    body: { appendChild: vi.fn() },
  };
  return { doc, made };
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe('haptic', () => {
  it('does nothing on the server', async () => {
    vi.stubGlobal('window', undefined);
    const haptic = await load();
    expect(() => haptic()).not.toThrow();
  });

  it('uses navigator.vibrate when the browser has it', async () => {
    const vibrate = vi.fn();
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', { vibrate });
    const haptic = await load();
    haptic(12);
    expect(vibrate).toHaveBeenCalledWith(12);
  });

  it('defaults to 10 ms', async () => {
    const vibrate = vi.fn();
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', { vibrate });
    const haptic = await load();
    haptic();
    expect(vibrate).toHaveBeenCalledWith(10);
  });

  it('on iPhone, clicks one hidden switch, made once and reused', async () => {
    const { doc, made } = fakeDocument();
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('document', doc);
    const haptic = await load();
    haptic();
    haptic();
    const label = made.find((m) => m.tag === 'label')!.el;
    const input = made.find((m) => m.tag === 'input')!.el;
    expect(made.filter((m) => m.tag === 'label')).toHaveLength(1);
    expect(input.type).toBe('checkbox');
    expect((input.attrs as Record<string, string>).switch).toBe('');
    expect(label.children).toContain(input);
    expect(doc.body.appendChild).toHaveBeenCalledTimes(1);
    expect(label.click).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run the tests to check they fail**

Run: `npx vitest run src/lib/haptics.test.ts`
Expected: FAIL, because `./haptics` can't be resolved.

- [ ] **Step 3: Implement**

`src/lib/haptics.ts`:

```ts
/**
 * A short haptic tap.
 *
 * Android Chrome (and most browsers) have navigator.vibrate. iPhone Safari doesn't, but since
 * Safari 18, toggling a native <input type="checkbox" switch> plays the system haptic, so we
 * click a hidden one. That's a known workaround, not a documented API; it does nothing where
 * neither works.
 */
let label: HTMLLabelElement | null = null;

export function haptic(ms = 10): void {
  if (typeof window === 'undefined') return;
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(ms);
    return;
  }
  if (typeof document === 'undefined') return;
  if (!label) {
    label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
  }
  label.click();
}
```

- [ ] **Step 4: Run the tests to check they pass**

Run: `npx vitest run src/lib/haptics.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/haptics.ts src/lib/haptics.test.ts
git commit -m "Haptics helper: vibrate where supported, native-switch fallback on iPhone

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Press machine and hook

**Files:**
- Create: `src/lib/useMessagePress.ts`
- Test: `src/lib/useMessagePress.test.ts`

**Interfaces:**
- Consumes: `haptic()` from `src/lib/haptics.ts` (Task 2).
- Produces:
  - `HOLD_MS = 450`, `MOVE_PX = 10`, `DOUBLE_MS = 300`, `DOUBLE_PX = 30`
  - `pressMachine(cb: { onHold(id: string): void; onDoubleTap(id: string): void })`, which returns `{ down(id, x, y), move(x, y), up(x, y), cancel(), click(): boolean, dispose() }`. `click()` returns `true` when the click should be swallowed.
  - `useMessagePress(cb: { onHold(id: number): void; onDoubleTap(id: number): void })`, which returns React props: `onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`, `onPointerLeave`, `onClickCapture`, `onContextMenu`, `onKeyDown`. Spread them on an element that carries `data-id={message.id}`.

- [ ] **Step 1: Write the failing tests**

`src/lib/useMessagePress.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DOUBLE_MS, HOLD_MS, pressMachine } from './useMessagePress';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => vi.useRealTimers());

function setup() {
  const onHold = vi.fn();
  const onDoubleTap = vi.fn();
  return { m: pressMachine({ onHold, onDoubleTap }), onHold, onDoubleTap };
}
type M = ReturnType<typeof pressMachine>;
const tap = (m: M, id = '1', x = 0, y = 0) => {
  m.down(id, x, y);
  m.up(x, y);
};

describe('hold', () => {
  it('fires at 450 ms, not before', () => {
    const { m, onHold } = setup();
    m.down('1', 0, 0);
    vi.advanceTimersByTime(HOLD_MS - 1);
    expect(onHold).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onHold).toHaveBeenCalledWith('1');
  });

  it('is cancelled by moving more than 10 px (a scroll)', () => {
    const { m, onHold } = setup();
    m.down('1', 0, 0);
    m.move(11, 0);
    vi.advanceTimersByTime(HOLD_MS);
    expect(onHold).not.toHaveBeenCalled();
  });

  it('survives a wobble of 10 px or less', () => {
    const { m, onHold } = setup();
    m.down('1', 0, 0);
    m.move(6, 8); // exactly 10 px
    vi.advanceTimersByTime(HOLD_MS);
    expect(onHold).toHaveBeenCalledTimes(1);
  });

  it('is cancelled by an early release', () => {
    const { m, onHold } = setup();
    m.down('1', 0, 0);
    vi.advanceTimersByTime(200);
    m.up(0, 0);
    vi.advanceTimersByTime(HOLD_MS);
    expect(onHold).not.toHaveBeenCalled();
  });

  it('is cancelled by pointercancel', () => {
    const { m, onHold } = setup();
    m.down('1', 0, 0);
    m.cancel();
    vi.advanceTimersByTime(HOLD_MS);
    expect(onHold).not.toHaveBeenCalled();
  });

  it('swallows exactly one click after a hold', () => {
    const { m } = setup();
    m.down('1', 0, 0);
    vi.advanceTimersByTime(HOLD_MS);
    m.up(0, 0);
    expect(m.click()).toBe(true);
    expect(m.click()).toBe(false);
  });

  it('does not swallow a later click when the post-hold click never came', () => {
    const { m } = setup();
    m.down('1', 0, 0);
    vi.advanceTimersByTime(HOLD_MS);
    m.up(0, 0);
    vi.advanceTimersByTime(1000);
    tap(m);
    expect(m.click()).toBe(false);
  });

  it('does not swallow the click of a plain tap', () => {
    const { m } = setup();
    tap(m);
    expect(m.click()).toBe(false);
  });
});

describe('double-tap', () => {
  it('fires when the second release is within 300 ms', () => {
    const { m, onDoubleTap } = setup();
    tap(m);
    vi.advanceTimersByTime(DOUBLE_MS);
    tap(m);
    expect(onDoubleTap).toHaveBeenCalledWith('1');
  });

  it('does not fire at 301 ms', () => {
    const { m, onDoubleTap } = setup();
    tap(m);
    vi.advanceTimersByTime(DOUBLE_MS + 1);
    tap(m);
    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it('does not fire across two messages', () => {
    const { m, onDoubleTap } = setup();
    tap(m, '1');
    tap(m, '2');
    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it('does not fire when the taps are more than 30 px apart', () => {
    const { m, onDoubleTap } = setup();
    tap(m, '1', 0, 0);
    tap(m, '1', 40, 0);
    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it('does not count a hold as the first tap', () => {
    const { m, onDoubleTap } = setup();
    m.down('1', 0, 0);
    vi.advanceTimersByTime(HOLD_MS);
    m.up(0, 0);
    tap(m);
    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it('fires once for a triple tap', () => {
    const { m, onDoubleTap } = setup();
    tap(m);
    tap(m);
    tap(m);
    expect(onDoubleTap).toHaveBeenCalledTimes(1);
  });

  it('does not count a scroll as a tap', () => {
    const { m, onDoubleTap } = setup();
    m.down('1', 0, 0);
    m.move(0, 50);
    m.up(0, 50);
    tap(m, '1', 0, 50);
    expect(onDoubleTap).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to check they fail**

Run: `npx vitest run src/lib/useMessagePress.test.ts`
Expected: FAIL, because `./useMessagePress` can't be resolved.

- [ ] **Step 3: Implement**

`src/lib/useMessagePress.ts`:

```ts
import { useEffect, useMemo, useRef } from 'react';
import { haptic } from './haptics';

export const HOLD_MS = 450;
export const MOVE_PX = 10;
export const DOUBLE_MS = 300;
export const DOUBLE_PX = 30;

/**
 * Hold and double-tap on chat messages, without the DOM, so it can be tested with fake timers.
 * Hold: down, then 450 ms without moving more than 10 px or letting go.
 * Double-tap: two releases on the same message within 300 ms and 30 px. A hold never counts as a tap.
 */
export function pressMachine(cb: { onHold(id: string): void; onDoubleTap(id: string): void }) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let start: { id: string; x: number; y: number } | null = null;
  let held = false;
  let swallow = false;
  let last: { id: string; x: number; y: number; t: number } | null = null;
  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  return {
    down(id: string, x: number, y: number) {
      clear();
      start = { id, x, y };
      held = false;
      swallow = false;
      timer = setTimeout(() => {
        timer = undefined;
        held = true;
        swallow = true;
        last = null;
        cb.onHold(id);
      }, HOLD_MS);
    },
    move(x: number, y: number) {
      if (start && timer !== undefined && Math.hypot(x - start.x, y - start.y) > MOVE_PX) {
        clear();
        start = null;
        last = null;
      }
    },
    up(x: number, y: number) {
      const s = start;
      clear();
      start = null;
      if (!s || held) {
        held = false;
        return;
      }
      const t = Date.now();
      if (last && last.id === s.id && t - last.t <= DOUBLE_MS && Math.hypot(x - last.x, y - last.y) <= DOUBLE_PX) {
        last = null;
        cb.onDoubleTap(s.id);
      } else {
        last = { id: s.id, x, y, t };
      }
    },
    cancel() {
      clear();
      start = null;
    },
    /** True if this click follows a hold and should be swallowed (so a held link doesn't open). */
    click() {
      if (!swallow) return false;
      swallow = false;
      return true;
    },
    dispose() {
      clear();
    },
  };
}

const idOf = (e: { currentTarget: EventTarget }) => Number((e.currentTarget as HTMLElement).dataset.id);

/**
 * One shared set of props for every message element in the chat. Each element carries
 * data-id={message.id}; the callbacks get that id. Hold gives a haptic tap.
 */
export function useMessagePress(cb: { onHold(id: number): void; onDoubleTap(id: number): void }) {
  const latest = useRef(cb);
  latest.current = cb;
  const m = useMemo(
    () =>
      pressMachine({
        onHold: (id) => {
          haptic();
          latest.current.onHold(Number(id));
        },
        onDoubleTap: (id) => latest.current.onDoubleTap(Number(id)),
      }),
    [],
  );
  useEffect(() => () => m.dispose(), [m]);
  return useMemo(
    () => ({
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        if (e.button !== 0) return; // right-click goes through onContextMenu
        m.down(String(idOf(e)), e.clientX, e.clientY);
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => m.move(e.clientX, e.clientY),
      onPointerUp: (e: React.PointerEvent<HTMLElement>) => m.up(e.clientX, e.clientY),
      onPointerCancel: () => m.cancel(),
      onPointerLeave: () => m.cancel(),
      onClickCapture: (e: React.MouseEvent<HTMLElement>) => {
        if (m.click()) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      onContextMenu: (e: React.MouseEvent<HTMLElement>) => {
        // Right-click on a computer; on Android this also fires after a long press (same menu, no-op).
        e.preventDefault();
        m.cancel();
        latest.current.onHold(idOf(e));
      },
      onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.target !== e.currentTarget) return; // a focused link inside handles its own keys
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          latest.current.onHold(idOf(e));
        }
      },
    }),
    [m],
  );
}
```

- [ ] **Step 4: Run the tests to check they pass**

Run: `npx vitest run src/lib/useMessagePress.test.ts`
Expected: PASS (15 tests).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/useMessagePress.ts src/lib/useMessagePress.test.ts
git commit -m "Chat: hold and double-tap gesture machine and hook, with haptic on hold

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Reaction menu, pill and ChatRoom wiring

There are no unit tests in this task: the test setup only runs `.ts` in node, and this task is all components. All the logic it uses was tested in Tasks 1–3. Type-checking is the gate here, and the behaviour is checked by hand in Task 5.

**Files:**
- Create: `src/components/ReactionMenu.tsx`
- Modify: `src/components/ChatRoom.tsx` (whole reaction section; line refs are from the current file)
- Modify: `src/app/globals.css:721-733` (the "Emoji reactions in the chat" block) and `:819` (dark overrides)

**Interfaces:**
- Consumes: `Reaction`, `REACTIONS`, `same`, `summarize`, `byPerson`, `pillLabel` (Task 1); `haptic` (Task 2); `useMessagePress` (Task 3); `Avatar` from `./Avatar` (`{ id, name, animal?, size? }`); `firstName` from `@/lib/ui`.
- Produces: `ReactionMenu({ preview: ReactNode; reactions: Reaction[]; meId: string; people: Record<string, { name: string; animal?: string | null }>; onToggle(emoji: string): void; onClose(): void })`. `onClose` must be referentially stable (wrap it in `useCallback`).

- [ ] **Step 1: Create `src/components/ReactionMenu.tsx`**

```tsx
'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { Avatar } from './Avatar';
import { firstName } from '@/lib/ui';
import { byPerson, REACTIONS, type Reaction } from '@/lib/reactions';

/**
 * Hold a message (or tap its reactions): pick an emoji, and see who reacted with what.
 * Uses plain Avatar, not PersonAvatar: PersonAvatar's own sheet would open underneath this one.
 */
export function ReactionMenu({
  preview,
  reactions,
  meId,
  people,
  onToggle,
  onClose,
}: {
  /** A non-interactive copy of the message. */
  preview: ReactNode;
  /** This message's reactions. */
  reactions: Reaction[];
  meId: string;
  people: Record<string, { name: string; animal?: string | null }>;
  onToggle: (emoji: string) => void;
  /** Must be stable (useCallback). */
  onClose: () => void;
}) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    bar.current?.querySelector('button')?.focus();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      back?.focus?.();
    };
  }, [onClose]);

  const rows = byPerson(reactions, meId);
  return (
    <div
      className="react-menu"
      // pointerdown, not click: the hold that opened this menu ends with a pointerup over it.
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="react-menu-col" role="dialog" aria-modal="true" aria-label="Reactions">
        <div className="react-menu-bar" ref={bar} role="group" aria-label="React">
          {REACTIONS.map((e) => {
            const on = reactions.some((r) => r.emoji === e && r.user_id === meId);
            return (
              <button
                key={e}
                type="button"
                aria-pressed={on}
                aria-label={on ? `Remove your ${e}` : `React ${e}`}
                onClick={() => {
                  onToggle(e);
                  onClose();
                }}
              >
                {e}
              </button>
            );
          })}
        </div>
        <div className="react-menu-preview" aria-hidden="true">
          {preview}
        </div>
        {rows.length > 0 && (
          <div className="react-menu-list">
            <div className="eyebrow">Reactions</div>
            {rows.map(({ userId, emojis }) => {
              const me = userId === meId;
              const who = people[userId];
              const full = who?.name ?? 'Member';
              return (
                <div key={userId} className="react-menu-row">
                  <Avatar id={userId} name={full} animal={who?.animal} size="sm" />
                  <span className="grow">{me ? 'You' : firstName(full)}</span>
                  <span className="react-menu-emojis">
                    {emojis.map((e) =>
                      me ? (
                        <button key={e} type="button" aria-label={`Remove your ${e}`} onClick={() => onToggle(e)}>
                          {e}
                        </button>
                      ) : (
                        <span key={e}>{e}</span>
                      ),
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update the imports and types in `ChatRoom.tsx`**

Change the React import on line 3 to include `useCallback`:

```ts
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
```

Add these after the `CheerPop` import (line 11):

```ts
import { ReactionMenu } from './ReactionMenu';
import { pillLabel, same, summarize, type Reaction } from '@/lib/reactions';
import { haptic } from '@/lib/haptics';
import { useMessagePress } from '@/lib/useMessagePress';
```

Replace lines 25–30 (the local `Reaction` interface and `REACTIONS` const) with a re-export, so existing imports keep working:

```ts
export { REACTIONS, type Reaction } from '@/lib/reactions';
```

Delete the local `same` at the bottom of the file (line 352). It now comes from `@/lib/reactions`.

- [ ] **Step 3: Replace the picker state (lines 59–66)**

Remove `picking` and its outside-pointerdown effect. Put this in their place:

```ts
  // The message whose reaction menu is open (hold a message, or tap its reactions).
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const openMenu = useCallback((id: number) => setMenuFor(id), []);
  const closeMenu = useCallback(() => setMenuFor(null), []);
  // The pill that just got a new reaction pops once; n restarts the animation.
  const [pop, setPop] = useState<{ id: number; n: number } | null>(null);
  const bump = (id: number) => setPop({ id, n: Date.now() });
```

- [ ] **Step 4: Pop on reactions that arrive live (lines 115–118)**

Replace the `message_reactions` INSERT handler with:

```ts
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions' }, (p) => {
        const r = p.new as Reaction;
        setReactions((list) => (list.some((x) => same(x, r)) ? list : [...list, r]));
        if (r.user_id !== meId) setPop({ id: r.message_id, n: Date.now() });
      })
```

Change that effect's dependency array from `[supabase]` to `[supabase, meId]`.

- [ ] **Step 5: Close the menu if its message is deleted**

Add this after the realtime effect:

```ts
  // If the message is deleted while its menu is open, close the menu.
  useEffect(() => {
    if (menuFor != null && !messages.some((m) => m.id === menuFor)) setMenuFor(null);
  }, [messages, menuFor]);
```

- [ ] **Step 6: Look up names of people who reacted (lines 130–143)**

Replace the first line of the "Look up names of anyone new" effect body and its dependency array:

```ts
  // Look up names of anyone new, including people who reacted but never posted.
  useEffect(() => {
    const ids = [...messages.map((m) => m.user_id), ...reactions.map((r) => r.user_id)];
    const missing = [...new Set(ids)].filter((id): id is string => !!id && !(id in names));
```

Leave the rest of the body as it is, and change the dependencies to `[messages, reactions, names, supabase]`.

Add a `people` map under that effect:

```ts
  const people = useMemo(
    () => Object.fromEntries(Object.keys(names).map((id) => [id, { name: names[id], animal: animals[id] }])),
    [names, animals],
  );
```

- [ ] **Step 7: Replace `toggleReaction`, `reactionsFor` and `openPicker` (lines 178–222)**

```ts
  async function toggleReaction(messageId: number, emoji: string) {
    haptic();
    const r = { message_id: messageId, user_id: meId, emoji };
    if (reactions.some((x) => same(x, r))) {
      setReactions((l) => l.filter((x) => !same(x, r)));
      const { error } = await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', meId).eq('emoji', emoji);
      if (error) setReactions((l) => (l.some((x) => same(x, r)) ? l : [...l, r]));
    } else {
      setReactions((l) => [...l, r]);
      bump(messageId);
      const { error } = await supabase.from('message_reactions').insert({ message_id: messageId, emoji });
      if (error) setReactions((l) => l.filter((x) => !same(x, r)));
    }
  }

  /** Double-tap: add a ❤️ (never removes it, like Instagram). */
  function doubleTapHeart(messageId: number) {
    if (reactions.some((r) => r.message_id === messageId && r.user_id === meId && r.emoji === '❤️')) return;
    toggleReaction(messageId, '❤️');
  }

  const press = useMessagePress({ onHold: openMenu, onDoubleTap: doubleTapHeart });
  /** Gesture and keyboard props for a message you can react to. */
  const pressProps = (m: ChatMessage, label: string) => ({
    ...press,
    'data-id': m.id,
    tabIndex: 0,
    role: 'button',
    'aria-haspopup': 'dialog' as const,
    'aria-label': `${label} Press Enter for reactions.`,
  });

  /** The reactions pill on a message's bottom corner. */
  function pillFor(m: ChatMessage, align: 'left' | 'right') {
    const these = reactions.filter((r) => r.message_id === m.id);
    if (!these.length) return null;
    const s = summarize(these, meId);
    const popN = pop?.id === m.id ? pop.n : null;
    return (
      <button
        key={popN ?? 'pill'}
        type="button"
        className={`react-pill ${align} ${s.mine ? 'mine' : ''} ${popN ? 'pop' : ''}`}
        aria-label={pillLabel(s)}
        onClick={() => openMenu(m.id)}
      >
        {s.top.join('')}
        {s.total > 1 && <span>{s.total}</span>}
      </button>
    );
  }
  const hostClass = (m: ChatMessage) => (reactions.some((r) => r.message_id === m.id) ? 'react-host has-pill' : 'react-host');

  /** What the menu shows of the message. */
  function previewOf(m: ChatMessage) {
    const text = m.kind === 'milestone' ? `🎉 ${parseInt(m.body, 10) || 0} classes` : m.body;
    const mine = m.kind === 'text' && m.user_id === meId;
    return (
      <div className={`bubble react-menu-msg ${mine ? 'mine' : ''}`}>
        <p className="pre">{text}</p>
      </div>
    );
  }
```

- [ ] **Step 8: Wire up the recap row (lines 225–235)**

```tsx
    if (m.kind === 'recap') {
      return (
        <div key={m.id} className={`stack tight ${hostClass(m)}`}>
          <div className="card teal stack tight reactable" {...pressProps(m, 'Friday recap.')}>
            <div className="eyebrow teal">Friday recap</div>
            <p className="pre">{m.body}</p>
          </div>
          {pillFor(m, 'left')}
        </div>
      );
    }
```

- [ ] **Step 9: Wire up the milestone row (lines 238–256)**

```tsx
    if (m.kind === 'milestone') {
      const n = parseInt(m.body, 10) || 0;
      return (
        <div key={m.id} className={`stack tight ${hostClass(m)}`}>
          <div className="milestone-card reactable" title={timeAgo(m.created_at)} {...pressProps(m, `${mine ? 'Your' : `${firstName(name)}’s`} ${n} classes.`)}>
            {m.user_id && <PersonAvatar id={m.user_id} name={name} animal={animals[m.user_id]} />}
            <div className="grow">
              <div className="milestone-n">🎉 {n} classes</div>
              <div className="small">
                {mine ? 'You’ve' : `${firstName(name)} has`} shown up for {n} classes. {n >= 100 ? 'Legend.' : n >= 50 ? 'That’s a habit.' : 'Keep it rolling!'}
              </div>
            </div>
          </div>
          {pillFor(m, 'left')}
        </div>
      );
    }
```

- [ ] **Step 10: Wire up the text bubble (lines 283–289)**

```tsx
        <div className={`bubble-wrap ${mine ? 'mine' : ''} ${hostClass(m)}`}>
          <div className={`bubble reactable ${mine ? 'mine' : ''}`} title={timeAgo(m.created_at)} {...pressProps(m, `Message from ${mine ? 'you' : firstName(name)}.`)}>
            {showName && <div className="who">{firstName(name)}</div>}
            <Linkify text={m.body} />
          </div>
          {pillFor(m, mine ? 'right' : 'left')}
        </div>
```

- [ ] **Step 11: Render the menu**

In the returned JSX, after the `{error && …}` line and before the closing `</>`, add:

```tsx
      {menuFor != null &&
        (() => {
          const m = messages.find((x) => x.id === menuFor);
          return m ? (
            <ReactionMenu
              preview={previewOf(m)}
              reactions={reactions.filter((r) => r.message_id === m.id)}
              meId={meId}
              people={people}
              onToggle={(e) => toggleReaction(m.id, e)}
              onClose={closeMenu}
            />
          ) : null;
        })()}
```

- [ ] **Step 12: Update the comment in `Linkify.tsx` (line 20)**

```ts
        // A tap on a link opens it; it never reaches the message's gesture handling.
```

- [ ] **Step 13: Replace the CSS in `src/app/globals.css`**

Replace the whole "Emoji reactions in the chat" block (lines 721–733, from `/* Emoji reactions in the chat */` through the `.react-pick button[aria-pressed='true']` rule) with:

```css
/* Emoji reactions in the chat: hold a message for the menu, double-tap for ❤️. */
.reactable { cursor: pointer; -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; touch-action: manipulation; }
.reactable:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
.bubble-wrap { display: flex; flex-direction: column; align-items: flex-start; max-width: 80%; }
.bubble-wrap.mine { align-items: flex-end; margin-left: auto; }
.bubble-wrap .bubble { max-width: 100%; }
.react-host { position: relative; }
.react-host.has-pill { margin-bottom: 14px; }
.react-pill { position: absolute; bottom: -14px; left: 10px; z-index: 1; display: inline-flex; align-items: center; min-height: 26px; padding: 1px 8px; border-radius: 13px; border: 1px solid var(--line); background: var(--card); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12); font: inherit; font-size: 14px; letter-spacing: 1px; cursor: pointer; }
.react-pill.right { left: auto; right: 10px; }
.react-pill span { margin-left: 4px; letter-spacing: 0; font-size: 12px; font-weight: 800; color: var(--ink-2); }
.react-pill.mine { border-color: var(--teal); background: var(--teal-soft); }
.react-pill.pop { animation: pill-pop 0.2s ease-out; }
@keyframes pill-pop { 50% { transform: scale(1.25); } }
.react-menu { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; padding: 24px; background: rgba(28, 35, 33, 0.45); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); animation: sheet-in 0.15s ease-out; }
.react-menu-col { display: grid; justify-items: center; gap: 10px; width: min(360px, 100%); animation: card-in 0.18s ease-out; }
.react-menu-bar { display: flex; gap: 2px; padding: 4px; border-radius: 26px; background: var(--card); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2); }
.react-menu-bar button { width: 44px; height: 44px; border: 0; border-radius: 50%; background: transparent; font-size: 24px; cursor: pointer; }
.react-menu-bar button[aria-pressed='true'] { background: var(--teal-soft); }
.react-menu-preview { width: 100%; display: flex; justify-content: center; pointer-events: none; }
.react-menu-msg { max-width: 100%; max-height: 30vh; overflow: hidden; }
.react-menu-list { width: 100%; max-height: 40vh; overflow-y: auto; display: grid; gap: 6px; padding: 10px 12px; border-radius: 18px; background: var(--card); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2); }
.react-menu-row { display: flex; align-items: center; gap: 10px; min-height: 40px; font-weight: 700; }
.react-menu-emojis { display: flex; gap: 2px; font-size: 20px; }
.react-menu-emojis button { min-width: 36px; height: 36px; border: 0; border-radius: 18px; background: var(--teal-soft); font-size: 20px; cursor: pointer; }
@media (prefers-reduced-motion: reduce) { .react-menu, .react-menu-col, .react-pill.pop { animation: none; } }
```

Update the dark override on line 819 so the menu backdrop matches the other sheets:

```css
:root[data-dark] .who-x, :root[data-dark] .person-sheet, :root[data-dark] .react-menu { background: rgba(0, 0, 0, 0.6); }
```

- [ ] **Step 14: Check that nothing else uses the removed classes or names**

Run: `git grep -n -e "react-chip" -e "react-pick" -e "\.reactions\b" -e "picking" -e "openPicker" -e "reactionsFor" -- src`
Expected: no matches.

- [ ] **Step 15: Type-check and run all tests**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all suites pass, including the 3 new ones.

- [ ] **Step 16: Commit**

```bash
git add src/components/ReactionMenu.tsx src/components/ChatRoom.tsx src/components/Linkify.tsx src/app/globals.css
git commit -m "Chat: hold a message for reactions and who reacted, double-tap for heart, one pill per message, haptics

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Verify in the app

The chat needs a signed-in, approved account. Ask Jake to sign in in the preview pane; don't enter credentials yourself. Use `superpowers:verification-before-completion`.

- [ ] **Step 1: Start the dev server in the preview pane**

If there's no `.claude/launch.json`, create it:

```json
{
  "version": "0.0.1",
  "configurations": [{ "name": "dev", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 3000 }]
}
```

Then run `preview_start` with name `dev`, emulate the `mobile` viewport, and open `/chat`.

- [ ] **Step 2: Check each item and note pass or fail**

- Holding a text bubble opens the menu. Toggling an emoji adds or removes it and closes the menu, and the pill updates and pops.
- The menu lists real first names, with "You" first. Tapping your own emoji in the list removes it and keeps the menu open.
- Someone who has reacted but never posted shows their name, not "Member".
- Double-tapping a message without ❤️ adds ❤️. Double-tapping again doesn't remove it.
- Scrolling the chat by dragging on a bubble doesn't open the menu.
- A single tap on a link opens it. Holding a link opens the menu, not the link.
- Recap and milestone cards: holding them opens the menu, and the pill sits bottom-left.
- On desktop (preset `desktop`), right-click opens the menu. Tab to a bubble and press Enter to open it, Escape to close it, and focus goes back to the bubble.
- Dark mode (`colorScheme: dark`): the pill, menu and list are readable.
- A reaction from a second browser or account appears live and pops.
- Tapping the backdrop closes the menu. Releasing a hold does not immediately close it.

- [ ] **Step 3: Haptics on real phones (ask Jake)**

The preview pane can't feel vibration. Ask Jake to check on a deployed preview:
- **Android:** hold, double-tap, and toggling a reaction each give a tap.
- **iPhone:** the same three. If double-tap and toggle buzz but hold doesn't, that's the spec's known risk (WebKit only plays the haptic during a user gesture). The fix then: in `useMessagePress`, move `haptic()` out of the timer callback and call it in `onPointerUp` when the release ends a hold. To support that, add a `wasHold()` accessor to `pressMachine`, plus a test for it.

- [ ] **Step 4: Reset the viewport**

Run `resize_window` with preset `desktop`.
