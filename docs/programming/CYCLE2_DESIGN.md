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

1. A faster 3 km run (or 3,000 m row), and hold or improve your 1 km.
2. Your first double-unders, or longer unbroken sets.
3. Learn the front squat, hang clean and push press.
4. Run off the stations: finish the half Court6 Challenge.

## Exercise science it follows

- **Intensity spread:**
  - Most of the week is steady to moderate: work you have to push through, but can repeat tomorrow.
  - One threshold session (Tue) and two short, hard sessions (Mon, Fri) a week.
  - Wednesday is "sustain" (~7/10). Thursday is **steady (~5–6/10)**: the lighter day of the week, but still a real workout.
  - Why not truly easy: in a 60-minute class with only five sessions a week, conversational-pace work gives too small a stimulus. Recreational athletes with limited training time get more from the upper end of aerobic work (steady, ~5–6/10) than from very easy pace. Cycle 1's first Thursdays were too easy, which is why the day was rebuilt.
  - Hard days are never back to back.
- **Paces come from tests:** the Week 1 3 km gives each member's threshold and steady paces. A 3 km (~3,200 m) time trial is a validated predictor of lactate-threshold pace (Weltman et al., r ≈ 0.88–0.98). It's run a little faster than critical speed (~105–108%). It fits inside a 60-min class (about 12–20 min for most members). Jake chose 3 km over 5 km for class time; a 5 km may come later in the year.
- **Running volume** rises about 10% a week and never more than 20–30% in any 2-week window. Injury risk climbs with jumps over ~20–30% (Nielsen 2014; Damsted 2019); the 10% figure itself is a conservative convention, not a proven threshold. Volume drops on the deload and returns to the pre-deload level after it.
- **Strength:** one moderate exposure per lift a week holds Cycle 1 strength.
  - Power work (the cleans) comes first in its class, because conditioning in the same session blunts power more than strength.
  - The lift always comes before conditioning.
- **Skill:** double-unders, practised short and often. A 3–5 min block in the Mon, Wed and Fri warm-ups, plus a skill block on Tuesday.
  - Distributed practice beats one long weekly block for learning a motor skill.

## Weekly split

| Day | Lift / skill | Conditioning | Intensity |
|---|---|---|---|
| **Mon** | Front squat | Short hard intervals: bike or row inside, 200–400 m repeats outside | Hard |
| **Tue** | Double-unders skill block | The week's **threshold** piece, paced off each member's 3 km time. Test days live here. | Moderate (threshold) |
| **Wed** | Hang clean / power clean | Stations + **compromised running**: run or row legs into wall balls, lunges, carries, burpees | Sustain (~7/10) |
| **Thu** | No lift | **Longer steady piece** (25–35 min, ~5–6/10) with a clock and a structure that changes every week, then accessories | Steady (lighter, still challenging) |
| **Fri** | Push press (odd weeks) / bench press (even weeks) | Short, sharp station-style piece, 8–12 min | Hard |

Plus:
- Accessories on Mon, Wed and Fri go after the lift. On Thursday they go after the conditioning.
- Double-unders get 3–5 minutes in the Mon, Wed and Fri warm-ups.

## The 9 weeks

| Wk | Dates | Phase | Lifts | Engine / tests | Double-unders (Tue block + Mon/Wed/Fri warm-ups) |
|---|---|---|---|---|---|
| 1 | Jan 4–8 | Test | Learn the lifts; build to a moderate 5 (RPE 7) to set starting loads | **3 km test** (Tue). Other running stays low this week. | Rope rhythm: single-unders, line hops, first single-single-double attempts once ~10 unbroken single-unders |
| 2 | Jan 11–15 | Base | 4 × 6 @ 70% | Threshold 3 × 8 min | **Baseline** (Tue): max unbroken. Then 1 single + 1 double |
| 3 | Jan 18–22 | Base | 4 × 5 @ 75% | Threshold 4 × 8 min | Single doubles off singles, building to 2–3 in a row |
| 4 | Jan 25–29 | Base | 5 × 5 @ 75% | Threshold 3 × 10 min · **Karen** (Fri) | Small sets (3–5 in a row), EMOM practice |
| 5 | Feb 1–5 | Build | 5 × 3 @ 80% | Threshold 2 × 15 min; compromised-running legs grow | Bigger sets (5–15), fewer misses; scaled levels on attempts |
| 6 | Feb 8–12 | Build | 4 × 3 @ 85% (RPE 8 cap) | Threshold 20 min continuous; hardest week | Double-unders under fatigue: sets inside a conditioning piece |
| 7 | Feb 15–19 | Primer | 2 × 3 @ 75%, then 1 × 2 @ 85% | Volume −40 to −50%, intensity kept | Light practice: short, fresh sets |
| 8 | Feb 22–26 | Retest | Light technique only | **3 km retest** (Tue) · **1 km retest** (Fri) | Short warm-up practice only (test week) |
| 9 | Mar 1–5 | Flex | Optional technique | **Court6 Challenge, half** (Fri) | **Retest** (Tue): max unbroken, same rules as the baseline |

