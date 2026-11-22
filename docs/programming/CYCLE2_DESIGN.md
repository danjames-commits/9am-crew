# Cycle 2 design: Engine + Running

The agreed design for Court6 Cycle 2, decided with Jake on Nov 22, 2026. The days get written from this, week by week, through the connector: preview → review → "push".

Every day must also pass [RULES.md](RULES.md) and the app's preview checks. Where this doc and the rules disagree, the rules win.

**Status:** design approved in chat; this write-up is waiting for Jake's review. Nothing is in the app yet.

## Dates

- **Cycle 2:** Mon Jan 4 – Fri Mar 5, 2027. 9 weeks, Monday to Friday, 45 class days.
- **Holiday weeks:** Mon Dec 21, 2026 – Fri Jan 1, 2027 are two stand-alone weeks outside any cycle, planned separately after Cycle 2. Dec 25 and Jan 1 are Fridays.
- **Knock-on:** every later cycle moves back two weeks. Cycle 3 becomes Mar 8 – May 7, 2027, so HYROX Ottawa (Apr 21–25) lands in Cycle 3's Week 7, the primer week.
  - [ROADMAP.md](ROADMAP.md) still shows the old dates. Update it once Jake confirms.

## Goals (member-facing, for the app)

1. A faster 5 km run (or 5,000 m row), and hold or improve your 1 km.
2. Your first double-unders, or longer unbroken sets.
3. Learn the front squat, hang clean and push press.
4. Run off the stations: finish the half Court6 Challenge.

## Exercise science it follows

- **Intensity spread:**
  - Most of the week is easy to moderate.
  - One threshold session (Tue) and two short, hard sessions (Mon, Fri) a week.
  - Wednesday is "sustain" (~7/10). Thursday is easy.
  - Hard days are never back to back.
- **Paces come from tests:** the Week 1 5 km gives each member's threshold and easy paces, because a 20–35 min effort sits right in the threshold window.
- **Running volume** rises no more than about 10% a week, drops on the deload, and returns to the pre-deload level after it.
- **Strength:** one moderate exposure per lift a week holds Cycle 1 strength.
  - Power work (the cleans) comes first in its class, because conditioning in the same session blunts power more than strength.
  - The lift always comes before conditioning.
- **Skill:** double-unders, practised short and often. A 3–5 min block in the Mon, Wed and Fri warm-ups, plus a skill block on Tuesday.
  - Distributed practice beats one long weekly block for learning a motor skill.

## Weekly split

| Day | Lift / skill | Conditioning | Intensity |
|---|---|---|---|
| **Mon** | Front squat | Short hard intervals: bike or row inside, 200–400 m repeats outside | Hard |
| **Tue** | Double-unders skill block | The week's **threshold** piece, paced off each member's 5 km time. Test days live here. | Moderate (threshold) |
| **Wed** | Hang clean / power clean | Stations + **compromised running**: run or row legs into wall balls, lunges, carries, burpees | Sustain (~7/10) |
| **Thu** | No lift | **Longer easy aerobic piece** (25–35 min) with a clock and a structure that changes every week, then accessories | Easy |
| **Fri** | Push press (odd weeks) / bench press (even weeks) | Short, sharp station-style piece, 8–12 min | Hard |

Plus:
- Accessories on Mon, Wed and Fri go after the lift. On Thursday they go after the conditioning.
- Double-unders get 3–5 minutes in the Mon, Wed and Fri warm-ups.

## The 9 weeks

| Wk | Dates | Phase | Lifts | Engine | Skill / tests |
|---|---|---|---|---|---|
| 1 | Jan 4–8 | Test | Learn the lifts; build to a moderate 5 (RPE 7) to set starting loads | **5 km test** (Tue). Other running stays low this week. | Double-under practice |
| 2 | Jan 11–15 | Base | 4 × 6 @ 70% | Threshold 3 × 8 min | **Double-under baseline** (Tue) |
| 3 | Jan 18–22 | Base | 4 × 5 @ 75% | Threshold 4 × 8 min | |
| 4 | Jan 25–29 | Base | 5 × 5 @ 75% | Threshold 3 × 10 min | **Karen** (Fri) |
| 5 | Feb 1–5 | Build | 5 × 3 @ 80% | Threshold 2 × 15 min; compromised-running legs grow | |
| 6 | Feb 8–12 | Build | 4 × 3 @ 85% (RPE 8 cap) | Threshold 20 min continuous; hardest week | |
| 7 | Feb 15–19 | Primer | 2 × 3 @ 75%, then 1 × 2 @ 85% | Running volume about −40% | |
| 8 | Feb 22–26 | Retest | Light technique only | **5 km retest** (Tue) · **1 km retest** (Fri) | |
| 9 | Mar 1–5 | Flex | Optional technique | **Court6 Challenge, half** (Fri) | **Double-under retest** (Tue) |

