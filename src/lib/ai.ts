import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cyclePosition, liftPart, liftPct, suggestWorkout, DAY_PLAN, weightFor } from './programming/engine';
import { LEVELS, type LevelText, type LiftSpec, type Part, type WorkoutDraft } from './types';
import { addDays, longDate, weekday } from './dates';
import type { Program } from './data';
import type { WeatherCall } from './weather-rules';

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
export const DAILY_LIMIT = { build: 60, scale: 8, recap: 5 } as const;

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
const CREW = `You program workouts for "9AM Crew": about 8 people (mostly retirees and moms, relaxed and friendly, all ages and abilities) who train together every weekday at 9 AM in a small rented gym space in Charlottetown, PEI, Canada. Classes are about 50–60 minutes. Weights are in pounds.

Assume this equipment unless the admin says otherwise: barbells and plates, kettlebells, dumbbells, wall balls, a few rowers, air bikes, plyo boxes, gymnastic rings, a pull-up bar, resistance bands. There is road and sidewalk outside for walking and running.

Hard rules:
- NEVER program partner or team work, pairs, relays, "you go I go", or anything that needs another person. Everyone works on their own.
- Every part is written four times, one per level:
  ${LEVELS.map((l) => `${l.name}: ${l.blurb}`).join('\n  ')}
  Gentle should be genuinely gentle (low impact, lighter tools, step-ups not box jumps, wall or incline push-ups, walking not running).
- Every conditioning part needs an "outdoor" version that swaps rowing or biking for walking or running outside (or does the whole thing outside), for days the weather is good. Only leave outdoor null if an outside version makes no sense.
- Strength parts use the "lift" settings, not free text. Pick the lift from the allowed list. "percent" means sets × reps at a percentage of each person's best (give the Strong-level percentage; the app works out the others). "build" means building up to a solid set of N (for finding numbers or test days). The app writes the strength text itself from these settings; put any coaching cue in "note".
- Follow the cycle: use the week's percentage, sets and reps for the main lift unless the admin asks otherwise. On an ease-off week keep everything lighter; on test week the main lift is "build".
- Keep it safe and sensible for older adults: no high-skill Olympic lifting for Gentle or Steady, no max-effort jumping, plenty of warm-up for the main lift.
- Vary the conditioning from recent days. Give it a short, friendly name (e.g. "Steady Twelve").
- Write plainly: short lines, real numbers, separate lines with a newline. No emoji.`;

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
                    gentle_movement: { type: 'string', enum: movements },
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
        gentleMovement: movements.includes(p.lift.gentle_movement) ? p.lift.gentle_movement : p.lift.movement,
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
  program: Program;
  date: string;
  request: string;
  current?: WorkoutDraft | null;
  weather?: WeatherCall | null;
}): Promise<WorkoutDraft> {
  const { supabase, program, date, request, current, weather } = opts;
  const [{ data: movementRows }, { data: recent }] = await Promise.all([
    supabase.from('movements').select('name').order('sort'),
    supabase
      .from('workouts')
      .select('class_date, title, parts')
      .gte('class_date', addDays(date, -14))
      .lte('class_date', addDays(date, 7))
      .neq('class_date', date)
      .order('class_date'),
  ]);
  const movements = (movementRows ?? []).map((m) => m.name as string);
  const pos = cyclePosition(date, program.cycle_start, program.cycle_weeks);
  const plan = DAY_PLAN[weekday(date)];
  const reference = suggestWorkout({ date, cycleStart: program.cycle_start, cycleWeeks: program.cycle_weeks });

  const recentLines = (recent ?? []).map((r) => {
    const cond = (r.parts as Part[]).find((p) => p.kind === 'conditioning');
    return `${longDate(r.class_date)}: ${r.title}${cond ? ` (conditioning: ${cond.title})` : ''}`;
  });

  const context = `Workout for ${longDate(date)}.
Day focus: ${plan.focus}.
Cycle ${pos.cycle}, week ${pos.week.index + 1} of ${program.cycle_weeks}: ${pos.week.label}${pos.week.kind === 'build' ? ` (main lift ${pos.week.sets}×${pos.week.reps} at ${pos.week.pct}% for Strong)` : pos.week.kind === 'deload' ? ' (ease-off week, about 60%, lighter conditioning)' : ' (test week: build to a new best)'}${pos.started ? '' : ' — the cycle has not started yet'}.
Crew goals this cycle: ${program.goals.length ? program.goals.join('; ') : 'none set'}.
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
      system: CREW,
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
    system: `You help one member of a small, friendly over-50s-and-moms fitness group adjust today's workout. Be warm, practical and brief: at most about 120 words. Give specific swaps for the parts affected (exercise, reps, weight or effort), keep everything they can still do, and never suggest partner work. Plain text with short lines, no headings, no emoji. You are not a doctor: if they describe sharp pain, swelling, dizziness, chest symptoms or anything that sounds like an injury, tell them to skip what hurts and check with a health professional, and keep the rest gentle. End with: "Check with an admin if you're unsure."`,
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
export async function writeRecap(facts: string) {
  const res = await client().messages.create({
    model: QUICK_MODEL,
    max_tokens: 400,
    system: `You write the Friday recap for "9AM Crew", a small, friendly weekday workout group (mostly retirees and moms) in Charlottetown, PEI. It's posted in their group chat. Warm, upbeat, a little playful, never cheesy. At most about 80 words, plain text, two or three short paragraphs, at most one emoji. Celebrate new personal bests by first name. Never single out who missed days or compare attendance between people. End with one line about what's coming next week.`,
    messages: [{ role: 'user', content: facts }],
  });
  const block = res.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No recap');
  return block.text.trim();
}
