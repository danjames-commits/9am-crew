import { daysBetween, mondayOf, weekday, isWeekday } from '../dates';
import type { LevelPct, LevelText, LiftSpec, Part, WorkoutDraft } from '../types';
export type { LevelText };
import { CONDITIONING, type Style } from './library';

// ---------------------------------------------------------------
// The weekly split: one focus per weekday.
// ---------------------------------------------------------------
interface DayPlan {
  focus: string;
  style: Style;
  lift?: { name: string; gentle: string; short: string };
  skill?: 'pullup';
}

export const DAY_PLAN: Record<number, DayPlan> = {
  1: { focus: 'Press · steady conditioning', style: 'amrap', lift: { name: 'Strict press', gentle: 'Dumbbell press', short: 'Press' } },
  2: { focus: 'Deadlift · intervals', style: 'intervals', lift: { name: 'Deadlift', gentle: 'Kettlebell deadlift', short: 'Deadlift' } },
  3: { focus: 'Pull-up skills · longer cardio', style: 'long', skill: 'pullup' },
  4: { focus: 'Easy day · mobility + steady pace', style: 'easy' },
  5: { focus: 'Squat · short and spicy', style: 'short', lift: { name: 'Back squat', gentle: 'Goblet squat', short: 'Squat' } },
};

// ---------------------------------------------------------------
// The cycle: weights climb, ease off every 4th week, last week is test week.
// ---------------------------------------------------------------
export type WeekKind = 'build' | 'deload' | 'test';

export interface WeekPlan {
  index: number; // 0-based week in cycle
  kind: WeekKind;
  label: string;
  pct: number; // Strong-level percent of best (0 on test week)
  sets: number;
  reps: number;
}

const LOW = 65;
const HIGH = 82;

export function cyclePlan(totalWeeks: number): WeekPlan[] {
  const kinds: WeekKind[] = [];
  for (let i = 0; i < totalWeeks; i++) {
    if (i === totalWeeks - 1) kinds.push('test');
    else if ((i + 1) % 4 === 0) kinds.push('deload');
    else kinds.push('build');
  }
  const buildCount = kinds.filter((k) => k === 'build').length;
  let b = 0;
  return kinds.map((kind, index) => {
    if (kind === 'test') return { index, kind, label: 'Test', pct: 0, sets: 0, reps: 3 };
    if (kind === 'deload') return { index, kind, label: 'Ease off', pct: 60, sets: 3, reps: 5 };
    const pct = buildCount === 1 ? LOW : Math.round(LOW + ((HIGH - LOW) * b) / (buildCount - 1));
    b++;
    const [sets, reps] = pct <= 66 ? [3, 8] : pct <= 72 ? [4, 6] : pct <= 78 ? [5, 5] : [5, 3];
    const label = b === 1 ? 'Base' : b === buildCount ? 'Heavy' : 'Build';
    return { index, kind, label, pct, sets, reps };
  });
}

export interface CyclePosition {
  cycle: number; // 1-based
  week: WeekPlan;
  totalWeeks: number;
  started: boolean;
}

export function cyclePosition(date: string, cycleStart: string, totalWeeks: number): CyclePosition {
  const weeks = Math.floor(daysBetween(mondayOf(cycleStart), mondayOf(date)) / 7);
  const plan = cyclePlan(totalWeeks);
  if (weeks < 0) return { cycle: 1, week: plan[0], totalWeeks, started: false };
  return {
    cycle: Math.floor(weeks / totalWeeks) + 1,
    week: plan[weeks % totalWeeks],
    totalWeeks,
    started: true,
  };
}

// ---------------------------------------------------------------
// Building one day's workout.
// ---------------------------------------------------------------
const same = (s: string): LevelText => [s, s, s, s];
const clampPct = (p: number) => Math.max(40, Math.min(95, p));