The percentages are for front squat, push press and bench. The cleans follow their own progression, below.

## Lifts and loading

All four lifts are on `list_movements`: Front squat, Power clean (hang work counts), Push press, Bench press.

- **Front squat (Mon):** weekly, following the table.
- **Hang clean / power clean (Wed):**
  - Weeks 1–3: technique EMOMs (RPE 6–7).
  - Weeks 4–6: heavier doubles and singles, building to RPE 8.
  - Week 7: light and fast.
  - Weeks 8–9: technique only.
  - Loading is RPE-based (`mode: build`, `pct` null) until members have a clean number.
- **Push press / bench press (Fri, A/B):**
  - Odd weeks are push press; even weeks are bench, so each gets 4–5 sessions.
  - Both follow the table's sets and reps.
  - Bench gets practice before Cycle 3 tests it.
- **Starting loads:**
  - Week 1 is a build to a moderate 5 at RPE 7, which is roughly an 8-rep max.
  - Estimated max ≈ that load × 1.25. Percentages are taken from that and rounded to 5 lb, with an RPE 8 cap. This formula goes in the coach notes.
  - Coach-note fallback for members who miss Week 1:
    - Front squat ≈ 80% of their Cycle 1 back-squat estimated max.
    - Push press ≈ 120% of their strict-press estimated max.
    - Bench: build to RPE 7 on the day.
- **Percentages are in steps of 5** (checked by the app).
- **No conventional deadlift this cycle.** Swings and carries keep the hinge pattern in use. Cycle 3 opens with its own deadlift test.

## Engine work

- **Paces from the Week 1 5 km test** (coach notes, not member text):
  - Threshold run ≈ 5 km pace + 0:10–0:20 per km.
  - Easy run ≈ 5 km pace + 1:30–2:00 per km.
  - Rowing: threshold ≈ 5,000 m split + 3–5 s per 500 m; easy ≈ + 15–20 s per 500 m.
- **The 5 km test and retest:**
  - Outside it's a 5 km run; inside, or on icy days, a 5,000 m row.
  - Each member uses the same option both times so the results compare.
  - Write down time, level, and run or row.
  - Coach notes say: members who haven't run much should row it.
- **The 1 km retest** (Week 8 Fri) compares against each member's Cycle 1 Dec 8 result, using the same option (run or row) they used then.
- **Compromised running** (Wednesdays) builds from 400 m legs (Weeks 2–4) to 600–800 m (Week 5) and 1 km legs (Week 6). That way, the half Challenge in Week 9 (4 × 1 km run + station) is familiar.
- **Inside and outside versions** on every conditioning piece:
  - Mirrored structure, time-matched at ~250 m row or 8/10 cal air bike per 200 m run.
  - Runs at least 200 m, in steps of 200 m.
- **Running volume:**
  - Week 2 starts at about Cycle 1's Week 8 level (~2.8 km of class running at Full) and rises ≤10% a week to Week 6.
  - Week 7 is about −40%. Week 8 goes back to the Week 6 level, counting the retests.
  - ⚠ The Week 1 5 km test is far above that level on its own. Treat it as a one-off test exception, and keep the rest of Week 1's running low.

## Conditioning content

- **Stations:** wall balls, burpee broad jumps, sandbag lunges, farmers carry, rower, air bike.
  - No sled, no SkiErg, no plate pushes. Burpees, carries and lunges replace sled work.
