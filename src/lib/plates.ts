// Which plates go on each side of the bar, with the gym's plates and the way people
// actually load a bar: big plates (45, 35, 25, 15, 10) first, and at most one small
// change plate (5, 2.5 or 1) on the outside, never on its own (Dan, Oct 26).

export const GYM_PLATES = [45, 35, 25, 15, 10, 5, 2.5, 1] as const;
export const BIG_PLATES = [45, 35, 25, 15, 10] as const;
export const SMALL_PLATES = [5, 2.5, 1] as const;
export const BARS = [45, 35, 15] as const;

export interface Loading {
  /** Plates for one side, from the middle out. */
  side: number[];
  /** What the bar weighs with these plates. Rounded to the nearest weight that loads cleanly. */
  total: number;
}

const sum = (ps: number[]) => ps.reduce((a, b) => a + b, 0);

/** Every sensible way to load one side: up to 6 big plates, heaviest in, then maybe one small one. */
const SIDES: number[][] = (() => {
  const out: number[][] = [[]];
  const grow = (side: number[], from: number) => {
    for (let i = from; i < BIG_PLATES.length; i++) {
      const next = [...side, BIG_PLATES[i]];
      out.push(next);
      for (const s of SMALL_PLATES) out.push([...next, s]);
      if (next.length < 6) grow(next, i);
    }
  };
  grow([], 0);
  return out;
})();

/** The loadable weight nearest to `weight` (a tie goes to the lighter one). */
function nearest(weight: number, bar: number) {
  let best = bar;
  for (const side of SIDES) {
    const t = bar + 2 * sum(side);
    if (Math.abs(t - weight) < Math.abs(best - weight) - 1e-9 || (Math.abs(Math.abs(t - weight) - Math.abs(best - weight)) < 1e-9 && t < best)) best = t;
  }
  return best;
}

/**
 * Going from one set to the next: plates come off from the outside in, so keep what
 * both sets share next to the collar, take the rest off, put the new ones on.
 */
export function plateChange(from: number[], to: number[]) {
  let keep = 0;
  while (keep < from.length && keep < to.length && from[keep] === to[keep]) keep++;
  return { off: from.slice(keep), on: to.slice(keep) };
}

/** Of the ways to make this weight, the one that's least work from what's on now (then fewest plates). */
function bestSide(total: number, bar: number, now: number[]) {
  let best: number[] = [];
  let cost = Infinity;
  for (const side of SIDES) {
    if (Math.abs(bar + 2 * sum(side) - total) > 1e-9) continue;
    const { off, on } = plateChange(now, side);
    const c = 3 * (off.length + on.length) + 2 * side.length;
    if (c < cost) {
      cost = c;
      best = side;
    }
  }
  return best;
}

/** Plates for one weight, from an empty bar. null if it's lighter than the bar. */
export function loadBar(weight: number, bar: number = 45): Loading | null {
  if (weight < bar) return null;
  const total = nearest(weight, bar);
  return { side: bestSide(total, bar, []), total };
}

/** Plates for a run of sets, building up, each loaded the easiest way from the set before. */
export function planLoads(weights: (number | null)[], bar = 45): (Loading | null)[] {
  let now: number[] = [];
  return weights.map((w) => {
    if (w == null) {
      now = [];
      return { side: [], total: bar };
    }
    if (w < bar) return null;
    const total = nearest(w, bar);
    now = bestSide(total, bar, now);
    return { side: now, total };
  });
}

export const plateList = (ps: number[]) => ps.map((p) => String(p)).join(' + ');