function strengthPart(plan: DayPlan, week: WeekPlan, adjust: number): Part {
  const lift = plan.lift!;
  if (week.kind === 'test') {
    return {
      kind: 'strength',
      label: 'Strength · test day',
      title: `${lift.name}: find a new best`,
      lift: { movement: lift.name, pct: [null, null, null, null], reps: 3, gentleMovement: lift.gentle, mode: 'build' },
      versions: [
        `${lift.gentle}: build to a heavy set of 10 you can do with good form. Log it.`,
        `${lift.name}: build over 5–6 sets to a heavy set of 5. Log it.`,
        `${lift.name}: build over 6–7 sets to a heavy set of 3. Log it.`,
        `${lift.name}: build over 6–8 sets to a heavy single (or 3). Log it.`,
      ],
    };
  }
  const base = clampPct(week.pct + adjust);
  const spec: LiftSpec = {
    movement: lift.name,
    gentleMovement: lift.gentle,
    mode: 'percent',
    sets: week.sets,
    reps: week.reps,
    pct: [null, clampPct(base - 10), base, clampPct(base + 5)],
  };
  return { kind: 'strength', label: week.kind === 'deload' ? 'Strength · easy week' : 'Strength', ...liftPart(spec) };
}

// ---------------------------------------------------------------
// Lift settings -> the words each level sees. The text is always written
// from the settings, so the words and everyone's numbers can't disagree.
// ---------------------------------------------------------------
export function liftPct(strong: number): LevelPct {
  const s = clampPct(strong);
  return [null, clampPct(s - 10), s, clampPct(s + 5)];
}

export function liftTitle(spec: LiftSpec) {
  const reps = spec.reps ?? 5;
  return spec.mode === 'build' ? `${spec.movement}: find your ${reps}` : `${spec.movement} ${spec.sets ?? 3}×${reps}`;
}

export function liftText(spec: LiftSpec): LevelText {
  const sets = spec.sets ?? 3;
  const reps = spec.reps ?? 5;
  const gentle = spec.gentleMovement || spec.movement;
  const note = spec.note?.trim() ? `\n${spec.note.trim()}` : '';
  if (spec.mode === 'build') {
    return [
      `${gentle}: 4 × 10, building to a weight you could lift about 12 times\nLog your heaviest set.${note}`,
      `${spec.movement}: build over 5 sets to a solid set of ${reps}\nStop where you could still do 1 or 2 more. Log it.${note}`,
      `${spec.movement}: build over 5–6 sets to a solid set of ${reps}\nStop where you could still do 1 or 2 more. Log it.${note}`,
      `${spec.movement}: build over 6 sets to a heavy set of ${reps}\nPerfect reps only. Log it.${note}`,
    ];
  }
  const gentleReps = Math.max(8, reps + 3);
  const at = (i: 1 | 2 | 3) => (spec.pct[i] != null ? ` @ ${spec.pct[i]}%` : '');
  return [
    `${gentle} ${sets}×${gentleReps}, a weight you could lift about 12 times${note}`,
    `${spec.movement} ${sets}×${reps}${at(1)}${note}`,
    `${spec.movement} ${sets}×${reps}${at(2)}${note}`,
    `${spec.movement} ${sets}×${reps}${at(3)}${note}`,
  ];
}

/** Title, text and settings for a lifting part, all from one set of settings. */
export function liftPart(spec: LiftSpec): Pick<Part, 'title' | 'versions' | 'lift'> {
  return { title: liftTitle(spec), versions: liftText(spec), lift: spec };
}

/** What Gentle does instead of each main lift. */
export const GENTLE_FOR: Record<string, string> = {
  'Back squat': 'Goblet squat',
  'Front squat': 'Goblet squat',
  Deadlift: 'Kettlebell deadlift',
  'Strict press': 'Dumbbell press',
  'Push press': 'Dumbbell press',
  'Bench press': 'Dumbbell press',
  'Power clean': 'Kettlebell swing',
};

