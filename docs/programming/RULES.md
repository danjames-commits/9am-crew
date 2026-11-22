# Court6 programming rules

The standing rules for writing Court6 class programming in the 9am Crew app. Use them as a checklist on every day and every level before proposing a change.

Where this file and the app disagree, the app wins. [`src/lib/programming/rules.ts`](../../src/lib/programming/rules.ts) checks every preview: a ✗ **problem** blocks the push, and a ⚠ **warning** shows in the preview text. Rules marked **(checked)** below are enforced there. The rest are coaching rules that a person has to check.

Newest ruling wins. Dates in brackets are when Jake set or last changed the rule.

Last updated: Nov 22, 2026.

## Rule 1: evidence first

Every programming decision — every write, rewrite or change: structure, movements, loads, reps, formats, rest, warm-ups, cool-downs, coach notes, cycle plans — must be supported by exercise science. Check the research before proposing a change, tell Jake what the evidence says and how strong it is, and say when something is only convention or expert opinion. Never fill gaps from memory (Nov 22). The connector repeats this rule in its instructions, tool descriptions and every preview.

## Process

- Change only what Jake asked for. His examples illustrate the idea; they are not a fixed list or a second program.
- Read live data with the connector (`get_days`, `get_cycle`) before editing. Never edit from memory or from these docs.
- Send whole days back. Don't patch one part on its own.
- Show a side-by-side of the full current day next to the full proposed day, plus the verbatim preview text.
- Fix every ✗ and re-preview. Never call `push_changes` until Jake says "push". Only call `undo_push` when he says "undo that".
- If a batch is split, report every change-set id.
- Only today and later can change (Halifax time). Today can change only until a member enters something for it, and today can't be deleted.
- Cycles run back to back with no gap. Cycle 2 starts Mon Dec 21, 2026.

## Levels

- There are three levels: **Steady, Strong, Full**. Every part has exactly three versions, in that order (checked by the connector). Gentle was removed (Nov 14).
- On tested lifts, all three levels do the same barbell movement and scale only by load or reps (Oct 16).
- Scale with load, reps, distance or time cap. Don't write a different workout per level.

## Equipment and banned work

- No sled push or pull. The gym has no sled for classes (Nov 14). **(checked)**
- No plate push as a sled substitute. Use a regular movement such as burpees, time-matched (Nov 14). **(checked)**
- No SkiErg. Use the rower, the air bike or running (Oct 16). **(checked)**
- No partner or team work Monday to Friday. Every weekday piece is individual (Oct 16). **(checked)**
- Never name HYROX in member text (title, focus, why, part titles, versions). The work can still build HYROX fitness quietly (Oct 16–26). **(checked)**
- No 400 m run test. The engine test is a 1 km run, or a 1,000 m row inside. A 400 m run inside a named benchmark such as Helen is fine (Oct 16).
- No no-clock, no-score easy mixed-machine flush. Easy work still gets a clock or a clear structure (Oct 16).

## Running, machines, inside and outside

- Runs are at least 200 m, in steps of 200 m (200, 400, 600 …). This doesn't apply inside named benchmarks (Nov 14). **(checked)**
- Runs are set by distance, never by time: no "jog 1 min" or "0:40 run" (Oct 26). **(checked)**
- Conditioning that uses a rower, bike or run needs an inside and an outside version. Inside uses machines and no running; outside uses running. **(checked: warning)**
  - Mondays have outside run versions too. Jake added them on Nov 15, which replaces the cycle plan's old "no running on squat day".
- The two sides mirror each other: same structure, buy-in, rounds, stations and cash-out. Only the cardio changes, and neither side drops a buy-in or cash-out (Oct 26).
- Time-match the swap: about 250 m row or 8/10 cal air bike per 200 m run (about 25 m of running per calorie). It's not a fixed 2:1 (Oct 26, confirmed Nov 14).
- If raising a run would push a piece past its cap, flag it. Don't quietly restructure (Nov 14).

## Member-facing text

- Member text is movements only. Effort, RPE, RIR, "leave reps in the tank", pace cues, rest guidance, scaling ("Need it lighter?") and equipment cues go in the coach notes (Oct 26). **(checked)**
- "No machine free", "No rower free" and "No bike free" swaps go in the coach notes, never in member text (Nov 14). **(checked)**
- "easy" never appears in the day's title, focus or why, in part titles, or in strength, skill, conditioning or accessory text. It's allowed in warm-ups and cool-downs, and in coach notes (Oct 26; warm-up/cool-down exception per rules.ts). **(checked)**
- Loads are in pounds only, never kg (checked). Write the lighter load first: `35/53 lb`, not `53/35 lb` (checked). Calorie pairs are lighter first too: `8/10 cal`.
- If a piece is done once through a list, write it as a plain list (`For time:` then the list). Don't use "rounds", "stations" or "assigned station" wording when that isn't how the piece runs (Nov 14).
- Score lines ("Write down your time, level…") can stay in member text.
- A named benchmark (Helen, Cindy, Fran, Grace, Isabel, Diane, Elizabeth, Annie, Karen, Jackie, Nancy, Kelly, DT, Murph, Chad) must match the official workout in its Full version. Steady and Strong can scale it. **(checked)**

