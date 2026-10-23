import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GENTLE_FOR, gentleChoices, liftPart, liftPct, positionOn, suggestWorkout, weightFor, STYLES, STYLE_NAMES, type Schedule } from './programming/engine';
import { cleanPlan, KIND_NAMES, WEEKDAYS, type PlanDraft } from './programming/plan';
import { LEVELS, type LevelText, type LiftSpec, type Part, type WorkoutDraft } from './types';
import { addDays, longDate, shortDate, todayLocal, weekday } from './dates';
import type { WeatherCall } from './weather-rules';
import { cleanSvg } from './svg-clean';
import { getCoachBrief, withBrief } from './coach-brief';
import { cleanPlan as cleanClockPlan, LEAD_IN, type ClockPlan } from './clock-plan';

// Sonnet writes workouts; Haiku handles the quick, short jobs.
const BUILD_MODEL = 'claude-sonnet-5-5';
const QUICK_MODEL = 'claude-haiku-5-5';

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

function client() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Claude isn’t set up yet (no API key).');
  return new Anthropic();
}

// ---------------------------------------------------------------
// Daily limits, so nobody runs up the bill by accident.
// ---------------------------------------------------------------
export const DAILY_LIMIT = { build: 60, scale: 8, recap: 5, plan: 20, avatar: 12, prart: 10, clock: 30 } as const;

export async function takeAllowance(supabase: SupabaseClient, userId: string, kind: keyof typeof DAILY_LIMIT) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await supabase
    .from('ai_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('created_at', since);
  if ((count ?? 0) >= DAILY_LIMIT[kind]) return false;
  await supabase.from('ai_requests').insert({ user_id: userId, kind });
  return true;
}

// ---------------------------------------------------------------
// Writing workouts
// ---------------------------------------------------------------
// The app's own rules for writing a workout. Who the crew is, what equipment we
// have and how we like to train come from the coaches' brief (coach-brief.ts).
const BUILD_RULES = `You write one day's workout for a small weekday 9 AM fitness group, in the exact shape the app needs.

Format rules:
- Every part is written four times, one per level:
  ${LEVELS.map((l) => `${l.name}: ${l.blurb}`).join('\n  ')}
- Every conditioning part needs an "outdoor" version that swaps rowing or biking for walking or running outside (or does the whole thing outside), for days the weather is good. Only leave outdoor null if an outside version makes no sense.
- Strength parts use the "lift" settings, not free text. Pick the lift from the allowed list. "percent" means sets × reps at a percentage of each person's best (give the Strong-level percentage; the app works out the others). "build" means building up to a solid set of N (for finding numbers or test days). The app writes the strength text itself from these settings; put any coaching cue in "note".
- Follow the cycle: use the week's percentage, sets and reps for the main lift unless the admin asks otherwise. On an ease-off week keep everything lighter; on test week the main lift is "build".
- Never include partner or team work.
- Separate lines with a newline.`;

const levelText = {
  type: 'object',
  properties: {
    gentle: { type: 'string' },
    steady: { type: 'string' },
    strong: { type: 'string' },
    full: { type: 'string' },
  },
  required: ['gentle', 'steady', 'strong', 'full'],
  additionalProperties: false,
};

function workoutSchema(movements: string[]) {
  return {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Short name, e.g. "Squat + Friday Grinder"' },
      focus: { type: 'string', description: 'e.g. "Squat · short and spicy"' },
      why: { type: 'string', description: 'One or two sentences for the admins on why this workout, today.' },
      parts: {
        type: 'array',
        description: 'Usually: warm-up, strength or skill, conditioning, cool-down.',
        items: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['warmup', 'strength', 'skill', 'conditioning', 'cooldown'] },
            label: { type: 'string', description: 'e.g. "Warm-up", "Strength", "Conditioning", "Cool-down"' },
            title: { type: 'string', description: 'Heading, e.g. the conditioning name' },
            minutes: { type: 'integer' },
            text: { ...levelText, description: 'What each level does. Ignored for strength parts that have lift settings.' },
            outdoor: {
              anyOf: [
                { type: 'null' },
                {
                  type: 'object',
                  properties: { title: { type: 'string' }, text: levelText },
                  required: ['title', 'text'],
                  additionalProperties: false,
                },
              ],
            },
            lift: {
              anyOf: [
                { type: 'null' },
                {
                  type: 'object',
                  properties: {
                    movement: { type: 'string', enum: movements },
                    gentle_movement: { type: 'string', enum: gentleChoices(movements) },
                    mode: { type: 'string', enum: ['percent', 'build'] },
                    sets: { type: 'integer' },
                    reps: { type: 'integer' },
                    strong_pct: { type: 'integer', description: 'Strong-level percent of best, 50–90. Use 0 for "build".' },
                    note: { type: 'string', description: 'Optional coaching cue, or empty.' },
                  },
                  required: ['movement', 'gentle_movement', 'mode', 'sets', 'reps', 'strong_pct', 'note'],
                  additionalProperties: false,
                },
              ],
            },
          },
          required: ['kind', 'label', 'title', 'minutes', 'text', 'outdoor', 'lift'],
          additionalProperties: false,
        },
      },
    },
    required: ['title', 'focus', 'why', 'parts'],
    additionalProperties: false,
  };
}

