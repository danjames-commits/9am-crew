import { partWords } from '@/components/PartText';
import type { Part } from './types';
import { adjustKit, BARBELL_LIFTS, equipmentIn } from './equipment';

export interface KitChanges {
  add: string[];
  remove: string[];
}

/** What the app reads from the workout for these levels (0 = Gentle … 3 = Full). */
export function foundKit(parts: Part[], levels: number[], outside: boolean) {
  return equipmentIn(
    levels.flatMap((i) =>
      parts.flatMap((p) => {
        const w = partWords(p, i, outside);
        return [p.kind === 'strength' ? '' : w.title, w.headline, w.body];
      }),
    ),
    // The main lift: Gentle often swaps to a dumbbell or kettlebell version.
    { barbellLift: parts.some((p) => p.lift && levels.some((i) => BARBELL_LIFTS.has(i === 0 ? (p.lift!.gentleMovement ?? p.lift!.movement) : p.lift!.movement))) },
  );
}

/** The kit for one level, with the coach's changes. */
export function workoutKit(parts: Part[], level: number, outside: boolean, changes?: KitChanges) {
  return adjustKit(foundKit(parts, [level - 1], outside), changes?.add, changes?.remove);
}

/** Everything any level needs (what the coach sets out), with the coach's changes. */
export function setOutKit(parts: Part[], outside: boolean, changes?: KitChanges) {
  return adjustKit(foundKit(parts, [0, 1, 2, 3], outside), changes?.add, changes?.remove);
}
