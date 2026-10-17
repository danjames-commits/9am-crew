Rewrite Court6 Cycle 1 (9-week block, weekdays only, Oct 19 – Dec 20, 2026) so it loads straight into our class app. This is a reformat, not a redesign: keep the training exactly as it is and change only how it's written, using the rules below. Produce two files:

1. The coach docx, as before, updated to these rules.
2. A JSON file in the exact shape at the end. This is what the app imports.

DO NOT CHANGE THE METHODOLOGY
Keep exactly:
- The block shape: Test → Base ×3 → Build ×2 → Primer/Deload → Retest → Flex.
- Test and retest pairs: 3RM back squat and deadlift, 5RM strict press, and the 1 km run (or 1,000 m row) in Week 1, repeated in Week 8 on the same days, with the same protocols and ladders.
- The block skill (toes-to-bar): Week 2 baseline, progressions in Weeks 3–8, Week 9 retest, plus the optional strict pull-up baseline for the next block.
- Benchmarks and baselines: Cindy (Wk 4), Helen and the Mini-Rox (Wk 9), and the Week 1 station AMRAP repeated in Week 8. Every one says what to record (time, rounds, level, run splits).
- The rotation across cycles: this block's retests and Week 9 baselines become the next block's starting numbers. Keep the "What's next" hand-off and the scorecard (Appendix A) in the docx.
- Every % and sets × reps in the strength progression table, the e1RM method (3RM × 1.06, 5RM × 1.13), the RPE 8 cap, the +2.5–5% / −5–10% rules, the Week 7 primer, and the Week 9 optional technique work.
- The weekly split, the intensity rules (two hard days, Wednesday sustain, Thursday easy), running volume (≤10% weekly increase), lift before conditioning, and the masters, new-member and injury rules.
If an app rule below would change any of this, keep the methodology and say in coach_notes how you fit it.

AUDIENCE
About 8–16 adults, mixed ages and abilities, about a third aged 40+. Everyone works on their own. No partner or team work, ever.

LEVELS: write 4, not 3, same stimulus
The app has four levels, in this order: Gentle, Steady, Strong, Full.
- Gentle = Foundations, Steady = Intermediate, Strong = Rx.
- Full = Rx by default. Only make Full harder where there's a natural next rung on the scaling ladder (Appendix B) that keeps the same stimulus, cap and target. Don't add volume or change what limits the athlete (gas / cardio / muscle).
- Each level's text must work on its own. Never write "as written" or "same as Rx": copy the full workout into each level, then apply that level's loads and changes.

STRENGTH BLOCKS
- One lift per block. If a day has two (clean complex + strict press), make two blocks, in the same order as now.
- If a lift has more than one scheme that day (e.g. Week 6 "1 × 3 @ 80%, 3 × 3 @ 85%", Week 7 "2 × 3 @ 75%, 1 × 2 @ 85%"), make one block per scheme, in order, labelled e.g. "Strength · ramp" and "Strength · top sets". Keep every set and %.
- Movement names must match this list exactly: Back squat, Front squat, Deadlift, Bench press, Strict press, Push press, Power clean, Snatch, Squat clean & jerk. Hang power clean work counts as Power clean.
- Percent days: use the % from the progression table for every level that uses the barbell, the same number for Steady, Strong and Full: "pct": [null, p, p, p]. Gentle is null (Gentle does the Foundations alternative by RPE).
- Test and retest days: mode "build", reps 3 (squat, deadlift) or 5 (press), "pct" all null. Keep the full ladder, attempt rules and "last clean set = your 3RM" wording in each level's text.
- RPE-based technique work (clean EMOMs, the Week 9 optional technique work): mode "build", "pct" all null, with the protocol written out in full.
- Gentle's movement: the Foundations alternative already in the program. In "gentleMovement", use the closest of: Goblet squat, Kettlebell deadlift, Dumbbell press, Kettlebell swing, Dumbbell snatch, Dumbbell clean & press. Name the exact one (box squat, trap-bar deadlift) in Gentle's text.
- Ramp sets, rest, the RPE 8 cap and the adjustment rules go in the lift's "note", as one or two short sentences.
- Non-lift tests (1 km run, toes-to-bar max, Cindy, Helen, Mini-Rox): keep them as written. End each level's text with a line saying exactly what to record, e.g. "Record: time, level, and whether you ran or rowed."