interface AiText {
  gentle: string;
  steady: string;
  strong: string;
  full: string;
}
interface AiPart {
  kind: Part['kind'];
  label: string;
  title: string;
  minutes: number;
  text: AiText;
  outdoor: { title: string; text: AiText } | null;
  lift: { movement: string; gentle_movement: string; mode: 'percent' | 'build'; sets: number; reps: number; strong_pct: number; note: string } | null;
}
interface AiWorkout {
  title: string;
  focus: string;
  why: string;
  parts: AiPart[];
}

const clampInt = (n: number, lo: number, hi: number, d: number) => (Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d);
const levels = (t: AiText): LevelText => [t.gentle, t.steady, t.strong, t.full].map((s) => String(s ?? '').trim()) as LevelText;
const PARTNER = /\bpartner|\bpairs?\b|take turns|you go,? i go|relay|team of/i;

function toDraft(date: string, w: AiWorkout, movements: string[]): WorkoutDraft {
  const parts: Part[] = w.parts.slice(0, 8).map((p) => {
    const part: Part = { kind: p.kind, label: p.label || 'Part', title: p.title || '', versions: levels(p.text) };
    if (p.minutes > 0) part.minutes = clampInt(p.minutes, 1, 90, 10);
    if (p.kind === 'strength' && p.lift && movements.includes(p.lift.movement)) {
      const mode = p.lift.mode === 'build' ? 'build' : 'percent';
      const spec: LiftSpec = {
        movement: p.lift.movement,
        gentleMovement: gentleChoices(movements).includes(p.lift.gentle_movement) ? p.lift.gentle_movement : GENTLE_FOR[p.lift.movement] ?? p.lift.movement,
        mode,
        sets: clampInt(p.lift.sets, 1, 10, 5),
        reps: clampInt(p.lift.reps, 1, 15, 5),
        pct: mode === 'percent' ? liftPct(clampInt(p.lift.strong_pct, 50, 90, 70)) : [null, null, null, null],
        note: p.lift.note?.trim() || undefined,
      };
      Object.assign(part, liftPart(spec));
    }
    if (p.kind === 'conditioning' && p.outdoor) part.outdoor = { title: p.outdoor.title || `${part.title}, outside`, versions: levels(p.outdoor.text) };
    return part;
  });
  return { class_date: date, title: w.title.slice(0, 80), focus: w.focus.slice(0, 80), why: w.why.slice(0, 600), parts };
}

function describeDraft(d: WorkoutDraft) {
  return d.parts
    .map((p) => {
      const lift = p.lift ? ` [lift: ${p.lift.movement}, ${p.lift.mode ?? 'percent'}, ${p.lift.sets ?? '?'}×${p.lift.reps ?? '?'}, Strong ${p.lift.pct[2] ?? '-'}%]` : '';
      return `- ${p.label}: ${p.title}${lift}\n  Strong version: ${p.versions[2].replace(/\n/g, ' / ')}${p.outdoor ? `\n  Outside (${p.outdoor.title}): ${p.outdoor.versions[2].replace(/\n/g, ' / ')}` : ''}`;
    })
    .join('\n');
}