## Movement selection and spacing

- Don't repeat a movement within 2 class days, counting Friday to Monday as 1 (Oct 26). **(checked: warning)** The checker knows a fixed list of common movements, so check anything outside that list by hand.
- No similar back-to-back days, or similar days within a week: same machines, movements and format, even on recovery days (Oct 16).
- No side planks or shoulder taps in conditioning; use dynamic abs such as V-ups or sit-ups instead (Nov 11). **(checked)** Side planks in accessory work are allowed but not preferred.
- Hollow holds and hollow rocks are accessory or warm-up only, never conditioning (Oct 26). **(checked)**
- No plank walk-outs (Oct 26). **(checked)**
- No isolated hop pieces. Hops can be a small part of a real piece, but prefer other jumping and plyo work (Oct 26).
- Warm-up drills (scap pull-ups, inchworms and similar) stay in the warm-up (Oct 16).
- Barbell work in conditioning is allowed any day, Thursday included, at light or moderate load. No tested lifts on Thursday (Oct 26).
- Accessories are recognizable appearance-style work: abs, curls, rows, triceps, shoulders and similar. Those are examples, not a fixed list. No obscure prehab; no tibialis raises (Nov 11, tibialis checked).
- Approved pool for adding variety (Oct 26), subject to the bans above:
  - Jumping/plyo: box jumps, box jump-overs, jumping lunges (lateral bar hops only as a small part of a piece)
  - Burpees: burpee pull-ups, bar-facing burpees, burpee box jump-overs, lateral burpees over the dumbbell, burpee to plate
  - Gymnastics: handstand push-ups (pike and box versions), wall walks, ring and bar dips, chest-to-bar pull-ups, hand-release push-ups
  - Core: AbMat sit-ups, V-ups, plank variations (not walk-outs, and no side planks or shoulder taps in conditioning), hollow variations in accessory work only
  - Loaded work: familiar class movements. Tested lifts must be on `list_movements`.

## Day-of-week intent (Cycle 1)

- **Monday, hard:** back squat, then short bike or row intervals, with an outside run version.
- **Tuesday, moderate:** the cycle skill, then the week's main aerobic running. The 1 km test and retest live here. Vary the skill format week to week (ladder, strict + kip, technique, EMOM) while still serving the cycle skill (Nov 11).
- **Wednesday, sustain:** deadlift, then threshold or station work at about 7/10. Compromised running belongs in the Build weeks.
- **Thursday, low intensity but engaging:** conditioning first, then accessories (checked: warning). No tested lifts; light barbell in the conditioning is fine. Give it a clock and a clear structure. Don't make it a boring copy of the week before (Oct 26).
- **Friday, hard, short, station-style:** power clean technique and strict press, then a station-style piece using wall balls, burpees, carries, lunges and row/bike, without naming HYROX (Oct 26).
- Strength always comes before conditioning when a day has both.

## Lifts and loading

- Tested-lift names come from `list_movements`: Back squat, Front squat, Deadlift, Bench press, Strict press, Push press, Power clean, Snatch, Squat clean & jerk.
- Percentages are of estimated 1RM: e1RM = 3RM × 1.06, or 5RM × 1.13 for the press. RPE 8 cap. Loads round to 5 lb.
- Prescribed percentages go in steps of 5 (75, 80, 85; no 77.5 or 82.5). **(checked)**
- Keep the baseline and retest lines in the coach notes when rewriting them: Week 1 vs Week 8 tests, the Week 2 skill baseline vs the Week 9 retest, and benchmark compare lines (Oct 26).

## Warm-up and cool-down

- Every warm-up has at least 2 stretches relevant to the day's work, and so does every cool-down. **(checked: warning)** The checker counts stretch words in the Strong version.
- The warm-up preps the day's actual movements, not a generic template.
- Do an exercise-science pass on warm-ups and cool-downs: ramp, prep, stretch, mobilise (Oct 26).

## Programming hygiene

- Buy-ins and cash-outs only where they fit, not as a daily template (Oct 26).
- Keep variety in conditioning and accessory work, still tied to the cycle goal (Oct 26).
- Coach notes stay under 2,000 characters. Longer notes are cut off.
- Never touch past days.

## Superseded rules

Don't apply these old versions.

| Old | Now |
|---|---|
| Four levels, including Gentle | Three levels: Steady, Strong, Full (Nov 14) |
| Minimum run 100 m | 200 m minimum, in 200 m steps (Nov 14) |
| "No machine free" line required in member text | Coach notes only (Nov 14) |
| No running on Monday (squat day) | Mondays have outside run versions (Nov 15) |
| "easy" banned everywhere in member text, warm-ups and cool-downs included | Allowed in warm-ups and cool-downs only (rules.ts) |
| Thursday no-clock easy aerobic flow | Low intensity but engaging, with a clock; conditioning first (Oct 16–26) |
| Sled work, or plate-push substitutes | No sled, no plate push (Nov 14) |
| 400 m + 1 mile test pair | 1 km run or 1,000 m row (Oct 16) |
| Loads heavier first with kg in brackets (`53/35 lb (24/16 kg)`) | Pounds only, lighter first (`35/53 lb`) |
| Percentages like 77.5% / 82.5% | Steps of 5 |
