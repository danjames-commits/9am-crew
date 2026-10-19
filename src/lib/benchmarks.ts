// Benchmarks: how results are scored, shown and compared. No database code here.

export type ScoreType = 'time' | 'rounds_reps' | 'reps' | 'distance' | 'weight' | 'calories';

export interface Benchmark {
  id: number;
  name: string;
  score: ScoreType;
  better: 'higher' | 'lower';
  description: string | null;
  sort: number;
}

export interface BenchResult {
  id: number;
  benchmark_id: number;
  user_id: string;
  done_on: string;
  level: number | null;
  time_s: number | null;
  rounds: number | null;
  reps: number | null;
  amount: number | null;
  capped: boolean;
  note: string | null;
  workout_date: string | null;
}

export const SCORE_TYPES: { id: ScoreType; name: string }[] = [
  { id: 'time', name: 'Time' },
  { id: 'rounds_reps', name: 'Rounds + reps' },
  { id: 'reps', name: 'Reps' },
  { id: 'distance', name: 'Distance (m)' },
  { id: 'weight', name: 'Weight (lb)' },
  { id: 'calories', name: 'Calories' },
];

/** "4:32" → 272, "1:02:03" → 3723, "12" → 720 (a bare number is minutes). Null if it isn't a time. */
export function parseTime(input: string): number | null {
  const s = input.trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const secs = Math.round(Number(s) * 60);
    return secs > 0 && secs <= 86400 ? secs : null;
  }
  const m = /^(?:(\d+):)?(\d{1,3}):(\d{1,2})$/.exec(s);
  if (!m) return null;
  const [h, mm, ss] = [Number(m[1] ?? 0), Number(m[2]), Number(m[3])];
  if (ss >= 60 || (m[1] !== undefined && mm >= 60)) return null;
  const secs = h * 3600 + mm * 60 + ss;
  return secs > 0 && secs <= 86400 ? secs : null;
}

export function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

const num = (n: number) => n.toLocaleString('en-CA', { maximumFractionDigits: 1 });

/** A result in words: "4:32", "12 + 7", "45 reps", "Capped · 160 reps". */
export function formatScore(b: Pick<Benchmark, 'score'>, r: Pick<BenchResult, 'time_s' | 'rounds' | 'reps' | 'amount' | 'capped'>): string {
  switch (b.score) {
    case 'time':
      if (r.capped) return r.reps != null ? `Capped · ${num(r.reps)} reps` : 'Capped';
      return r.time_s != null ? formatTime(r.time_s) : '–';
    case 'rounds_reps':
      return `${r.rounds ?? 0} + ${r.reps ?? 0}`;
    case 'reps':
      return `${num(r.reps ?? 0)} reps`;
    case 'distance':
      return `${num(r.amount ?? 0)} m`;
    case 'weight':
      return `${num(r.amount ?? 0)} lb`;
    case 'calories':
      return `${num(r.amount ?? 0)} cal`;
  }
}

/** One number per result where bigger is always better, so any benchmark sorts the same way. */
export function scoreKey(b: Pick<Benchmark, 'score' | 'better'>, r: Pick<BenchResult, 'time_s' | 'rounds' | 'reps' | 'amount' | 'capped'>): number {
  if (b.score === 'time') {
    if (b.better === 'higher') return r.time_s ?? 0;
    // Finishing beats hitting the cap; among capped results, more reps is better.
    if (r.capped || r.time_s == null) return r.reps ?? 0;
    return 1e7 - r.time_s;
  }
  if (b.score === 'rounds_reps') return (r.rounds ?? 0) * 1000 + (r.reps ?? 0);
  if (b.score === 'reps') return r.reps ?? 0;
  return r.amount ?? 0;
}

/** The best result, optionally only at one level (levels do different versions, so they don't compare). */
export function bestResult<R extends BenchResult>(b: Benchmark, results: R[], level?: number | null): R | null {
  let best: R | null = null;
  for (const r of results) {
    if (level != null && r.level !== level) continue;
    if (!best || scoreKey(b, r) > scoreKey(b, best)) best = r;
  }
  return best;
}

/** Is this result a new best for its level, compared with the earlier ones? */
export function isNewBest(b: Benchmark, earlier: BenchResult[], r: Omit<BenchResult, 'id'>): boolean {
  const prev = bestResult(b, earlier as BenchResult[], r.level);
  return !prev || scoreKey(b, r) > scoreKey(b, prev);
}

export interface ScoreInput {
  time?: string;
  rounds?: string | number;
  reps?: string | number;
  amount?: string | number;
  capped?: boolean;
}

/** Turns what someone typed into database fields, or an error to show them. */
export function readScore(b: Pick<Benchmark, 'score'>, input: ScoreInput):
  | { ok: true; time_s: number | null; rounds: number | null; reps: number | null; amount: number | null; capped: boolean }
  | { ok: false; error: string } {
  const int = (v: unknown, max: number) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 && n <= max ? n : NaN;
  };
  const none = { time_s: null, rounds: null, reps: null, amount: null, capped: false };
  switch (b.score) {
    case 'time': {
      if (input.capped) {
        const reps = int(input.reps, 99999);
        if (reps === null || Number.isNaN(reps)) return { ok: false, error: 'Hit the cap? Enter how many reps you got.' };
        return { ok: true, ...none, reps, capped: true };
      }
      const t = parseTime(input.time ?? '');
      if (t === null) return { ok: false, error: 'Enter a time like 4:32.' };
      return { ok: true, ...none, time_s: t };
    }
    case 'rounds_reps': {
      const rounds = int(input.rounds, 999);
      const reps = int(input.reps ?? 0, 9999) ?? 0;
      if (rounds === null || Number.isNaN(rounds) || Number.isNaN(reps)) return { ok: false, error: 'Enter your rounds (and any extra reps).' };
      return { ok: true, ...none, rounds, reps };
    }
    case 'reps': {
      const reps = int(input.reps, 99999);
      if (reps === null || Number.isNaN(reps)) return { ok: false, error: 'Enter your reps.' };
      return { ok: true, ...none, reps };
    }
    default: {
      const n = Number(input.amount);
      if (!(n > 0 && n < 1000000)) return { ok: false, error: 'Enter a number.' };
      return { ok: true, ...none, amount: Math.round(n * 10) / 10 };
    }
  }
}