function pullupSkill(week: WeekPlan): Part {
  if (week.kind === 'test') {
    return {
      kind: 'skill',
      label: 'Skill · test day',
      title: 'Pull-up check-in',
      versions: [
        'Max ring rows in 1 min (feet far back). Note your number.',
        'Max ring rows in 1 min with feet close in. Then try a 10 s hold at the top of a band pull-up.',
        'Max band pull-ups in one go with your lightest band. Note your band and reps.',
        'Max strict pull-ups in one go. Note your number.',
      ],
    };
  }
  const step = week.kind === 'deload' ? 0 : Math.min(3, Math.round((week.pct - LOW) / 6));
  const sets = week.kind === 'deload' ? 3 : 4;
  return {
    kind: 'skill',
    label: week.kind === 'deload' ? 'Skill · easy week' : 'Skill',
    title: 'Pull-up progression',
    versions: [
      `${sets}×${6 + step} ring rows (feet far back)\n3 × ${15 + step * 5} s dead hang`,
      `${sets}×${8 + step} ring rows (feet close in)\n3×${3 + step} band pull-ups (heavy band)`,
      `${sets}×${4 + step} band pull-ups\n3×${2 + Math.min(step, 2)} slow lowering pull-ups (5 s down)`,
      `${sets}×${3 + step} strict pull-ups\n3×${3 + step} slow lowering pull-ups (5 s down)`,
    ],
  };
}

const WARMUPS: Record<number, string> = {
  1: '2 rounds: 200 m row · 10 band pull-aparts · 10 arm circles each way · 5 empty-bar presses',
  2: '2 rounds: 200 m row · 10 hip hinges with a dowel · 10 glute bridges · 5 light deadlifts',
  3: '2 rounds: 3 min bike · 10 scap pull-ups or hangs · 10 ring rows · 10 band pull-aparts',
  4: '5 min easy bike, then 2 rounds: 10 cat-cows · 10 hip circles each way · 5 inchworms',
  5: '2 rounds: 200 m row · 10 goblet squats · 10 band pull-aparts · 5 empty-bar squats',
};

const COOLDOWNS: Record<number, string> = {
  1: 'Shoulder and chest stretch, 5 min',
  2: 'Hamstring and lower-back stretch, 5 min',
  3: 'Lat and shoulder stretch, 5 min',
  4: '10 min mobility: hips, ankles, upper back. Go slow and breathe.',
  5: 'Hip and quad stretch, 5 min',
};

export function conditioningOptions(date: string) {
  return CONDITIONING[DAY_PLAN[weekday(date)].style];
}

/** Which option comes up by default: rotates week to week. */
export function defaultOption(date: string) {
  const options = conditioningOptions(date);
  const weekNo = Math.floor(daysBetween('2024-01-01', mondayOf(date)) / 7);
  return ((weekNo % options.length) + options.length) % options.length;
}

export interface SuggestInput {
  date: string;
  cycleStart: string;
  cycleWeeks: number;
  /** How many times "Swap" was pressed. */
  swap?: number;
  /** Percent added to (or taken off) the main lift. */
  adjust?: number;
}