export async function draftWorkout(opts: {
  supabase: SupabaseClient;
  schedule: Schedule;
  date: string;
  request: string;
  current?: WorkoutDraft | null;
  weather?: WeatherCall | null;
}): Promise<WorkoutDraft> {
  const { supabase, schedule, date, request, current, weather } = opts;
  const [{ data: movementRows }, { data: recent }, brief] = await Promise.all([
    supabase.from('movements').select('name').order('sort'),
    supabase
      .from('workouts')
      .select('class_date, title, parts')
      .gte('class_date', addDays(date, -14))
      .lte('class_date', addDays(date, 7))
      .neq('class_date', date)
      .order('class_date'),
    getCoachBrief(supabase),
  ]);
  const movements = (movementRows ?? []).map((m) => m.name as string);
  const pos = positionOn(date, schedule);
  const cycle = pos.resolved;
  const plan = cycle.days[weekday(date)];
  const reference = suggestWorkout({ date, schedule });

  const recentLines = (recent ?? []).map((r) => {
    const cond = (r.parts as Part[]).find((p) => p.kind === 'conditioning');
    return `${longDate(r.class_date)}: ${r.title}${cond ? ` (conditioning: ${cond.title})` : ''}`;
  });

  const context = `Workout for ${longDate(date)}.
Day focus: ${plan.focus}. Main lift: ${plan.lift ? `${plan.lift.name} (Gentle does ${plan.lift.gentle})` : 'none today'}.${plan.skill === 'pullup' ? ' Include pull-up skill practice.' : ''} Conditioning style: ${STYLE_NAMES[plan.style]}.${plan.notes ? `\nThe cycle plan's note for this day: ${plan.notes}` : ''}
Cycle ${pos.cycle}${cycle.name ? ` ("${cycle.name}")` : ''}, week ${pos.week.index + 1} of ${pos.totalWeeks}: ${pos.week.label}${pos.week.kind === 'build' ? ` (main lift ${pos.week.sets}×${pos.week.reps} at ${pos.week.pct}% for Strong)` : pos.week.kind === 'deload' ? ` (ease-off week, about ${pos.week.pct || 60}%, lighter conditioning)` : ' (test week: build to a new best)'}${pos.started ? '' : ' — the cycle has not started yet'}.${cycle.why ? `\nWhy this cycle is planned this way: ${cycle.why}` : ''}
Crew goals this cycle: ${cycle.goals.length ? cycle.goals.join('; ') : 'none set'}.
Lifts the app tracks (use only these for lift settings): ${movements.join(', ')}.
${weather ? `9 AM forecast: ${weather.headline}. ${weather.detail}.` : 'No forecast yet.'}

Recent and upcoming workouts (avoid repeating conditioning):
${recentLines.length ? recentLines.join('\n') : 'none yet'}

The app's rule-based suggestion for this day, for reference:
${describeDraft(reference)}
${current && current.parts.length ? `\nWhat the admin has on screen right now:\nTitle: ${current.title}\n${describeDraft(current)}` : ''}`;

  const ask = request.trim()
    ? `The admin asks: "${request.trim()}"\nIf they want a tweak, change only what they asked and keep the rest of what's on screen. Otherwise write a fresh workout.`
    : 'Write this day’s workout.';

  const schema = workoutSchema(movements);
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: `${context}\n\n${ask}` }];

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client().messages.create({
      model: BUILD_MODEL,
      max_tokens: 6000,
      system: withBrief(BUILD_RULES, brief.body),
      messages,
      output_config: { format: { type: 'json_schema', schema } },
    });
    if (res.stop_reason === 'refusal') throw new Error('Claude couldn’t write that one. Try wording it differently.');
    const block = res.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') throw new Error('Claude didn’t send a workout back. Try again.');
    if (res.stop_reason === 'max_tokens') throw new Error('That workout came out too long. Try asking for something simpler.');
    const draft = toDraft(date, JSON.parse(block.text) as AiWorkout, movements);
    const allText = JSON.stringify(draft.parts);
    if (!PARTNER.test(allText)) return draft;
    messages.push({ role: 'assistant', content: block.text });
    messages.push({ role: 'user', content: 'That includes partner or team work. Rewrite it so everyone works on their own, no partners at all.' });
  }
  throw new Error('Claude kept adding partner work. Try again or adjust it by hand.');
}

// ---------------------------------------------------------------
// "Help me scale this"
// ---------------------------------------------------------------
export async function scaleAdvice(opts: {
  /** The coaches' brief (who the crew is, house rules). */
  brief: string;
  workout: { title: string; parts: Part[] };
  level: number;
  outside: boolean;
  maxes: Record<string, number>;
  message: string;
}) {
  const i = Math.min(4, Math.max(1, opts.level)) - 1;
  const lines = opts.workout.parts.map((p) => {
    const v = opts.outside && p.outdoor ? p.outdoor.versions[i] : p.versions[i];
    const t = opts.outside && p.outdoor ? p.outdoor.title : p.title;
    const mine = p.lift ? weightFor(opts.maxes[p.lift.movement], p.lift.pct[i]) : null;
    return `${p.label} — ${t}: ${v.replace(/\n/g, ' / ')}${mine ? ` (their working weight: ${mine} lb)` : ''}`;
  });

  const res = await client().messages.create({
    model: QUICK_MODEL,
    max_tokens: 600,
    system: withBrief(
      `You help one member of a small, friendly fitness group adjust today's workout. Be warm, practical and brief: at most about 120 words. Give specific swaps for the parts affected (exercise, reps, weight or effort), keep everything they can still do, and never suggest partner work. Plain text with short lines, no headings, no emoji. You are not a doctor: if they describe sharp pain, swelling, dizziness, chest symptoms or anything that sounds like an injury, tell them to skip what hurts and check with a health professional, and keep the rest gentle. End with: "Check with an admin if you're unsure."`,
      opts.brief,
    ),
    messages: [
      {
        role: 'user',
        content: `Today's workout (${LEVELS[i].name} level, ${opts.outside ? 'outside version' : 'inside version'}):\n${lines.join('\n')}\n\nWhat they said: "${opts.message.trim().slice(0, 500)}"`,
      },
    ],
  });
  const block = res.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text' || res.stop_reason === 'refusal') throw new Error('Claude couldn’t help with that one.');
  return block.text.trim();
}

