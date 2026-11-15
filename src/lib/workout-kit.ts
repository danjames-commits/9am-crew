import { partWords } from '@/components/PartText';
import { LEVELS, type Part } from './types';
import { adjustKit, BARBELL_LIFTS, equipmentIn } from './equipment';

export interface KitChanges {
  add: string[];
  remove: string[];
}

/** What the app reads from the workout for these levels (0 = Steady … 2 = Full). */
export function foundKit(parts: Part[], levels: number[], outside: boolean) {
  return equipmentIn(
    levels.flatMap((i) =>
      parts.flatMap((p) => {
        const w = partWords(p, i, outside);
        return [p.kind === 'strength' ? '' : w.title, w.headline, w.body];
      }),
    ),
    { barbellLift: parts.some((p) => p.lift && BARBELL_LIFTS.has(p.lift.movement)) },
  );
}

/** The kit for one level, with the coach's changes. */
export function workoutKit(parts: Part[], level: number, outside: boolean, changes?: KitChanges) {
  return adjustKit(foundKit(parts, [level - 1], outside), changes?.add, changes?.remove);
}

/** Everything any level needs (what the coach sets out), with the coach's changes. */
export function setOutKit(parts: Part[], outside: boolean, changes?: KitChanges) {
  return adjustKit(foundKit(parts, LEVELS.map((_, i) => i), outside), changes?.add, changes?.remove);
}
