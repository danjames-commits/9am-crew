// The gym clock plan for a workout: which timers each part runs, and the remote
// button presses that set each one up on the No Limits clock.
//
// Best guesses until the clock tests on the setup page confirm them; each one is a
// single constant below so it's a one-line change.

/** Seconds of "get ready" countdown the clock adds before every timer. Set to 0 if F12 turns it off. */
export const LEAD_IN = 10;

export type ClockStep =
  | { type: 'countdown'; label: string; seconds: number }
  | { type: 'intervals'; label: string; rounds: number; work: number; rest: number };

export interface ClockPart {
  /** Which part of the workout (index), and its label then, in case parts are reordered. */
  part: number;
  label: string;
  steps: ClockStep[];
}

export type ClockPlan = ClockPart[];

const MAX_SECONDS = 99 * 60 + 59;
const clamp = (n: unknown, lo: number, hi: number, d: number) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
};

/** Tidy a plan from the database or from Claude: drop anything the clock can't run. */
export function cleanPlan(raw: unknown, partCount: number): ClockPlan {
  if (!Array.isArray(raw)) return [];
  const out: ClockPlan = [];
  for (const p of raw) {
    if (!p || typeof p !== 'object') continue;
    const part = Number((p as ClockPart).part);
    if (!Number.isInteger(part) || part < 0 || part >= partCount || out.some((o) => o.part === part)) continue;
    const steps: ClockStep[] = [];
    for (const s of Array.isArray((p as ClockPart).steps) ? (p as ClockPart).steps : []) {
      const label = String((s as ClockStep)?.label ?? '').trim().slice(0, 60);
      if ((s as ClockStep)?.type === 'countdown') {
        const seconds = Number((s as { seconds: number }).seconds) >= 1 ? clamp((s as { seconds: number }).seconds, 5, MAX_SECONDS, 0) : 0;
        if (seconds) steps.push({ type: 'countdown', label, seconds });
      } else if ((s as ClockStep)?.type === 'intervals') {
        const i = s as { rounds: number; work: number; rest: number };
        const rounds = Number(i.rounds) >= 1 ? clamp(i.rounds, 1, 99, 0) : 0;
        const work = Number(i.work) >= 1 ? clamp(i.work, 5, MAX_SECONDS, 0) : 0;
        const rest = clamp(i.rest, 0, MAX_SECONDS, 0);
        if (rounds && work) steps.push({ type: 'intervals', label, rounds, work, rest });
      }
      if (steps.length >= 8) break;
    }
    out.push({ part, label: String((p as ClockPart).label ?? '').slice(0, 60), steps });
  }
  return out.sort((a, b) => a.part - b.part);
}

const digits = (n: number) => String(n).split('');

// How the clock takes numbers (gym tests, Oct 23): each field keeps the last timer's value
// and new digits slide in from the right, so leftovers mix with what's typed. Dan's way to
// start clean: Exit, Down, 0, Right, 0, 0, Exit, Down leaves a countdown at 0:00 with the
// minutes flashing. From there: the minutes, Right, the seconds, OK. Zeros are already there,
// so a zero field is skipped.
export const CLEAR_COUNTDOWN = ['Exit', 'Down', '0', 'Right', '0', '0', 'Exit', 'Down'];

const two = (n: number) => String(n).padStart(2, '0').slice(-2).split('');

function typeTime(seconds: number): string[] {
  return ['Left', ...two(Math.floor(seconds / 60)), 'Right', ...two(seconds % 60)];
}

/** The remote presses that set up and start one step. */
export function buttonsFor(step: ClockStep): string[] {
  if (step.type === 'countdown') {
    const m = Math.floor(step.seconds / 60);
    const s = step.seconds % 60;
    return [...CLEAR_COUNTDOWN, ...(m ? digits(m) : []), ...(s ? ['Right', ...digits(s)] : []), 'OK'];
  }
  // Intervals aren't tested yet: two digits per field to push out leftovers.
  return ['Exit', 'Exit', 'Select', ...two(step.rounds), 'Select', ...typeTime(step.work), 'Select', ...typeTime(step.rest), 'OK'];
}

/** How long a step runs once started, not counting the lead-in. */
export function stepSeconds(step: ClockStep): number {
  if (step.type === 'countdown') return step.seconds;
  return step.rounds * step.work + Math.max(0, step.rounds - 1) * step.rest;
}

export function clockTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m}:${String(seconds % 60).padStart(2, '0')}`;
}

/** "12:00 countdown" or "8 × 0:40 on / 0:20 off". */
export function describeStep(step: ClockStep): string {
  if (step.type === 'countdown') return `${clockTime(step.seconds)} countdown`;
  return `${step.rounds} × ${clockTime(step.work)} on${step.rest ? ` / ${clockTime(step.rest)} off` : ''}`;
}

/** Timer-style typing on the number pad: the last two digits are seconds, the rest minutes.
 *  "1200" → 12:00, "45" → 0:45, "130" → 1:30. Seconds over 59 roll into minutes. */
export function digitsToSeconds(digits: string): number {
  const d = digits.replace(/\D/g, '').slice(-4);
  if (!d) return 0;
  const s = Number(d.slice(-2));
  const m = Number(d.slice(0, -2) || 0);
  return Math.min(99 * 60 + 59, m * 60 + s);
}

/** Read "12", "12:00", "0:45" or "45s" as seconds. Minutes when there's no colon or s. */
export function parseTime(text: string): number | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  let m = /^(\d{1,2}):(\d{1,2})$/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = /^(\d{1,3})\s*s(ec)?$/.exec(t);
  if (m) return Number(m[1]);
  m = /^(\d{1,2}(\.\d+)?)\s*(m|min)?$/.exec(t);
  if (m) return Math.round(Number(m[1]) * 60);
  return null;
}