// ---------------------------------------------------------------
// Friday recap
// ---------------------------------------------------------------
export async function writeRecap(facts: string, brief: string) {
  const res = await client().messages.create({
    model: QUICK_MODEL,
    max_tokens: 400,
    system: withBrief(
      `You write the Friday recap for the crew's group chat. Warm, upbeat, a little playful, never cheesy. At most about 80 words, plain text, two or three short paragraphs, at most one emoji. Celebrate new personal bests by first name. Never single out who missed days or compare attendance between people. End with one line about what's coming next week.`,
      brief,
    ),
    messages: [{ role: 'user', content: facts }],
  });
  const block = res.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No recap');
  return block.text.trim();
}

// ---------------------------------------------------------------
// Planning a whole cycle
// ---------------------------------------------------------------
const PLANNER = `You plan training cycles for a small weekday 9 AM fitness group, in the exact shape the app needs. Each member picks a level (Gentle, Steady, Strong, Full); percentages you set are for Strong, and the app makes Steady 10% lighter and Full 5% heavier. Gentle uses lighter tools.

A cycle is a run of weeks (usually 4–8) with a weekly split. You decide:
- The weeks: each is "build" (sets × reps at a percentage of each person's best), "deload" (an easier week so bodies recover), or "test" (everyone builds to a new best). Strong percentages should climb gradually, roughly 60–85%, with a deload every 3–4 weeks and usually a test week at the end. Sets and reps should fit the percentage (lighter = more reps, e.g. 3×8 at 65%, 5×5 at ~75%, 5×3 at ~82%). Give each week a short label like "Base", "Build", "Heavy", "Ease off", "Holidays", "Test".
- The weekday split, Monday to Friday: a short focus line, the main lift for the day (or none), whether to include pull-up skill practice, a conditioning style, and an optional note for whoever writes that day's workouts. Lifts can repeat across cycles but vary them sensibly.
- A short, friendly name for the cycle, 1–4 crew goals, and a few sentences on why it's planned this way (written for the admins, plain language).

Hard rules: never plan partner or team work of any kind. Respect what the admin asks for this cycle (dates away, injuries, focus lifts, number of weeks, outdoor work, holidays). Plain language, no emoji.

Conditioning styles you can choose from:
${STYLES.map((s) => `- ${s}: ${STYLE_NAMES[s]}`).join('\n')}`;

interface AiPlanDay {
  focus: string;
  lift: string;
  gentle: string;
  skill: 'none' | 'pullup';
  conditioning: string;
  notes: string;
}
interface AiPlan {
  name: string;
  why: string;
  goals: string[];
  weeks: { kind: 'build' | 'deload' | 'test'; label: string; strong_pct: number; sets: number; reps: number }[];
  days: { mon: AiPlanDay; tue: AiPlanDay; wed: AiPlanDay; thu: AiPlanDay; fri: AiPlanDay };
}

