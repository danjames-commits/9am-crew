// Court6 programming rules, checked on every day a preview changes.
// problems block the preview (so it can't be pushed); warnings show in the preview text.
import type { Part } from '../types';

export interface RuleDay {
  title: string;
  focus: string;
  why: string;
  parts: Part[];
}

export interface RuleResult {
  problems: string[];
  warnings: string[];
}

const LEVEL = ['Steady', 'Strong', 'Full'];

/** Official named workouts. Their Full version must keep every one of these pieces. */
export const NAMED_WORKOUTS: Record<string, string[]> = {
  helen: ['3 rounds', '400 m run', '21 kettlebell swings', '35/53 lb', '12 pull-ups'],
  cindy: ['20 min', '5 pull-ups', '10 push-ups', '15 air squats'],
  fran: ['21-15-9', 'thrusters', '65/95 lb', 'pull-ups'],
  grace: ['30 clean and jerks', '95/135 lb'],
  isabel: ['30 snatches', '95/135 lb'],
  diane: ['21-15-9', 'deadlifts', '155/225 lb', 'handstand push-ups'],
  elizabeth: ['21-15-9', 'cleans', '95/135 lb', 'ring dips'],
  annie: ['50-40-30-20-10', 'double-unders', 'sit-ups'],
  karen: ['150 wall balls', '14/20 lb'],
  jackie: ['1,000 m row', '50 thrusters', '30 pull-ups'],
  nancy: ['5 rounds', '400 m run', '15 overhead squats', '65/95 lb'],
  kelly: ['5 rounds', '400 m run', '30 box jumps', '30 wall balls'],
  dt: ['5 rounds', '12 deadlifts', '9 hang power cleans', '6 push jerks', '105/155 lb'],
  murph: ['1 mile run', '100 pull-ups', '200 push-ups', '300 air squats'],
  chad: ['1,000', 'box step-ups'],
};

/** Words that can't appear in member text anywhere (warm-ups and cool-downs included). */
const BANNED_EVERYWHERE: [RegExp, string][] = [
  [/hyrox/i, 'HYROX is never named to members'],
  [/\bsled\b/i, 'no sled (the gym has none)'],
  [/plate push/i, 'no plate push'],
  [/\bski\s?-?erg\b|\bski\b/i, 'no SkiErg (the gym has none)'],
  [/\bpartners?\b|\bteams? of\b|\bteam workout\b/i, 'no partner or team work Monday to Friday'],
  [/no (rower|bike|machine) free/i, '"No machine free" swaps go in the coach notes'],
  [/\bkg\b/i, 'loads are in pounds only'],
  [/tibialis/i, 'no tibialis raises (use recognizable accessories)'],
  [/plank walk-?outs?/i, 'no plank walk-outs'],
];

/** Effort, rest and scaling cues: coach notes only (warm-ups and cool-downs may still say "easy"). */
const CUES: [RegExp, string][] = [
  [/\beasy\b/i, '"easy" goes in the coach notes'],
  [/\brpe\b/i, 'RPE goes in the coach notes'],
  [/in the tank/i, '"reps in the tank" goes in the coach notes'],
  [/talk-?able|chatty|full sentences/i, 'pace cues go in the coach notes'],
  [/all-out|hard but smooth|fairly hard|very hard/i, 'effort cues go in the coach notes'],
  [/need it lighter|if a set feels/i, 'scaling goes in the coach notes'],
];

const CONDITIONING_BANS: [RegExp, string][] = [
  [/side planks?/i, 'no side planks in conditioning'],
  [/shoulder taps?/i, 'no shoulder taps in conditioning'],
  [/hollow (hold|rock)s?/i, 'hollow holds are accessory only'],
];

const isAccessory = (p: Part) => p.kind === 'skill' && /accessor/i.test(p.label);
const named = (p: Part) => {
  const t = `${p.title} ${p.benchmark ?? ''} ${p.outdoor?.benchmark ?? ''}`.toLowerCase();
  return Object.keys(NAMED_WORKOUTS).find((n) => new RegExp(`\\b${n}\\b`).test(t));
};