Double-unders run every week; the column shows each week's focus. Steady and Strong progress along the same ladder (single-unders → single-single-double → single-double-single-double → consecutive doubles) at their own rung. This is CrossFit's coaching progression (expert opinion; no trials exist).

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
    - Push press ≈ 120% of their strict-press estimated max (conservative; coaching tables put push press at 120–140% of strict press — expert opinion, no peer-reviewed ratio data).
    - Bench: build to RPE 7 on the day.
- **Percentages are in steps of 5** (checked by the app).
- **No conventional deadlift this cycle.** Swings and carries keep the hinge pattern in use. Cycle 3 opens with its own deadlift test.

## Engine work

- **Paces from the Week 1 3 km test** (coach notes, not member text). Derived from the Daniels–Gilbert VDOT equations (running) and Concept2 training bands converted with Paul's Law (rowing):
  - Threshold run ≈ 3 km pace + 0:25 per km (range +0:20–0:30). Holds across VDOT 30–50.
  - Steady run (Thursday) ≈ 3 km pace + 0:45–1:15 per km: +0:45–1:00 for low Zone 3, +1:00–1:15 for upper Zone 2; slower runners take the bigger number.
  - Rowing: threshold ≈ 3,000 m split + 8–12 s per 500 m; steady ≈ + 16–22 s per 500 m.
- **The 3 km test and retest:**
  - Outside it's a 3 km run; inside, or on icy days, a 3,000 m row. No time cap: it's a test.
  - No study compares 3 km vs 5 km test risk in masters; the 3 km choice rests on class time and a shorter all-out effort. Progressive warm-up before it, as for any all-out effort in adults over 40.
  - Each member uses the same option both times so the results compare.
  - Write down time, level, and run or row.
  - Coach notes say: members who haven't run much should row it.
- **The 1 km retest** (Week 8 Fri) compares against each member's Cycle 1 Dec 8 result, using the same option (run or row) they used then.
- **Threshold intervals** (Tuesdays) use 1–2 min rest between reps (Daniels cruise intervals: about 1 min rest per 5 min of work), building to 20 min continuous. Daniels caps a threshold session at about 10% of weekly mileage; in a time-based class with ~3 km of weekly class running that cap is exceeded by design, accepted because members' total weekly activity is higher than class running alone.
- **Compromised running** (Wednesdays) builds from 400 m legs (Weeks 2–4) to 600–800 m (Week 5) and 1 km legs (Week 6). That way, the half Challenge in Week 9 (4 × 1 km run + station) is familiar. (Coaching logic from specificity; the aerobic focus is supported by Brandt 2025, but no controlled study tests this leg progression.)
- **Inside and outside versions** on every conditioning piece:
  - Mirrored structure, time-matched at ~250 m row or 8/10 cal air bike per 200 m run.
  - Runs at least 200 m, in steps of 200 m.
- **Running volume:**
  - Week 2 starts at about Cycle 1's Week 8 level (~2.8 km of class running at Full) and rises ≤10% a week to Week 6.
  - Week 7 is −40 to −50% (Bosquet 2007 taper meta-analysis: cut volume 41–60%, keep intensity and frequency). Week 8 goes back to the Week 6 level, counting the retests.
  - The Week 1 3 km test is a one-off; keep the rest of Week 1's running low so the week stays inside the 20–30% two-week limit.

## Conditioning content

- **Stations:** wall balls, burpee broad jumps, sandbag lunges, farmers carry, rower, air bike.
  - No sled, no SkiErg, no plate pushes. Burpees, carries and lunges replace sled work.