function planSchema(movements: string[]) {
  const lifts = [...movements, 'none'];
  const day = {
    type: 'object',
    properties: {
      focus: { type: 'string', description: 'Short focus line, e.g. "Deadlift · intervals"' },
      lift: { type: 'string', enum: lifts, description: 'Main lift for the day, or "none"' },
      gentle: { type: 'string', enum: [...gentleChoices(movements), 'none'], description: 'What Gentle does instead (an easier movement), or "none" if no lift' },
      skill: { type: 'string', enum: ['none', 'pullup'] },
      conditioning: { type: 'string', enum: STYLES },
      notes: { type: 'string', description: 'Optional guidance for the workout writer, or empty' },
    },
    required: ['focus', 'lift', 'gentle', 'skill', 'conditioning', 'notes'],
    additionalProperties: false,
  };
  return {
    type: 'object',
    properties: {
      name: { type: 'string' },
      why: { type: 'string' },
      goals: { type: 'array', items: { type: 'string' } },
      weeks: {
        type: 'array',
        description: 'One entry per week, in order. Usually 4–8 weeks.',
        items: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['build', 'deload', 'test'] },
            label: { type: 'string' },
            strong_pct: { type: 'integer', description: 'Strong-level percent of best. Use 0 for test weeks.' },
            sets: { type: 'integer' },
            reps: { type: 'integer' },
          },
          required: ['kind', 'label', 'strong_pct', 'sets', 'reps'],
          additionalProperties: false,
        },
      },
      days: {
        type: 'object',
        properties: { mon: day, tue: day, wed: day, thu: day, fri: day },
        required: ['mon', 'tue', 'wed', 'thu', 'fri'],
        additionalProperties: false,
      },
    },
    required: ['name', 'why', 'goals', 'weeks', 'days'],
    additionalProperties: false,
  };
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;

function describePlan(p: PlanDraft) {
  const weeks = p.weeks
    .map((w, i) => `  Week ${i + 1} (${shortDate(addDays(p.start_date, i * 7))}): ${KIND_NAMES[w.kind]} "${w.label}"${w.kind === 'test' ? '' : `, ${w.sets}×${w.reps} at ${w.pct}%`}`)
    .join('\n');
  const days = WEEKDAYS.map(({ n, short }) => {
    const d = p.days[n];
    return `  ${short}: ${d.focus} | lift: ${d.lift ?? 'none'}${d.lift ? ` (Gentle: ${d.gentle ?? d.lift})` : ''} | pull-ups: ${d.skill ? 'yes' : 'no'} | conditioning: ${d.style}${d.notes ? ` | note: ${d.notes}` : ''}`;
  }).join('\n');
  return `Name: ${p.name || '(none)'}\nGoals: ${p.goals.join('; ') || 'none'}\nWhy: ${p.why || '(none)'}\nWeeks:\n${weeks}\nWeekday split:\n${days}`;
}