- **Mon:** short hard intervals, 1–3 min work with equal or longer rest, e.g. bike sprints, row 250s, 200–400 m repeats outside. A second movement can join the machine (thrusters, swings) as in Cycle 1.
- **Tue:** steady threshold intervals at the paced effort. Few or no extra movements; the run or row is the work.
- **Wed:** stations and compromised running. Write it as a plain list when it's done once through.
- **Thu:** 25–35 min of easy aerobic work with a clock. Change the format every week (ladders, EMOMs, pyramids, mixed-machine blocks with light movements) and don't reuse Cycle 1's Thursday formats.
- **Fri:** 8–12 min station-style and hard: wall balls, burpees, carries, lunges, row/bike.
  - Week 4 is **Karen**: 150 wall balls for time, 14/20 lb at Full, matching the official workout. Steady and Strong scale the reps or the ball.
  - Keep wall balls off Wed and Thu of Week 4 (2-day repeat rule).

## Accessories

- Recognizable appearance-style work: rows, curls, triceps, shoulders, abs.
- Give priority to upper-body pulling (rows, pull-up strength) to prep Cycle 3's pull-up skill.
- Vary the accessories week to week.
- No side planks or shoulder taps in conditioning; dynamic abs instead.

## Benchmarks and baselines

| What | When | Carries into |
|---|---|---|
| 5 km (run or row) | Wk 1, retest Wk 8 | Cycle 3+ engine paces |
| 1 km (run or row) | Retest Wk 8 (baseline: Cycle 1, Dec 8) | Cycle 4 1 km test |
| Double-unders (max unbroken) | Baseline Wk 2, retest Wk 9 | — |
| Karen | Wk 4 | Later benchmark |
| Court6 Challenge (half) | Wk 9 | Cycle 6 full Challenge |

Keep these compare lines in the coach notes when writing those days.

## Cycle object for the app (`create_cycle`)

- **name:** Engine + Running
- **start_date:** 2027-01-04
- **week_count:** 9
- **goals:** the four above
- **weeks:**

| Wk | kind | label | pct | sets × reps |
|---|---|---|---|---|
| 1 | test | Test | 0 | 0 × 5 |
| 2 | build | Base | 70 | 4 × 6 |
| 3 | build | Base | 75 | 4 × 5 |
| 4 | build | Base | 75 | 5 × 5 |
| 5 | build | Build | 80 | 5 × 3 |
| 6 | build | Build | 85 | 4 × 3 |
| 7 | deload | Primer | 85 | 1 × 2 |
| 8 | test | Retest | 0 | 0 × 0 |
| 9 | build | Flex | 65 | 3 × 5 |

- **days:**

| Day | lift | style | focus | notes |
|---|---|---|---|---|
| 1 | Front squat | intervals | Front squat · intervals · hard | Front squat, then short hard bike/row intervals (run outside). |
| 2 | null | long | Double-unders · threshold · moderate | Double-under skill, then the week's threshold piece paced off the 5 km. 5 km test Wk 1 and 8. |
| 3 | Power clean | amrap | Hang clean · stations · sustain | Hang/power clean technique, then stations and compromised running at about 7/10. |
| 4 | null | easy | Long aerobic · accessories · easy | Longer easy aerobic piece with a clock and a new format each week, then accessories. |
| 5 | Push press | short | Push press / bench · short workout · hard | Push press (odd weeks) or bench (even weeks), then a short hard station piece. Karen Wk 4, Court6 Challenge (half) Wk 9. |

`skill` is null on every day (the app only knows `pullup`). The cycle plan's `focus` and `notes` are admin-only: they show on the admin page and feed the AI as context. So "easy" is fine there; the day's own title, focus and why are still member-facing.

- **why** (draft, under 1,500 characters):
  > Nine weeks, Monday to Friday, to build a bigger engine and faster running. Week 1 tests a 5 km run (or 5,000 m row); that time sets your paces for the cycle. Tuesdays are the main threshold run or row, Wednesdays put running and stations together, Thursdays are a longer steady piece, and Mondays and Fridays are short and hard. The skill is double-unders: baseline in Week 2, retest in Week 9. New lifts keep you strong while the engine is the focus: front squat on Mondays, hang clean on Wednesdays, and push press or bench on Fridays. Week 8 retests the 5 km and your 1 km from Cycle 1, and Week 9 ends with the half Court6 Challenge.

## Open items

1. Holiday weeks (Dec 21 – Jan 1): plan separately.
2. ROADMAP.md dates for Cycles 3–6 after the two-week shift.
3. Week 1 running exception (the 5 km test): Jake to confirm.
