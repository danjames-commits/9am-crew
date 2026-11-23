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