export async function planCycle(opts: {
  supabase: SupabaseClient;
  schedule: Schedule;
  start: string;
  brief: string;
  current?: PlanDraft | null;
  request?: string;
}): Promise<PlanDraft> {
  const { supabase, schedule, start, brief, current, request } = opts;
  const [{ data: movementRows }, { data: people }, { data: logs }, coachBrief] = await Promise.all([
    supabase.from('movements').select('id, name').order('sort'),
    supabase.from('profiles').select('level').eq('approved', true),
    supabase.from('lift_logs').select('movement_id, user_id'),
    getCoachBrief(supabase),
  ]);
  const movements = (movementRows ?? []).map((m) => m.name as string);
  const nameOf = new Map((movementRows ?? []).map((m) => [m.id, m.name as string]));
  const withNumbers = new Map<string, Set<string>>();
  for (const l of logs ?? []) {
    const n = nameOf.get(l.movement_id);
    if (!n) continue;
    if (!withNumbers.has(n)) withNumbers.set(n, new Set());
    withNumbers.get(n)!.add(l.user_id);
  }
  const levelCounts = LEVELS.map((l) => `${(people ?? []).filter((p) => p.level === l.n).length} ${l.name}`).join(', ');

  // The cycle that ends as this one starts, for continuity.
  const before = positionOn(addDays(start, -3), schedule);
  const prev = before.resolved;
  const prevPlan: PlanDraft = {
    start_date: prev.start,
    name: prev.name ?? '',
    why: prev.why ?? '',
    brief: '',
    goals: prev.goals,
    weeks: prev.weeks.map(({ kind, label, pct, sets, reps }) => ({ kind, label, pct, sets, reps })),
    days: Object.fromEntries(
      WEEKDAYS.map(({ n }) => {
        const d = prev.days[Number(n)];
        return [n, { focus: d.focus, style: d.style, lift: d.lift?.name ?? null, gentle: d.lift?.gentle ?? null, skill: d.skill ?? null, notes: d.notes ?? '' }];
      }),
    ),
  };
  const calendar = Array.from({ length: 12 }, (_, i) => `week ${i + 1} starts Mon ${shortDate(addDays(start, i * 7)).split(' · ')[1]}`).join('; ');

  const context = `Today is ${longDate(todayLocal())}.
Plan cycle ${positionOn(start, schedule).cycle}, starting Monday ${shortDate(start).split(' · ')[1]}. Calendar: ${calendar}.
Crew: ${(people ?? []).length} members (${levelCounts}).
Lifts the app tracks (use only these): ${movements.join(', ')}.
Lifts people have logged numbers for: ${[...withNumbers].map(([n, u]) => `${n} (${u.size})`).join(', ') || 'none yet'}.

The previous cycle (cycle ${before.cycle}, ${prev.start} to ${addDays(prev.end, -3)}):
${describePlan(prevPlan)}

The admin's brief for this cycle: "${brief.trim() || 'No special requests. Plan a sensible next cycle.'}"`;

  const ask = current && request?.trim()
    ? `\n\nThe plan so far:\n${describePlan(current)}\n\nThe admin now asks: "${request.trim()}"\nChange only what they asked for and keep the rest.`
    : '\n\nPlan this cycle.';

  const schema = planSchema(movements);
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: context + ask }];
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client().messages.create({
      model: BUILD_MODEL,
      max_tokens: 4000,
      system: withBrief(PLANNER, coachBrief.body),
      messages,
      output_config: { format: { type: 'json_schema', schema } },
    });
    if (res.stop_reason === 'refusal') throw new Error('Claude couldn’t plan that one. Try wording it differently.');
    if (res.stop_reason === 'max_tokens') throw new Error('The plan came out too long. Try a shorter brief.');
    const block = res.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') throw new Error('Claude didn’t send a plan back. Try again.');
    const ai = JSON.parse(block.text) as AiPlan;
    const draft: PlanDraft = {
      start_date: start,
      name: ai.name,
      why: ai.why,
      brief: brief,
      goals: ai.goals,
      weeks: ai.weeks.map((w) => ({ kind: w.kind, label: w.label, pct: w.strong_pct, sets: w.sets, reps: w.reps })),
      days: Object.fromEntries(
        DAY_KEYS.map((k, i) => {
          const d = ai.days[k];
          return [
            String(i + 1),
            {
              focus: d.focus,
              lift: d.lift === 'none' ? null : d.lift,
              gentle: d.gentle === 'none' ? null : d.gentle,
              skill: d.skill === 'pullup' ? 'pullup' : null,
              style: d.conditioning as PlanDraft['days'][string]['style'],
              notes: d.notes,
            },
          ];
        }),
      ),
    };
    const { plan, error } = cleanPlan(draft, movements);
    if (!plan) throw new Error(error ?? 'Claude’s plan didn’t fit. Try again.');
    if (!PARTNER.test(JSON.stringify(plan))) return plan;
    messages.push({ role: 'assistant', content: block.text });
    messages.push({ role: 'user', content: 'That includes partner or team work. Rewrite it so everyone works on their own, no partners at all.' });
  }
  throw new Error('Claude kept adding partner work. Try again or edit the plan by hand.');
}

// ---------------------------------------------------------------
// Spirit animal drawings ("a grumpy beaver")
// ---------------------------------------------------------------
const ARTIST = `You draw spirit-animal avatars for "9AM Crew", a small, friendly weekday 9 AM workout group (mostly retirees and moms) in Charlottetown, PEI. The group's whole identity is MID-LEVEL ENERGY: they show up, they work, nobody is a beast. Each person describes the animal they want and you draw it as a tiny cartoon avatar.

Who is allowed:
- Mid-energy animals only: raccoons, beavers, deer, otters, sloths, hedgehogs, ducks, geese, moose, capybaras, lobsters, puffins, groundhogs, foxes, possums, pigeons and the like. Mood words and props are welcome and are the fun part: grumpy, sleepy, smug, over-caffeinated, wearing a headband, holding a coffee, sweatband, tiny kettlebell.
- Turn DOWN apex predators and anything that reads as intense or intimidating: bears, lions, tigers, wolves, sharks, eagles, gorillas, crocodiles, dragons, and "beast mode" versions of anything. Saying "a calm lion" doesn't make it mid; a lion is still a lion.
- Turn down people, real or famous, and any known character, mascot, team or brand animal (cartoon, movie, game, sports or product). Draw only your own original animal.
- Turn down anything rude, gross or mean: it is shown to the whole group.
When you turn one down, set ok to false and write a short, playful one-line message suggesting a mid alternative (e.g. "Lions are 5 AM crew. How about a smug raccoon?"). Leave svg empty.

How to draw (when ok is true):
- One SVG, viewBox="0 0 100 100", with xmlns="http://www.w3.org/2000/svg". Double quotes on every attribute.
- Only these elements: svg, g, defs, circle, ellipse, rect, path, polygon, polyline, line, linearGradient, radialGradient, stop. Only presentation attributes (fill, stroke, stroke-width, stroke-linecap, stroke-linejoin, opacity, transform and shape geometry). No style attributes, no text, no images, no links, no comments, no CSS.
- No background: the app puts a coloured circle behind it. The animal's head (or head and shoulders) fills most of the frame and is centred, a little toward the top, because the bottom-right corner gets a small initials badge.
- Friendly flat cartoon style like an emoji: bold simple shapes, a few clear colours, a dark outline or none, big readable face. It must read clearly at 34 pixels wide. Make the mood obvious from the eyebrows, eyes and mouth.
- Keep it under about 5000 characters.`;

