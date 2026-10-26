import type { LevelPct, Part, PartKind } from './types';

export const WORKOUT_LIMITS = { title: 80, focus: 80, why: 600, partText: 1500, parts: 12 };

const KINDS: PartKind[] = ['warmup', 'strength', 'skill', 'conditioning', 'cooldown'];

export type PartsCheck = { parts: Part[] | null; problems: string[]; warnings: string[] };

export function checkParts(parts: unknown): PartsCheck {
  const problems: string[] = [];
  const warnings: string[] = [];
  if (!Array.isArray(parts)) {
    return { parts: null, problems: ['The workout parts must be a list.'], warnings };
  }
  if (parts.length > WORKOUT_LIMITS.parts) {
    problems.push(`Too many parts: ${parts.length} (the most allowed is ${WORKOUT_LIMITS.parts}).`);
    return { parts: null, problems, warnings };
  }
  const out: Part[] = [];
  const cut = (v: unknown, where: string): string => {
    const s = String(v ?? '');
    if (s.length > WORKOUT_LIMITS.partText) warnings.push(`${where} text cut to ${WORKOUT_LIMITS.partText} characters`);
    return s.slice(0, WORKOUT_LIMITS.partText);
  };
  (parts as Part[]).forEach((p, i) => {
    const n = i + 1;
    if (!p || typeof p !== 'object') {
      problems.push(`Part ${n}: is not a valid part`);
      return;
    }
    if (!KINDS.includes(p.kind)) {
      problems.push(`Part ${n}: unknown kind "${String(p.kind)}" (use ${KINDS.join(', ')})`);
      return;
    }
    if (!Array.isArray(p.versions) || p.versions.length !== 4) {
      problems.push(`Part ${n} (${p.kind}): needs exactly 4 level versions`);
      return;
    }
    const versions = p.versions.map((v, j) => cut(v, `Part ${n} level ${j + 1}`)) as Part['versions'];
    const part: Part = {
      kind: p.kind,
      label: String(p.label ?? '').slice(0, 60),
      title: String(p.title ?? '').slice(0, 80),
      versions,
    };
    if (typeof p.minutes === 'number' && p.minutes > 0 && p.minutes < 120) part.minutes = Math.round(p.minutes);
    if (p.outdoor && Array.isArray(p.outdoor.versions) && p.outdoor.versions.length === 4) {
      part.outdoor = {
        title: String(p.outdoor.title ?? '').slice(0, 80),
        versions: p.outdoor.versions.map((v, j) => cut(v, `Part ${n} outdoor level ${j + 1}`)) as Part['versions'],
      };
      if (typeof p.outdoor.benchmark === 'string' && p.outdoor.benchmark.trim()) part.outdoor.benchmark = p.outdoor.benchmark.trim().slice(0, 60);
    }
    if (typeof p.benchmark === 'string' && p.benchmark.trim()) part.benchmark = p.benchmark.trim().slice(0, 60);
    if (p.lift && typeof p.lift.movement === 'string' && Array.isArray(p.lift.pct) && p.lift.pct.length === 4) {
      part.lift = {
        movement: p.lift.movement.slice(0, 60),
        pct: p.lift.pct.map((x) => (typeof x === 'number' && x > 0 && x <= 110 ? Math.round(x) : null)) as LevelPct,
      };
      if (Number.isInteger(p.lift.sets) && p.lift.sets! > 0 && p.lift.sets! <= 12) part.lift.sets = p.lift.sets;
      if (Number.isInteger(p.lift.reps) && p.lift.reps! > 0 && p.lift.reps! <= 20) part.lift.reps = p.lift.reps;
      if (typeof p.lift.gentleMovement === 'string') part.lift.gentleMovement = p.lift.gentleMovement.slice(0, 60);
      if (p.lift.mode === 'percent' || p.lift.mode === 'build') part.lift.mode = p.lift.mode;
      if (typeof p.lift.note === 'string' && p.lift.note.trim()) part.lift.note = p.lift.note.trim().slice(0, 200);
    }
    out.push(part);
  });
  return { parts: problems.length ? null : out, problems, warnings };
}

export function cleanParts(parts: unknown): Part[] | null {
  return checkParts(parts).parts;
}

export function cleanWorkoutFields(input: { title: unknown; focus: unknown; why: unknown }) {
  const problems: string[] = [];
  const warnings: string[] = [];
  const title = String(input.title ?? '').trim();
  if (!title) problems.push('Give the workout a title.');
  if (title.length > WORKOUT_LIMITS.title) warnings.push(`Title cut to ${WORKOUT_LIMITS.title} characters`);
  const focus = String(input.focus ?? '');
  if (focus.length > WORKOUT_LIMITS.focus) warnings.push(`Focus cut to ${WORKOUT_LIMITS.focus} characters`);
  const why = String(input.why ?? '');
  if (why.length > WORKOUT_LIMITS.why) warnings.push(`"Why" note cut to ${WORKOUT_LIMITS.why} characters`);
  return {
    title: title.slice(0, WORKOUT_LIMITS.title),
    focus: focus.slice(0, WORKOUT_LIMITS.focus),
    why: why.slice(0, WORKOUT_LIMITS.why),
    problems,
    warnings,
  };
}