- **Mon:** short hard intervals, 1–3 min work with equal or longer rest, e.g. bike sprints, row 250s, 200–400 m repeats outside. A second movement can join the machine (thrusters, swings) as in Cycle 1.
- **Tue:** steady threshold intervals at the paced effort. Few or no extra movements; the run or row is the work.
- **Wed:** stations and compromised running. Write it as a plain list when it's done once through.
- **Thu:** 25–35 min of steady work (~5–6/10) with a clock. It should leave members breathing hard and sweaty, just not wrecked: continuous work with little or no rest, machines plus moderate movements (light barbell, dumbbells, bodyweight). Change the format every week (ladders, EMOMs, pyramids, mixed-machine blocks) and don't reuse Cycle 1's Thursday formats. If a draft looks like a cool-down, it's too easy.
- **Fri:** 8–12 min and hard. Station-style some weeks (wall balls, burpees, carries, lunges, row/bike), classic couplets or triplets other weeks; vary the format.
  - Week 4 is **Karen**: 150 wall balls for time, 14/20 lb at Full, matching the official workout. Steady and Strong scale the reps or the ball.
  - Keep wall balls off Wed and Thu of Week 4 (2-day repeat rule).

**Variety (Jake, Nov 22):** don't make every day station work. Rotate formats through the week and across weeks (EMOMs, round-based pieces, chippers, AMRAPs, intervals, ladders) and use the whole movement pool, not just wall balls, lunges, carries and burpee broad jumps. Station-heavy pieces mainly go on Wednesday and in the Challenge build-up. Mon, Tue, Thu and Fri lean on classic class movements (gymnastics, dumbbells, kettlebells, barbell, bodyweight, machines).

## Accessories

- Recognizable appearance-style work: rows, curls, triceps, shoulders, abs.
- Give priority to upper-body pulling (rows, pull-up strength) to prep Cycle 3's pull-up skill.
- Vary the accessories week to week.
- No side planks or shoulder taps in conditioning; dynamic abs instead.

## Benchmarks and baselines

| What | When | Carries into |
|---|---|---|
| 3 km (run or row) | Wk 1, retest Wk 8 | Cycle 3+ engine paces |
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
| 2 | null | intervals | Double-unders · threshold · moderate | Double-under skill, then the week's threshold piece paced off the 3 km. 3 km test Wk 1 and 8. |
| 3 | Power clean | amrap | Hang clean · stations · sustain | Hang/power clean technique, then stations and compromised running at about 7/10. |
| 4 | null | long | Long steady piece · accessories · lighter | Longer steady piece (~5–6/10) with a clock and a new format each week, then accessories. Lighter than Mon/Fri, but a real workout. |
| 5 | Push press | short | Push press / bench · short workout · hard | Push press (odd weeks) or bench (even weeks), then a short hard station piece. Karen Wk 4, Court6 Challenge (half) Wk 9. |

`skill` is null on every day (the app only knows `pullup`). The cycle plan's `focus` and `notes` are admin-only: they show on the admin page and feed the AI as context. "easy" is kept out of them anyway, because the AI reads them and Cycle 1 showed that "easy" produces workouts that are too easy. The plan's `style` uses `intervals` for Tuesday's threshold work and `long` for Thursday; the app's `easy` style isn't used.

- **why** (draft, under 1,500 characters):
  > Nine weeks, Monday to Friday, to build a bigger engine and faster running. Week 1 tests a 3 km run (or 3,000 m row); that time sets your paces for the cycle. Tuesdays are the main threshold run or row, Wednesdays put running and stations together, Thursdays are a longer steady piece, and Mondays and Fridays are short and hard. The skill is double-unders: baseline in Week 2, retest in Week 9. New lifts keep you strong while the engine is the focus: front squat on Mondays, hang clean on Wednesdays, and push press or bench on Fridays. Week 8 retests the 3 km and your 1 km from Cycle 1, and Week 9 ends with the half Court6 Challenge.

## Open items

1. Holiday weeks (Dec 21 – Jan 1): plan separately.
2. ROADMAP.md dates for Cycles 3–6 after the two-week shift.
3. Benchmarks to add in the app's admin: "3 km run", "3,000 m row", and a double-under test.

## Evidence behind the design

Checked Nov 22, 2026. "Convention" and "expert opinion" mean no trial data was found; those choices are kept as conservative coaching defaults.