export async function drawAnimal(prompt: string) {
  const schema = {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: 'false if this request breaks the rules' },
      message: { type: 'string', description: 'If ok: a short playful line about the drawing. If not: the playful one-line turn-down.' },
      name: { type: 'string', description: 'Short name for the animal, e.g. "Grumpy beaver" (empty if not ok)' },
      svg: { type: 'string', description: 'The SVG drawing (empty if not ok)' },
    },
    required: ['ok', 'message', 'name', 'svg'],
    additionalProperties: false,
  };
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: `Draw: "${prompt}"` }];
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client().messages.create({
      model: BUILD_MODEL,
      max_tokens: 5000,
      system: ARTIST,
      messages,
      output_config: { format: { type: 'json_schema', schema } },
    });
    if (res.stop_reason === 'refusal') return { ok: false as const, message: 'Claude passed on that one. Try a different animal.' };
    const block = res.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text' || res.stop_reason === 'max_tokens') continue;
    const out = JSON.parse(block.text) as { ok: boolean; message: string; name: string; svg: string };
    if (!out.ok) return { ok: false as const, message: out.message.slice(0, 200) || 'That one’s a bit much for 9 AM. Try something more mid.' };
    const svg = cleanSvg(out.svg);
    if (svg) return { ok: true as const, message: out.message.slice(0, 200), name: (out.name || prompt).slice(0, 60), svg };
    messages.push({ role: 'assistant', content: block.text });
    messages.push({ role: 'user', content: 'That SVG used something that isn’t allowed. Redraw it with only the allowed elements and attributes, double quotes, no style attributes, comments or text.' });
  }
  return { ok: false as const, message: 'The drawing came out wonky. Give it another go.' };
}

// ---------------------------------------------------------------
// Personal-best drawings: their spirit animal doing the lift, looping
// ---------------------------------------------------------------
const LIFT_ARTIST = `You draw tiny animated trophies for "9AM Crew", a small, friendly weekday 9 AM workout group (mostly retirees and moms). When someone hits a new personal best on a lift, you draw THEIR spirit animal doing that lift, as a short looping cartoon. The group's identity is MID-LEVEL ENERGY: proud, cheerful, a bit funny, never intense.

What to draw:
- The same character as their avatar (same animal, colours, mood and props where it makes sense), now with a full body, doing the named lift with good form. Make the lift unmistakable: a barbell on the back for a back squat, pulling a bar from the floor for a deadlift, pressing a bar overhead for a press, and so on. Gentle cartoon proportions, a determined or pleased face.
- One simple loop of the movement, about 1.6 to 2.4 seconds, repeating forever. Animate a few groups with transforms: the body and bar moving down and up for a squat, the bar rising for a press, and so on. Keep the feet planted. A small gold sparkle or two that fades in and out is welcome. Smooth and readable is better than complicated.

How to draw:
- One SVG, viewBox="0 0 100 100", with xmlns="http://www.w3.org/2000/svg". Double quotes on every attribute.
- Shapes: svg, g, defs, circle, ellipse, rect, path, polygon, polyline, line, linearGradient, radialGradient, stop, with presentation attributes only (fill, stroke, stroke-width, stroke-linecap, stroke-linejoin, opacity, transform and shape geometry).
- Motion: only <animateTransform> (attributeName="transform", type translate, scale or rotate) and <animate> (on opacity, fill, or shape geometry), with values, keyTimes, keySplines, calcMode, dur, begin (plain times like "0s" only) and repeatCount="indefinite". Put an animation inside the group it moves.
- No style attributes, no CSS, no text, no images, no links, no scripts, no comments.
- No background (it sits on a gold circle). The character fills most of the frame and is centred; it must read at 64 pixels wide.
- Keep it under about 12000 characters.`;

