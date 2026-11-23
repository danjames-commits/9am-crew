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
