export type Level = 1 | 2 | 3 | 4;
export type LevelText = [string, string, string, string];
export type LevelPct = [number | null, number | null, number | null, number | null];

export const LEVELS: { n: Level; name: string; blurb: string }[] = [
  { n: 1, name: 'Gentle', blurb: 'New, coming back, or working around an injury. Lighter tools and simpler moves.' },
  { n: 2, name: 'Steady', blurb: 'Comfortable with the basics. Moderate weights, a pace you can hold.' },
  { n: 3, name: 'Strong', blurb: 'Lifting regularly and ready to push. The standard workout.' },
  { n: 4, name: 'Full', blurb: 'Experienced. Heavier weights and the hardest version of each move.' },
];

export const levelName = (n: number) => LEVELS[Math.min(4, Math.max(1, n)) - 1].name;

export type PartKind = 'warmup' | 'strength' | 'skill' | 'conditioning' | 'cooldown';

export interface LiftSpec {
  /** Movement members log, used to work out their weight. */
  movement: string;
  /** Percent of each level's estimated best; null = no percentage (pick by feel). */
  pct: LevelPct;
  /** Work sets and reps, so the app can lay out each person's sets. */
  sets?: number;
  reps?: number;
  /** The easier movement Gentle uses instead (e.g. Goblet squat). */
  gentleMovement?: string;
  /** 'percent' = sets × reps at a % of your best; 'build' = build up to a solid set of N (finding your numbers, test days). */
  mode?: 'percent' | 'build';
  /** Extra coaching line shown to every level, e.g. "Pause 1 s at the bottom". */
  note?: string;
}

export interface Part {
  kind: PartKind;
  label: string;
  title: string;
  minutes?: number;
  versions: LevelText;
  lift?: LiftSpec;
  /** Version to do outside when the weather is good (running instead of rowing, etc.). */
  outdoor?: { title: string; versions: LevelText; benchmark?: string };
  /** Name of the benchmark this part is (Cindy, 1,000 m row...), so members can log a result right here. */
  benchmark?: string;
}

export interface WorkoutDraft {
  class_date: string;
  title: string;
  focus: string;
  why: string;
  parts: Part[];
}

export interface Profile {
  id: string;
  display_name: string;
  level: number;
  is_admin: boolean;
  /** Runs class: coach mode, coach notes and the gym clock (admins can too). */
  is_coach?: boolean;
  approved: boolean;
  animal?: string | null;
}