CONDITIONING
- Write an INSIDE version (rower / air bike, no running) and an OUTSIDE version (with the runs), each at all 4 levels. The app picks one based on the weather. Use the program's own swap (400 m run = 500 m row = 20/16 cal air bike; 1 km test = 1,000 m row) to write the inside version. This replaces the "icy day" notes.
- Put the score on the last line of each level's text, specific to that level: cap, target, feel and pace, e.g. "Cap 12:00 · Aim: every minute done in 35–45 s · Feel: cardio · Pace: sustain".

OTHER BLOCKS
- Skill work (toes-to-bar progressions, baselines, retests) is a "skill" block.
- Accessory work is its own block, kind "skill", labelled "Accessory".
- Warm-up and cool-down can be the same text for all 4 levels.
- Give every block its minutes, from your time budget.

WRITING RULES
- Loads in pounds only, no kg. Lighter load first: "35/53 lb", not "53/35 lb".
- Day title: 50 characters or fewer, e.g. "Back Squat 5×5 + Row/Press Intervals".
- Focus: one short line, e.g. "Squat · intervals · hard".
- Purpose ("why"): 1–2 plain sentences, written for members.
- Member-facing notes (injury swaps, masters options) go in the text of the block they apply to.
- Coach-only logistics (waves, staggered starts, movement screens, scorecard reviews, who records splits, holiday hours) go in "coach_notes", never in member text. Plain sentences, 2000 characters or fewer per day; "" if none.
- Plain language, short lines, real numbers. No emoji.

JSON SHAPE (one file, valid JSON, every weekday from Mon Oct 19 to Fri Dec 18)
{
  "cycle": {
    "start_date": "2026-10-19",
    "name": "Strength + Aerobic Base",
    "why": "3–5 plain sentences for admins on how the block is built (max 1500 chars)",
    "goals": ["up to 4 short goals"],
    "weeks": [
      { "kind": "test" | "build" | "deload", "label": "Test" | "Base" | "Build" | "Primer" | "Retest" | "Flex",
        "pct": <back squat % that week (top sets); 0 on test weeks>, "sets": <n>, "reps": <n> }
      // exactly 9 entries, one per week
    ],
    "days": {
      "1": { "focus": "...", "style": "amrap" | "intervals" | "long" | "easy" | "short",
             "lift": "<movement or null>", "gentle": "<Gentle movement or null>",
             "skill": null, "notes": "max 200 chars" },
      "2": {...}, "3": {...}, "4": {...}, "5": {...}
    }
  },
  "workouts": [
    {
      "class_date": "2026-10-19",
      "title": "...",
      "focus": "...",
      "why": "...",
      "coach_notes": "...",
      "parts": [
        { "kind": "warmup", "label": "Warm-up", "title": "Warm-up", "minutes": 12,
          "versions": ["Gentle", "Steady", "Strong", "Full"] },
        { "kind": "strength", "label": "Strength", "title": "Back squat 5×5", "minutes": 20,
          "lift": { "movement": "Back squat", "gentleMovement": "Goblet squat",
                    "mode": "percent" | "build", "sets": 5, "reps": 5,
                    "pct": [null, 75, 75, 75], "note": "..." },
          "versions": ["Gentle", "Steady", "Strong", "Full"] },
        { "kind": "conditioning", "label": "Conditioning", "title": "Row/Press Intervals", "minutes": 12,
          "versions": ["inside, Gentle", "...", "...", "..."],
          "outdoor": { "title": "Run/Press Intervals", "versions": ["outside, Gentle", "...", "...", "..."] } },
        { "kind": "skill", "label": "Accessory", "title": "Accessory superset", "minutes": 5,
          "versions": ["...", "...", "...", "..."] },
        { "kind": "cooldown", "label": "Cool-down", "title": "Cool-down", "minutes": 5,
          "versions": ["...", "...", "...", "..."] }
      ]
    }
  ]
}

Notes on the JSON:
- "versions" is always exactly 4 strings: Gentle, Steady, Strong, Full. Use "\n" between lines. Each string is 1500 characters or fewer.
- "pct" is [null, p, p, p] on percent days (same % for Steady, Strong and Full, from the progression table) and [null, null, null, null] on build days.
- "kind" is one of: warmup, strength, skill, conditioning, cooldown. At most 12 parts per day.
- Leave out "outdoor" only when an outside version makes no sense (e.g. pure barbell work).
- Keep "skill": null in cycle.days. Toes-to-bar lives in the workouts' skill blocks.

Before finishing, check: 45 workouts; every "versions" array has 4 items; every movement name is from the lists above; no kg; no partner work; every load is written lighter/heavier; every test and retest from the original is still there, on the same day; every percent and sets × reps matches the progression table.