/** Every member-facing string in a part, with a label for messages. */
function texts(p: Part): { where: string; text: string }[] {
  const out = [{ where: `"${p.title}" title`, text: p.title }];
  p.versions.forEach((v, i) => out.push({ where: `"${p.title}" ${LEVEL[i]}`, text: v }));
  if (p.outdoor) {
    out.push({ where: `"${p.title}" outside title`, text: p.outdoor.title });
    p.outdoor.versions.forEach((v, i) => out.push({ where: `"${p.title}" outside ${LEVEL[i]}`, text: v }));
  }
  return out;
}

const RUN = /(\d[\d,.]*)\s?(m|km)\s+(?:easy\s+|fast\s+)?(run|jog|strides?|run\/walk|walk\/jog)\b/gi;
const TIMED_RUN = /\b\d+(?::\d\d)?\s?(?:s|sec|min)\s+(?:easy\s+)?(?:run|jog)\b|\b(?:run|jog)\s+(?:for\s+)?\d+(?::\d\d)?\s?(?:s|sec|min)\b/i;

export function checkDayRules(date: string, day: RuleDay): RuleResult {
  const problems: string[] = [];
  const warnings: string[] = [];
  const bad = (msg: string) => problems.push(`${date}: ${msg}`);
  const warn = (msg: string) => warnings.push(`${date}: ${msg}`);

  for (const [re, why] of [...BANNED_EVERYWHERE, ...CUES.slice(1)]) {
    for (const f of ['title', 'focus', 'why'] as const) if (re.test(day[f])) bad(`day ${f}: ${why}.`);
  }
  if (CUES[0][0].test(day.title) || CUES[0][0].test(day.focus) || CUES[0][0].test(day.why)) bad(`day title/focus/why: ${CUES[0][1]}.`);

  for (const p of day.parts) {
    const isNamed = named(p);
    const warmCool = p.kind === 'warmup' || p.kind === 'cooldown';
    for (const { where, text } of texts(p)) {
      for (const [re, why] of BANNED_EVERYWHERE) if (re.test(text)) bad(`${where}: ${why}.`);
      for (const [re, why] of CUES) {
        if (warmCool && re === CUES[0][0]) continue;
        if (re.test(text)) bad(`${where}: ${why}.`);
      }
      if (p.kind === 'conditioning') for (const [re, why] of CONDITIONING_BANS) if (re.test(text)) bad(`${where}: ${why}.`);
      if (!isNamed) {
        for (const m of text.matchAll(RUN)) {
          const n = Number(m[1].replace(/,/g, '')) * (m[2].toLowerCase() === 'km' ? 1000 : 1);
          if (n < 200) bad(`${where}: runs are at least 200 m (found ${m[0]}).`);
          else if (n % 200 !== 0) bad(`${where}: runs go in steps of 200 m (found ${m[0]}).`);
        }
        if (TIMED_RUN.test(text)) bad(`${where}: runs are set by distance, never by time.`);
      }
      for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s?\/\s?(\d+(?:\.\d+)?)\s?lb/g)) {
        if (Number(m[1]) > Number(m[2])) bad(`${where}: write the lighter load first (${m[2]}/${m[1]} lb, not ${m[0]}).`);
      }
      for (const m of text.matchAll(/@\s?(\d+(?:\.\d+)?)\s?%/g)) {
        if (Number(m[1]) % 5 !== 0) bad(`${where}: percentages go in steps of 5 (found ${m[1]}%).`);
      }
    }
    if (p.lift) p.lift.pct.forEach((x, i) => {
      if (x != null && x % 5 !== 0) bad(`"${p.title}" ${LEVEL[i]} lift: percentages go in steps of 5 (found ${x}%).`);
    });

    if (isNamed) {
      const full = (p.outdoor?.versions[2] ?? p.versions[2]).toLowerCase();
      const missing = NAMED_WORKOUTS[isNamed].filter((piece) => !full.includes(piece.toLowerCase()));
      if (missing.length) bad(`"${p.title}" is an official named workout; its Full version must match the official one (missing: ${missing.join(', ')}).`);
    }

    if (p.kind === 'conditioning' && !p.outdoor && p.versions.some((v) => /\b(row|bike|run)\b/i.test(v)))
      warn(`"${p.title}" has no outside version.`);
    if (warmCool) {
      const n = (p.versions[1].match(/stretch|pigeon|child'?s pose|90\/90|pry|pass-throughs?|thread-the-needle|cat-cows?|forward fold|spiderman lunge|dead hang/gi) ?? []).length;
      if (n < 2) warn(`${p.kind === 'warmup' ? 'Warm-up' : 'Cool-down'} has ${n} stretch${n === 1 ? '' : 'es'}; aim for at least 2.`);
    }
  }

  if (new Date(`${date}T12:00:00`).getDay() === 4) {
    const ci = day.parts.findIndex((p) => p.kind === 'conditioning');
    const ai = day.parts.findIndex(isAccessory);
    if (ci >= 0 && ai >= 0 && ai < ci) warn('Thursday: conditioning comes before accessories.');
  }
  return { problems, warnings };
}

