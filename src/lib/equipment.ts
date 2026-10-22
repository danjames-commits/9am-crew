// What to grab before class: the equipment a workout uses, read from its own text
// at your level (and inside or outside). No extra typing for whoever writes it.

const KIT: { name: string; test: RegExp }[] = [
  // Only lifts that are always done with a bar. A plain "deadlift" or "squat" can be bodyweight,
  // single-leg or a dumbbell move, so those count only through the day's main lift (see below).
  { name: 'Barbell', test: /\bbarbells?\b|\bempty bar\b|\b(back|front|overhead) squats?\b|\b(strict|push|bench) press(es)?\b|\b(power|hang power|squat|hang) cleans?\b|\bclean (&|and) jerks?\b|\bthrusters?\b|\b(power )?snatch(es)?\b|\bconventional deadlifts?\b|\bsumo deadlifts?\b/ },
  { name: 'Dumbbells', test: /\bdumbbells?\b|\bdb\b/ },
  { name: 'Kettlebell', test: /\bkettlebells?\b|\bkb\b|\bgoblet\b/ },
  { name: 'Wall ball', test: /\bwall ?balls?\b/ },
  { name: 'Med ball', test: /\bmed(icine)? balls?\b|\bslam balls?\b/ },
  { name: 'Sandbag', test: /\bsandbags?\b/ },
  { name: 'Box', test: /\bbox(es)?\b|\bstep-ups? to\b/ },
  { name: 'Rower', test: /\brow(er|ers|ing)?\b/ },
  { name: 'Air bike', test: /\b(air )?bikes?\b|\bassault bike\b/ },
  { name: 'Ski erg', test: /\bski ?ergs?\b/ },
  { name: 'Sled', test: /\bsleds?\b/ },
  { name: 'Jump rope', test: /\bjump ?ropes?\b|\bskipping\b|\b(double|single)[- ]unders?\b/ },
  { name: 'Rings', test: /\brings?\b/ },
  { name: 'Pull-up bar', test: /\bpull-?ups?\b|\bchin-?ups?\b|\btoes[- ]to[- ]bar\b|\bhanging\b|\bdead hang\b|\bknee raises\b|\bscap(ular)? pulls?\b|\bkip(ping)?\b|\bthe rig\b|\bhigh bar\b/ },
  { name: 'Bands', test: /\bbands?\b|\bbanded\b/ },
];

/** Phrases that look like equipment words but aren't (a "ring row" is rings, not a rower). */
const NOT_A_ROWER = /\b(ring|bent[- ]over|upright|renegade|dumbbell|db|kettlebell|kb|banded|band|seated|cable|inverted) rows?\b/g;
// A lift done with something else in hand ("Romanian deadlifts, light dumbbells") isn't a barbell lift.
const OTHER_WEIGHT = /\b(dumbbells?|db|kettlebells?|kb|goblet|sandbags?|landmine|bands?|banded|wall ?balls?|bodyweight)\b/;

/** The equipment named in some workout text, in a sensible pick-up order.
 *  `barbellLift`: the day's main lift is a barbell lift at this level. */
export function equipmentIn(texts: string[], opts: { barbellLift?: boolean } = {}) {
  const text = texts.join('\n').toLowerCase();
  const found = new Set<string>();
  if (opts.barbellLift) found.add('Barbell');
  for (const k of KIT) {
    let t = text;
    if (k.name === 'Rower') t = t.replace(NOT_A_ROWER, ' ');
    if (k.name === 'Barbell') t = t.split(/[·\n]/).filter((item) => !OTHER_WEIGHT.test(item)).join('\n');
    if (k.test.test(t)) found.add(k.name);
  }
  return KIT.map((k) => k.name).filter((n) => found.has(n));
}

/** The tracked lifts that use a barbell (Gentle's swaps, like goblet squats, don't). */
export const BARBELL_LIFTS = new Set(['Back squat', 'Front squat', 'Deadlift', 'Strict press', 'Push press', 'Bench press', 'Power clean', 'Snatch', 'Squat clean & jerk']);
