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

/** Every order a side's big plates can go on in (each order once), with its small plate last. */
function orders(side: number[]): number[][] {
  const small = side.filter((p) => p <= 5);
  const big = side.filter((p) => p > 5);
  const out: number[][] = [];
  const go = (left: number[], acc: number[]) => {
    if (!left.length) return void out.push([...acc, ...small]);
    const tried = new Set<number>();
    left.forEach((p, i) => {
      if (tried.has(p)) return;
      tried.add(p);
      go([...left.slice(0, i), ...left.slice(i + 1)], [...acc, p]);
    });
  };
  go(big, []);
  return out;
}

/** Up to 7 big plates for a work set, so there's room to build up to it one plate at a time. */
const WORK_SIDES: number[][] = (() => {
  const out: number[][] = [[]];
  const grow = (side: number[], from: number) => {
    for (let i = from; i < BIG_PLATES.length; i++) {
      const next = [...side, BIG_PLATES[i]];
      out.push(next);
      for (const s of SMALL_PLATES) out.push([...next, s]);
      if (next.length < 7) grow(next, i);
    }
  };
  grow([], 0);
  return out;
})();

const memo = new Map<string, (Loading | null)[]>();

/**
 * Plates for a run of sets building up to the work weight, the way people load a bar:
 * only ever adding plates, never stripping it. The work set is loaded exactly (to the
 * nearest weight that loads cleanly); warm-ups land wherever the stack gets to, close to
 * their target (a few pounds either way doesn't matter on a warm-up). Dan, Oct 26.
 */
export function planLoads(weights: (number | null)[], bar = 45): (Loading | null)[] {
  const key = `${bar}|${weights.join(',')}`;
  const hit = memo.get(key);
  if (hit) return hit;

  const loaded = weights.map((w, i) => (w != null && w >= bar ? i : -1)).filter((i) => i >= 0);
  const result: (Loading | null)[] = weights.map((w) => (w == null ? { side: [], total: bar } : w < bar ? null : { side: [], total: bar }));
  if (!loaded.length) return result;

  const last = loaded[loaded.length - 1];
  const workTotal = nearest(weights[last]!, bar);
  const perSide = (workTotal - bar) / 2;
  const warm = loaded.slice(0, -1);
  const targets = warm.map((i) => (weights[i]! - bar) / 2);

  let best: { stack: number[]; cuts: number[]; cost: number } | null = null;
  for (const side of WORK_SIDES) {
    if (Math.abs(sum(side) - perSide) > 1e-9) continue;
    for (const stack of orders(side)) {
      // Running totals as plates go on; a warm-up stops after k plates (small plate is for the work set).
      const bigCount = stack.filter((p) => p > 5).length;
      const prefix = [0];
      for (const p of stack.slice(0, bigCount)) prefix.push(prefix[prefix.length - 1] + p);
      // Best stopping points for the warm-ups, in order (dynamic programming over k).
      let costs = prefix.map(() => 0);
      const picks: number[][] = [];
      targets.forEach((t, w) => {
        const next = prefix.map(() => Infinity);
        const from = prefix.map(() => 0);
        for (let k = 0; k < prefix.length; k++) {
          // Up to 5 lb per side either way doesn't matter on a warm-up.
          const miss = Math.max(0, Math.abs(prefix[k] - t) - 5) * 4;
          for (let j = 0; j <= k; j++) {
            // Each step ideally adds one plate; a warm-up meant to have weight shouldn't be the empty bar.
            const c = costs[j] + miss + (w > 0 && j === k ? 15 : 0) + 8 * Math.max(0, k - j - 1) + (k === 0 && t > 0 ? 15 : 0);
            if (c < next[k]) {
              next[k] = c;
              from[k] = j;
            }
          }
        }
        picks.push(from);
        costs = next;
      });
      let end = 0;
      for (let k = 1; k < prefix.length; k++) if (costs[k] < costs[end]) end = k;
      // Fewer plates is better, and the gym only has so many of each (45s are plentiful).
      const count = new Map<number, number>();
      for (const p of stack) count.set(p, (count.get(p) ?? 0) + 1);
      let extra = 0;
      for (const [p, n] of count) if (p !== 45 && n > 2) extra += (n - 2) * 25;
      const cost = costs[end] + 10 * stack.length + extra;
      if (!best || cost < best.cost) {
        const cuts: number[] = [];
        let k = end;
        for (let w = targets.length - 1; w >= 0; w--) {
          cuts[w] = k;
          k = picks[w][k];
        }
        best = { stack, cuts, cost };
      }
    }
  }
  if (!best) return result;
  warm.forEach((i, w) => {
    const side = best!.stack.slice(0, best!.cuts[w]);
    result[i] = { side, total: bar + 2 * sum(side) };
  });
  result[last] = { side: best.stack, total: workTotal };
  memo.set(key, result);
  return result;
}

export const plateList = (ps: number[]) => ps.map((p) => String(p)).join(' + ');