| Decision | Verdict | Evidence |
|---|---|---|
| Mostly steady-to-moderate week; Thursday steady (~5–6/10), not easy | Supported for recreational athletes | Rosenblat/Treff 2025 IPD network meta-analysis (pyramidal suits recreational); Festa 2020 (mostly moderate matched polarized with 17% less time); Muñoz 2014 |
| 3 km test to set paces | Supported | Weltman et al. 1987–1990 (3,200 m TT predicts threshold velocity); Galbraith 2014 (critical-speed field test) |
| Pace offsets from 3 km | Derived from validated models | Daniels–Gilbert VDOT equations; Concept2 half-marathon plan bands with Paul's Law |
| Threshold progression 3×8 → 20 min, 1–2 min rest | Convention (Daniels cruise intervals) | Daniels' Running Formula (secondary summaries) |
| Running ≈ +10%/week, ≤20–30% per 2 weeks | Partly; 10% is conservative convention | Nielsen 2014; Damsted 2019 |
| Primer week −40 to −50% volume, intensity kept | Supported | Bosquet 2007 meta-analysis; 2023 endurance taper meta-analysis |
| One weekly session per lift holds strength; 2–3+ working sets at ≥75–80% for masters | Supported | Bickel 2011; Spiering 2021 |
| Cleans first, before conditioning | Supported (placement is inference) | Schumann 2022 meta-analysis: concurrent training blunts explosive strength (SMD −0.28), not max strength |
| Starting loads: 5 @ RPE 7 ≈ 8RM, e1RM ≈ load × 1.25 | Supported (×1.24–1.27) | Brzycki, Epley, RTS RPE chart; Zourdos 2016 (novices misjudge RIR → keep RPE 8 cap) |
| Front squat ≈ 80% back squat; push press ≈ 120% strict | Expert opinion (conservative end) | Coaching ratio tables (FS 80–90%; PP 120–140%) |
| Short, frequent double-under practice | Supported, small effect | Lee & Genovese 1988 meta-analysis |
| Double-under progression | Expert opinion | CrossFit progression; start after ~10 unbroken single-unders |
| Hard days not back to back (~48 h) | Partly | Borges 2018 (masters recover performance in 48 h but report more fatigue); Fell & Williams 2008 |
| Compromised-running leg progression | Expert opinion / specificity | Brandt 2025 supports the aerobic focus only |
| 3 km instead of 5 km for masters | Not studied | Class-time and shorter all-out effort reasoning |

### Sources

- Rosenblat, Treff et al. 2025: https://link.springer.com/content/pdf/10.1007/s40279-024-02034-z.pdf
- Festa 2020: https://pmc.ncbi.nlm.nih.gov/articles/PMC7739641
- Muñoz 2014: https://pubmed.ncbi.nlm.nih.gov/23752040/
- Weltman et al.: https://www.thieme-connect.de/products/ejournals/pdf/10.1055/s-2008-1025694.pdf · https://thieme-connect.de/products/ejournals/abstract/10.1055/s-2007-1024821
- Galbraith 2014: https://kar.kent.ac.uk/43635/
- Daniels T-pace check: https://support.vdoto2.com/?p=1138 · cruise intervals: https://www.active.com/articles/get-the-most-out-of-your-threshold-workouts-with-cruise-intervals
- Concept2 half-marathon plan (training bands): https://www.concept2.com/training/plans/half-marathon-row-training-plan · Paul's Law: https://danwork.blogspot.com/p/pauls-law.html
- Nielsen 2014: https://pmc.ncbi.nlm.nih.gov/articles/PMC4842282 · Damsted 2019: https://pubmed.ncbi.nlm.nih.gov/29895234/
- Bosquet 2007: https://pubmed.ncbi.nlm.nih.gov/17762369/ · 2023 taper meta-analysis: https://pmc.ncbi.nlm.nih.gov/articles/PMC10171681/
- Bickel 2011: https://pubmed.ncbi.nlm.nih.gov/21131862/ · Spiering 2021: https://pubmed.ncbi.nlm.nih.gov/33629972
- Schumann 2022: https://link.springer.com/article/10.1007/s40279-021-01587-7
- Zourdos 2016: https://core.ac.uk/download/85256189.pdf
- Lee & Genovese 1988: https://www.gwern.net/doc/psychology/spaced-repetition/1988-lee.pdf
- CrossFit double-under progression: https://www.crossfit.com/essentials/from-single-unders-to-double-unders
- Brandt 2025 (HYROX physiology): https://pmc.ncbi.nlm.nih.gov/articles/PMC11994925/
- Borges 2018: https://researchcommons.waikato.ac.nz/handle/10289/12794 · Fell & Williams 2008: https://pubmed.ncbi.nlm.nih.gov/18268815/
- Lift-rotation research: `reports/Lift rotation in class programming.md`