/** Movements used in a day's strength, conditioning and accessory work (not warm-ups or cool-downs). */
const MOVES: [string, RegExp][] = [
  ['wall balls', /wall balls?/i],
  ['burpees', /burpee(?! broad)/i],
  ['burpee broad jumps', /burpee broad jumps?/i],
  ['farmers carry', /farmers? carry/i],
  ['lunges', /lunges?/i],
  ['thrusters', /thrusters?/i],
  ['kettlebell swings', /kettlebell swings?/i],
  ['box jump-overs', /box jump-overs?/i],
  ['step-ups', /step-ups?/i],
  ['push-ups', /push-ups?/i],
  ['pull-ups', /pull-ups?|chin-ups?/i],
  ['sit-ups', /sit-ups?/i],
  ['V-ups', /\bv-ups?|tuck-ups?/i],
  ['curls', /\bcurls?\b/i],
  ['lateral raises', /lateral raises?/i],
  ['skull crushers', /skull crushers?/i],
  ['dumbbell snatches', /dumbbell snatch(es)?/i],
  ['overhead squats', /overhead squats?/i],
  ['front squats', /front squats?/i],
  ['barbell rows', /barbell (bent-over )?rows?/i],
  ['dumbbell rows', /dumbbell rows?/i],
  ['ring rows', /ring rows?/i],
  ['Russian twists', /russian twists?/i],
];

export function movementsOf(parts: Part[]): Set<string> {
  const found = new Set<string>();
  for (const p of parts) {
    if (p.kind === 'warmup' || p.kind === 'cooldown') continue;
    if (p.lift) found.add(p.lift.movement.toLowerCase());
    const all = [...p.versions, ...(p.outdoor?.versions ?? [])].join('\n');
    for (const [name, re] of MOVES) if (re.test(all)) found.add(name);
  }
  return found;
}

/** Weekday dates in order, so "within 2 class days" counts Friday to Monday as 1. */
function classDayIndex(date: string): number {
  const d = new Date(`${date}T12:00:00Z`);
  const days = Math.round(d.getTime() / 86_400_000);
  const weeks = Math.floor((days + 3) / 7); // epoch day 0 is a Thursday
  return weeks * 5 + Math.min(4, ((days + 3) % 7));
}

/** Warnings for a movement repeated within 2 class days of a changed day. */
export function checkRepeats(changed: string[], allDays: Record<string, Part[]>): string[] {
  const warnings: string[] = [];
  const dates = Object.keys(allDays).sort();
  const moves = Object.fromEntries(dates.map((d) => [d, movementsOf(allDays[d])]));
  const reported = new Set<string>();
  for (const date of changed) {
    for (const other of dates) {
      if (other === date) continue;
      const gap = Math.abs(classDayIndex(other) - classDayIndex(date));
      if (gap === 0 || gap > 2) continue;
      for (const m of moves[date] ?? []) {
        if (!moves[other]?.has(m)) continue;
        const key = [date, other].sort().join(' ') + m;
        if (reported.has(key)) continue;
        reported.add(key);
        warnings.push(`${date}: ${m} also on ${other} (within 2 class days).`);
      }
    }
  }
  return warnings;
}