export function suggestWorkout({ date, cycleStart, cycleWeeks, swap = 0, adjust = 0 }: SuggestInput): WorkoutDraft {
  if (!isWeekday(date)) throw new Error('Classes are on weekdays');
  const wd = weekday(date);
  const plan = DAY_PLAN[wd];
  const pos = cyclePosition(date, cycleStart, cycleWeeks);
  const { week } = pos;

  const parts: Part[] = [];
  parts.push({ kind: 'warmup', label: 'Warm-up', title: 'Warm-up', minutes: 10, versions: same(WARMUPS[wd]) });

  if (plan.lift) parts.push(strengthPart(plan, week, adjust));
  if (plan.skill === 'pullup') parts.push(pullupSkill(week));

  const options = conditioningOptions(date);
  const cond = options[(defaultOption(date) + swap) % options.length];
  const easyWeek = week.kind === 'deload' && plan.style !== 'easy';
  const withNote = (vs: LevelText) => (easyWeek ? (vs.map((v) => `${v}\nEasy week: about 70% effort.`) as LevelText) : vs);
  parts.push({
    kind: 'conditioning',
    label: plan.style === 'easy' ? 'Steady pace' : 'Conditioning',
    title: cond.name,
    minutes: cond.minutes,
    versions: withNote(cond.versions),
    ...(cond.outdoor ? { outdoor: { title: cond.outdoor.name, versions: withNote(cond.outdoor.versions) } } : {}),
  });
  parts.push({ kind: 'cooldown', label: 'Cool-down', title: 'Cool-down', minutes: wd === 4 ? 10 : 5, versions: same(COOLDOWNS[wd]) });

  const title = plan.lift ? `${plan.lift.short} + ${cond.name}` : plan.skill ? `Pull-ups + ${cond.name}` : cond.name;

  const weekText = `${week.label.toLowerCase()} week`;
  let why = `Cycle ${pos.cycle}, week ${week.index + 1} of ${cycleWeeks} (${weekText}).`;
  if (!pos.started) why = `Cycle 1 hasn't started yet, so this uses week 1 (${weekText}).`;
  if (plan.lift) {
    if (week.kind === 'test') why += ` Test week: everyone works up to a new best ${plan.lift.name.toLowerCase()}.`;
    else if (week.kind === 'deload') why += ` Lighter on purpose so bodies recover before the heavy weeks.`;
    else {
      const prev = cyclePlan(cycleWeeks)[week.index - 1];
      if (prev && prev.kind === 'build') {
        why += ` Last ${plan.lift.short.toLowerCase()} day was ${prev.sets}×${prev.reps} @ ${prev.pct}%, so this steps up to ${week.sets}×${week.reps} @ ${week.pct}%.`;
      } else {
        why += ` ${plan.lift.name} ${week.sets}×${week.reps} @ ${week.pct}% for the Strong level.`;
      }
    }
  } else if (plan.style === 'easy') {
    why += ' Easy day between the hard ones, so people can come every day without wearing down.';
  } else if (plan.skill) {
    why += week.kind === 'test' ? ' Pull-up check-in to see progress on the goal.' : ' Pull-up practice builds toward the first strict pull-up.';
  }
  if (adjust) why += ` Weights adjusted ${adjust > 0 ? '+' : ''}${adjust}%.`;

  return { class_date: date, title, focus: plan.focus, why, parts };
}

// ---------------------------------------------------------------
// Members' own numbers.
// ---------------------------------------------------------------

/** Estimated one-rep best from a set (Epley), capped at 10 reps. */
export function estimateMax(weight: number, reps: number) {
  const r = Math.min(10, Math.max(1, reps));
  return r === 1 ? weight : weight * (1 + r / 30);
}

export function roundTo5(n: number) {
  return Math.round(n / 5) * 5;
}

export function weightFor(estMax: number | undefined, pct: number | null) {
  if (!estMax || pct == null) return null;
  return roundTo5((estMax * pct) / 100);
}

// ---------------------------------------------------------------
// Laying out a member's own sets.
// ---------------------------------------------------------------
export interface SetLine {
  label: string; // "Warm-up" or "Work"
  weight: number | null; // null = empty bar / bodyweight
  reps: number;
  sets: number;
}

/** Warm-ups climbing to the working weight, then the work sets. */
export function setPlan(work: number, sets: number, reps: number, bar = 45): SetLine[] {
  const lines: SetLine[] = [];
  const seen = new Set<number>();
  for (const [frac, r] of [
    [0.4, 5],
    [0.6, 3],
    [0.8, 2],
  ] as const) {
    const w = roundTo5(work * frac);
    if (w <= bar) {
      if (!seen.has(0)) lines.push({ label: 'Warm-up', weight: null, reps: 5, sets: 1 });
      seen.add(0);
      continue;
    }
    if (w >= work || seen.has(w)) continue;
    seen.add(w);
    lines.push({ label: 'Warm-up', weight: w, reps: r, sets: 1 });
  }
  lines.push({ label: 'Work', weight: work, reps, sets });
  return lines;
}

/** For "find your N" and test days: a sensible range to aim for, from someone's best so far. */
export function aimRange(estMax: number, reps: number) {
  // A solid set of N with a rep or two in the tank sits a little under a true N-rep max.
  const pctOfMax = reps <= 1 ? 0.9 : reps <= 3 ? 0.85 : reps <= 5 ? 0.8 : 0.7;
  const mid = estMax * pctOfMax;
  return { low: roundTo5(mid * 0.95), high: roundTo5(mid * 1.03) };
}
