// Which plates go on each side of the bar for a weight, with the gym's plates.

export const GYM_PLATES = [45, 35, 25, 15, 10, 5, 2.5, 1] as const;
export const BARS = [45, 35, 15] as const;

export interface Loading {
  /** Plates for one side, heaviest (on first, closest to the middle) to lightest. */
  side: number[];
  /** What the bar actually weighs with these plates (can be a touch under when it doesn't split evenly). */
  total: number;
}

/** Fewest plates per side, biggest first. null if it's less than the bar. */
export function loadBar(weight: number, bar: number = 45): Loading | null {
  if (weight < bar) return null;
  let left = Math.round(((weight - bar) / 2) * 2) / 2; // per side, to the nearest 0.5
  const side: number[] = [];
  for (const p of GYM_PLATES) {
    while (left >= p - 1e-9) {
      side.push(p);
      left = Math.round((left - p) * 2) / 2;
    }
  }
  return { side, total: bar + 2 * side.reduce((a, b) => a + b, 0) };
}

/**
 * Going from one set to the next: plates come off from the outside in, so keep what
 * both sets share at the bottom of the stack, take the rest off, put the new ones on.
 */
export function plateChange(from: number[], to: number[]) {
  let keep = 0;
  while (keep < from.length && keep < to.length && from[keep] === to[keep]) keep++;
  return { off: from.slice(keep), on: to.slice(keep) };
}

/** Fewest plates (from those no heavier than `max`) making up `amount` per side, or null. */
function fill(amount: number, max: number): number[] | null {
  let left = Math.round(amount * 2) / 2;
  const out: number[] = [];
  for (const p of GYM_PLATES) {
    if (p > max) continue;
    while (left >= p - 1e-9) {
      out.push(p);
      left = Math.round((left - p) * 2) / 2;
    }
  }
  return left === 0 ? out : null;
}

/**
 * Plates for a run of sets, building up. When the next set can be made by adding a plate
 * or two on top of what's already on (lighter plates outside heavier ones), do that;
 * otherwise load it fresh with the fewest plates.
 */
export function planLoads(weights: (number | null)[], bar = 45): (Loading | null)[] {
  let prev: number[] = [];
  return weights.map((w) => {
    if (w == null) {
      prev = [];
      return { side: [], total: bar };
    }
    const fresh = loadBar(w, bar);
    if (!fresh) return null;
    const have = prev.reduce((a, b) => a + b, 0);
    const extra = (fresh.total - bar) / 2 - have;
    let pick = fresh.side;
    if (prev.length && extra > 0) {
      const add = fill(extra, Math.min(...prev));
      const freshChanges = plateChange(prev, fresh.side);
      if (add && add.length <= freshChanges.off.length + freshChanges.on.length && prev.length + add.length <= fresh.side.length + 1) pick = [...prev, ...add];
    }
    prev = pick;
    return { side: pick, total: fresh.total };
  });
}

export const plateList = (ps: number[]) => ps.map((p) => String(p)).join(' + ');