/** Draws their spirit animal doing the lift. Returns the cleaned SVG, or null if it didn't come out. */
export async function drawLiftArt(opts: { movement: string; character: string; avatarSvg?: string | null }) {
  const schema = {
    type: 'object',
    properties: { svg: { type: 'string', description: 'The animated SVG' } },
    required: ['svg'],
    additionalProperties: false,
  };
  const ask = `Their spirit animal: ${opts.character}.
${opts.avatarSvg ? `Their avatar (draw the same character, now with a body, doing the lift):\n${opts.avatarSvg}\n` : ''}
The lift they just hit a new best on: ${opts.movement}.`;
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: ask }];
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client().messages.create({
      model: BUILD_MODEL,
      max_tokens: 12000,
      system: LIFT_ARTIST,
      messages,
      output_config: { format: { type: 'json_schema', schema } },
    });
    const block = res.content.find((b) => b.type === 'text');
    if (res.stop_reason === 'refusal' || !block || block.type !== 'text' || res.stop_reason === 'max_tokens') continue;
    const svg = cleanSvg((JSON.parse(block.text) as { svg: string }).svg, { animated: true });
    if (svg) return svg;
    messages.push({ role: 'assistant', content: block.text });
    messages.push({
      role: 'user',
      content: 'That SVG used something that isn’t allowed. Redraw it with only the allowed elements, attributes and animation tags, double quotes, plain-number timings, no style attributes, comments or text.',
    });
  }
  return null;
}

// ---------------------------------------------------------------
// Gym clock: which timers each part runs
// ---------------------------------------------------------------
const CLOCK_RULES = `You set up the gym's wall clock for one day's class. The clock has two modes:
- countdown: one time, e.g. a 12:00 AMRAP, a 15:00 cap, an 8:00 warm-up.
- intervals: rounds of work then rest, e.g. EMOM 10 = 10 rounds of 1:00 work / 0:00 rest; Tabata = 8 × 0:20 / 0:10; "5 rounds: 3:00 on, 1:00 off".
A part can have a few timers that run back to back (e.g. a 6:00 countdown, then 4 × 2:00 / 1:00). The app starts each one when the last ends, and the clock adds ${LEAD_IN} seconds of "get ready" before each.

Rules:
- Only give a part timers when the workout text clearly sets the time: AMRAPs, EMOMs, caps, intervals, timed stations, timed warm-ups or cool-downs. A part written as sets and reps, or "for time" with no cap, gets no timers (leave it out).
- For "for time" with a time cap, use a countdown of the cap.
- Use what the Strong level does when levels differ in timing; levels almost always share the clock.
- Give each timer a short label the coach will recognise ("AMRAP", "EMOM 10", "Row intervals").
- Times in seconds. Never invent rest that isn't written.`;

/** Claude reads the workout and suggests the clock timers for each part. */
export async function draftClockPlan(opts: { parts: Part[]; brief: string }): Promise<ClockPlan> {
  const lines = opts.parts.map((p, i) => {
    const v = p.versions[2] || p.versions[3] || p.versions[1] || p.versions[0];
    return `Part ${i} — ${p.label}: ${p.title}${p.minutes ? ` (${p.minutes} min)` : ''}\n${v}`;
  });
  const schema = {
    type: 'object',
    properties: {
      parts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            part: { type: 'integer', description: 'Part number from the list' },
            label: { type: 'string', description: "The part's label" },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['countdown', 'intervals'] },
                  label: { type: 'string' },
                  seconds: { type: 'integer', description: 'countdown length; 0 for intervals' },
                  rounds: { type: 'integer', description: 'intervals only; 0 for countdown' },
                  work: { type: 'integer', description: 'seconds of work per round; 0 for countdown' },
                  rest: { type: 'integer', description: 'seconds of rest per round; 0 if none' },
                },
                required: ['type', 'label', 'seconds', 'rounds', 'work', 'rest'],
                additionalProperties: false,
              },
            },
          },
          required: ['part', 'label', 'steps'],
          additionalProperties: false,
        },
      },
    },
    required: ['parts'],
    additionalProperties: false,
  };
  const res = await client().messages.create({
    model: BUILD_MODEL,
    max_tokens: 2000,
    system: withBrief(CLOCK_RULES, opts.brief),
    messages: [{ role: 'user', content: `Today's workout:\n\n${lines.join('\n\n')}\n\nSet up the clock.` }],
    output_config: { format: { type: 'json_schema', schema } },
  });
  if (res.stop_reason === 'refusal') throw new Error('Claude couldn’t set up the clock for this one.');
  const block = res.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('Claude didn’t send timers back. Try again.');
  const raw = JSON.parse(block.text) as { parts: unknown };
  return cleanClockPlan(raw.parts, opts.parts.length).filter((p) => p.steps.length);
}
