-- Migration 035: Gentle is gone. Three levels now: 1 Steady, 2 Strong, 3 Full (were 2, 3, 4).
-- Anyone on Gentle moves to Steady. Every stored workout drops its Gentle version, its Gentle
-- percentage and its Gentle movement; every cycle day drops its Gentle movement. Saved MCP
-- change sets get the same treatment, so pushing a preview or undoing an old push can't bring
-- Gentle back. Cycle 1's coach notes are rewritten without Gentle. It's one transaction, and safe to run again.

begin;

-- One part: [Gentle, Steady, Strong, Full] -> [Steady, Strong, Full]. Parts already on three
-- levels are left alone, so a second run changes nothing.
create or replace function pg_temp.no_gentle_part(p jsonb) returns jsonb language sql immutable as $$
  select p
    || case when jsonb_typeof(p->'versions') = 'array' and jsonb_array_length(p->'versions') = 4
         then jsonb_build_object('versions', (p->'versions') - 0) else '{}'::jsonb end
    || case when jsonb_typeof(p->'outdoor'->'versions') = 'array' and jsonb_array_length(p->'outdoor'->'versions') = 4
         then jsonb_build_object('outdoor', (p->'outdoor') || jsonb_build_object('versions', (p->'outdoor'->'versions') - 0)) else '{}'::jsonb end
    || case when jsonb_typeof(p->'lift') = 'object'
         then jsonb_build_object('lift', ((p->'lift') - 'gentleMovement')
           || case when jsonb_typeof(p->'lift'->'pct') = 'array' and jsonb_array_length(p->'lift'->'pct') = 4
                then jsonb_build_object('pct', (p->'lift'->'pct') - 0) else '{}'::jsonb end)
         else '{}'::jsonb end
$$;

create or replace function pg_temp.no_gentle_parts(parts jsonb) returns jsonb language sql immutable as $$
  select case when jsonb_typeof(parts) = 'array'
    then coalesce((select jsonb_agg(pg_temp.no_gentle_part(p) order by ord) from jsonb_array_elements(parts) with ordinality t(p, ord)), '[]'::jsonb)
    else parts end
$$;

-- A cycle's days: {"1": {..., "gentle": "Dumbbell press"}, ...} -> the same without "gentle".
create or replace function pg_temp.no_gentle_days(days jsonb) returns jsonb language sql immutable as $$
  select case when jsonb_typeof(days) = 'object'
    then coalesce((select jsonb_object_agg(k, case when jsonb_typeof(v) = 'object' then v - 'gentle' else v end) from jsonb_each(days) e(k, v)), '{}'::jsonb)
    else days end
$$;

-- A workout or cycle row (as stored in a change set): fix its parts or days.
create or replace function pg_temp.no_gentle_row(r jsonb) returns jsonb language sql immutable as $$
  select case when jsonb_typeof(r) <> 'object' then r
    else r
      || case when r ? 'parts' then jsonb_build_object('parts', pg_temp.no_gentle_parts(r->'parts')) else '{}'::jsonb end
      || case when r ? 'days' then jsonb_build_object('days', pg_temp.no_gentle_days(r->'days')) else '{}'::jsonb end
  end
$$;

-- Workouts and cycles.
update public.workouts set parts = pg_temp.no_gentle_parts(parts)
  where parts::text <> pg_temp.no_gentle_parts(parts)::text;
-- Cycle 1's Helen day (Dec 16) told members "Need it lighter? 2 rounds at Gentle."
update public.workouts set parts = replace(parts::text, 'Need it lighter? 2 rounds at Gentle.', 'Need it lighter? Do 2 rounds.')::jsonb
  where parts::text like '%2 rounds at Gentle.%';
update public.cycles set days = pg_temp.no_gentle_days(days)
  where days::text <> pg_temp.no_gentle_days(days)::text;

-- MCP change sets: the rows each op writes, and the "before" copies undo puts back.
update public.mcp_change_sets set
  ops = coalesce((
    select jsonb_agg(case when op ? 'row' then op || jsonb_build_object('row', pg_temp.no_gentle_row(op->'row')) else op end order by ord)
    from jsonb_array_elements(ops) with ordinality t(op, ord)
  ), ops),
  before = case when before is null then null else before
    || jsonb_build_object('days', coalesce((select jsonb_object_agg(k, pg_temp.no_gentle_row(v)) from jsonb_each(coalesce(before->'days', '{}')) e(k, v)), '{}'::jsonb))
    || jsonb_build_object('cycles', coalesce((select jsonb_object_agg(k, pg_temp.no_gentle_row(v)) from jsonb_each(coalesce(before->'cycles', '{}')) e(k, v)), '{}'::jsonb))
  end;

-- Levels: Gentle (1) -> Steady, and everyone else down one number. Only once: skipped if the
-- profiles check already says 1 to 3.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'profiles_level_check' and pg_get_constraintdef(oid) like '%3)%') then
    raise notice 'levels already renumbered, skipping';
    return;
  end if;

  alter table public.profiles drop constraint if exists profiles_level_check;
  update public.profiles set level = greatest(level - 1, 1);
  alter table public.profiles alter column level set default 1;
  alter table public.profiles add constraint profiles_level_check check (level between 1 and 3);

  -- Benchmark results: a Gentle result was a different version, so it can't count as a Steady
  -- best. It keeps its score with no level, like results logged without one.
  alter table public.benchmark_results drop constraint if exists benchmark_results_level_check;
  update public.benchmark_results set level = case when level = 1 then null else level - 1 end where level is not null;
  alter table public.benchmark_results add constraint benchmark_results_level_check check (level between 1 and 3);

  -- After-class surveys only note the member's level at the time: Gentle -> Steady.
  alter table public.workout_surveys drop constraint if exists workout_surveys_level_check;
  update public.workout_surveys set level = greatest(level - 1, 1) where level is not null;
  alter table public.workout_surveys add constraint workout_surveys_level_check check (level between 1 and 3);
end $$;

-- Cycle 1 coach notes: the same days with Gentle taken out. Only a note still exactly as it was
-- seeded is changed, so a note a coach has edited since is left alone (listed below if it still
-- mentions Gentle).
update public.workout_coach_notes n set body = v.new, updated_at = now()
from (values
  ('2026-10-19', $n$Two coaches on test days if possible. Watch depth and back position; you call the set. Steady, Strong and Full test the barbell back squat (smaller jumps at Steady); only Gentle tests the goblet squat. Machine-only intervals: Monday has no running on purpose (heavy-leg day), so no outside version.
Scaling: Gentle warm-up: step instead of jump, walk instead of jog, comfortable range. Newer lifters / first 4 weeks after on-ramp: start with the empty bar (or lighter training bar), no max attempt; stop at the first RPE 8 set and record that. Masters (40+): RPE 8 max on the interval hard pieces. Knee or back pain: air bike only.
Test: stop at RPE 8 (2 reps left), no RPE 9–10 grinders. Gentle: one DB or KB at the chest, box for depth if needed. Record load in lb, level, coach notes. Week 1 3RM × 1.06 = e1RM for every squat % this block.
Intervals: hard pieces Gentle RPE 6 (can be 0:20), Steady RPE 7, Strong RPE 8, Full RPE 9. Same machine all 6 rounds. Cap 12:00 (fixed) · Aim: hold calories within 10% from round 1 to round 6 · Feel: gas · Pace: reach. No machine: score = reps instead of calories.
No machine (warm-up/cool-down): easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.
Ladder: Bar × 8, ~50% × 5, ~65% × 3, ~75% × 3.$n$,
   $n$Two coaches on test days if possible. Watch depth and back position; you call the set. Every level tests the barbell back squat (smaller jumps at Steady). Machine-only intervals: Monday has no running on purpose (heavy-leg day), so no outside version.
Scaling: easier warm-up: step instead of jump, walk instead of jog, comfortable range. Newer lifters / first 4 weeks after on-ramp: start with the empty bar (or lighter training bar), no max attempt; stop at the first RPE 8 set and record that. Masters (40+): RPE 8 max on the interval hard pieces. Knee or back pain: air bike only.
Test: stop at RPE 8 (2 reps left), no RPE 9–10 grinders. Record load in lb, level, coach notes. Week 1 3RM × 1.06 = e1RM for every squat % this block.
Intervals: hard pieces Steady RPE 7, Strong RPE 8, Full RPE 9. Same machine all 6 rounds. Cap 12:00 (fixed) · Aim: hold calories within 10% from round 1 to round 6 · Feel: gas · Pace: reach. No machine: score = reps instead of calories.
No machine (warm-up/cool-down): easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.
Ladder: Bar × 8, ~50% × 5, ~65% × 3, ~75% × 3.$n$),
  ('2026-10-20', $n$Start the 1 km in waves of 4–6 and read times out as they finish; if rowers run out inside, the next wave rows when a machine frees up (don't swap the test). Members choose run or row once and repeat the same option in Week 8. The easy flush needs no machines inside (jump ropes, floor space), so finished waves start it while the next wave rows. Write each member's time on their scorecard; it sets all run paces (easy = +1:30–2:30/km, threshold = +0:40–0:50/km).
Scaling: Gentle warm-up: step instead of jump, walk instead of jog, comfortable range.
Test targets: Cap 15:00 · Feel: cardio · Pace: reach. Row aim: Gentle a steady pace you can hold; Steady/Strong/Full even 500 m splits. Run aim: Gentle 7:30–11:00 (walking is fine), Steady 5:45–8:00, Strong 4:45–5:45, Full 3:45–4:45. Gentle keeps the same jog/walk plan in Week 8. No machine: next free rower, or the 1 km run outside if safe; a bodyweight swap can't be compared with Week 8.
Flush: Gentle RPE 4, others RPE 5. Cap 12:00 · Aim: smooth and easy · Feel: cardio (easy) · Pace: sustain.
No machine (warm-up): easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.$n$,
   $n$Start the 1 km in waves of 4–6 and read times out as they finish; if rowers run out inside, the next wave rows when a machine frees up (don't swap the test). Members choose run or row once and repeat the same option in Week 8. The easy flush needs no machines inside (jump ropes, floor space), so finished waves start it while the next wave rows. Write each member's time on their scorecard; it sets all run paces (easy = +1:30–2:30/km, threshold = +0:40–0:50/km).
Scaling: easier warm-up: step instead of jump, walk instead of jog, comfortable range.
Test targets: Cap 15:00 · Feel: cardio · Pace: reach. Row aim: even 500 m splits. Run aim: Steady 5:45–8:00 (jog/walk is fine), Strong 4:45–5:45, Full 3:45–4:45. Anyone who jogs and walks keeps the same plan in Week 8. No machine: next free rower, or the 1 km run outside if safe; a bodyweight swap can't be compared with Week 8.
Flush: RPE 5. Cap 12:00 · Aim: smooth and easy · Feel: cardio (easy) · Pace: sustain.
No machine (warm-up): easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.$n$),
  ('2026-10-21', $n$Coach stops any set where the back rounds. Steady, Strong and Full test the barbell deadlift; only Gentle tests the kettlebell deadlift. The easy EMOM is air bike only in Week 1, so no outside version (no extra running this week, no run test today); members without a bike use the no-machine swap. Stagger starts by 1:00 if bikes are short: half the class starts on Minute 2.
Scaling: Gentle warm-up: step instead of jump, walk instead of jog, comfortable range. Newer lifters / first 4 weeks after on-ramp: start light (bar plus small plates on blocks if needed), no max attempt; stop at the first RPE 8 set and record that. Sore low back after the test: keep the bike very easy and skip the bear crawl (glute bridges only).
Test: stop at RPE 8, no touch-and-go, reset every rep. Gentle: bell between the feet, on a low step if the floor is too far. Record load in lb, level, coach notes. Week 1 3RM × 1.06 = e1RM for every deadlift % this block.
EMOM: Gentle RPE 4–5, others RPE 5–6, not for score. Cap 12:00 (fixed) · Aim: smooth and easy, breathing stays calm · Feel: cardio (easy) · Pace: sustain.
No machine (warm-up/cool-down): easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.$n$,
   $n$Coach stops any set where the back rounds. Every level tests the barbell deadlift. The easy EMOM is air bike only in Week 1, so no outside version (no extra running this week, no run test today); members without a bike use the no-machine swap. Stagger starts by 1:00 if bikes are short: half the class starts on Minute 2.
Scaling: easier warm-up: step instead of jump, walk instead of jog, comfortable range. Newer lifters / first 4 weeks after on-ramp: start light (bar plus small plates on blocks if needed), no max attempt; stop at the first RPE 8 set and record that. Sore low back after the test: keep the bike very easy and skip the bear crawl (glute bridges only).
Test: stop at RPE 8, no touch-and-go, reset every rep. Record load in lb, level, coach notes. Week 1 3RM × 1.06 = e1RM for every deadlift % this block.
EMOM: RPE 5–6, not for score. Cap 12:00 (fixed) · Aim: smooth and easy, breathing stays calm · Feel: cardio (easy) · Pace: sustain.
No machine (warm-up/cool-down): easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.$n$),
  ('2026-10-22', $n$Movement screen during the accessory block: watch each member do 5 air squats, 5 PVC overhead squats, 20 s/side single-leg balance and a 20 s dead hang; note injuries and their level (Gentle, Steady, Strong or Full) on their card. If rowers and bikes are short, run two waves: wave 1 does the intervals while wave 2 does the accessory strength, then swap at about minute 31; or send the overflow to the no-machine bodyweight rounds. No outside version on purpose: Thursday is machine-only so weekly running volume stays as planned.
Scaling: Gentle warm-up: step instead of jump, walk instead of jog, comfortable range. Masters or injury: today is the best day for extra mobility or rehab work.
Intervals: Gentle RPE 3–4 (rounds can be 1:00–2:00 shorter, slow pedalling fine), Steady RPE 4 (rounds can be 1:00 shorter), Strong RPE 4–5, Full RPE 5. Zone 2: full sentences; if only a few words, slow down. Cap 19:00 (fixed) · Feel: cardio (easy) · Pace: sustain. Aim: Gentle same easy pace every round; Steady/Strong/Full row split 0:15–0:25 per 500 m slower than their 1 km test split, bike same calories each round (±1).
No machine (warm-up/cool-down): easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.$n$,
   $n$Movement screen during the accessory block: watch each member do 5 air squats, 5 PVC overhead squats, 20 s/side single-leg balance and a 20 s dead hang; note injuries and their level (Steady, Strong or Full) on their card. If rowers and bikes are short, run two waves: wave 1 does the intervals while wave 2 does the accessory strength, then swap at about minute 31; or send the overflow to the no-machine bodyweight rounds. No outside version on purpose: Thursday is machine-only so weekly running volume stays as planned.
Scaling: easier warm-up: step instead of jump, walk instead of jog, comfortable range. Masters or injury: today is the best day for extra mobility or rehab work.
Intervals: Steady RPE 4 (rounds can be 1:00 shorter, slow pedalling fine), Strong RPE 4–5, Full RPE 5. Zone 2: full sentences; if only a few words, slow down. Cap 19:00 (fixed) · Feel: cardio (easy) · Pace: sustain. Aim: row split 0:15–0:25 per 500 m slower than their 1 km test split, bike same calories each round (±1).
No machine (warm-up/cool-down): easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.$n$),
  ('2026-10-23', $n$Demo the wall ball, farmers carry, sandbag lunge and burpee broad jump standards before the AMRAP (4 min). Start members on different stations if kit is short. Steady, Strong and Full test the barbell strict press; only Gentle tests the seated dumbbell press. Benchmark: Full is the Rx standard; members record their level. No outside version: no running in this piece.
Scaling: Gentle warm-up: step instead of jump, walk instead of jog, comfortable range. Newer lifters / first 4 weeks after on-ramp: start with the empty bar (or lighter training bar), no max attempt; stop at the first RPE 8 set and record that. Shoulder sore after the press: goblet squats instead of wall balls. Knees: step-ups instead of lunges.
Test: stop at RPE 8, no leg drive. Gentle: back against a bench, record weight per hand. Record load in lb, level, coach notes. Week 1 5RM × 1.13 = e1RM for every press % this block.
AMRAP: all levels RPE 6, steady, not a max effort. Cap 10:00 · Feel: cardio · Pace: sustain. Aim: Gentle smooth and easy, Steady no rushing, Strong steady rounds, Full 5–7 rounds. Record rounds + reps and level (repeat in Week 8).
No machine (warm-up/cool-down): easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.
Ladder: Bar × 10, ~50% × 5, ~65% × 5.$n$,
   $n$Demo the wall ball, farmers carry, sandbag lunge and burpee broad jump standards before the AMRAP (4 min). Start members on different stations if kit is short. Every level tests the barbell strict press. Benchmark: Full is the Rx standard; members record their level. No outside version: no running in this piece.
Scaling: easier warm-up: step instead of jump, walk instead of jog, comfortable range. Newer lifters / first 4 weeks after on-ramp: start with the empty bar (or lighter training bar), no max attempt; stop at the first RPE 8 set and record that. Shoulder sore after the press: goblet squats instead of wall balls. Knees: step-ups instead of lunges.
Test: stop at RPE 8, no leg drive. Record load in lb, level, coach notes. Week 1 5RM × 1.13 = e1RM for every press % this block.
AMRAP: all levels RPE 6, steady, not a max effort. Cap 10:00 · Feel: cardio · Pace: sustain. Aim: Steady no rushing, Strong steady rounds, Full 5–7 rounds. Record rounds + reps and level (repeat in Week 8).
No machine (warm-up/cool-down): easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.
Ladder: Bar × 10, ~50% × 5, ~65% × 5.$n$),
  ('2026-10-26', $n$Machine and kettlebell piece: no running on squat day by design, so no outside version. Short on rowers? Members use the 'No machine free' swap on their own clock.
Scaling: Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range. Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain or injury: pain-free range, tell the coach.
Loads: e1RM × 0.65, rounded to 5 lb (lookup table in the coach book). Ramp: empty bar × 10, 40% × 5, 50% × 3, 60% × 2, rest 2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%). Gentle: goblet box squat at RPE 6–7.
Conditioning targets: Cap 12:00 (fixed) · Aim every minute done in 35–45 s · Feel cardio · Pace sustain. Low back: KB deadlifts instead of swings.
No machine (warm-up/cool-down): swap for easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.$n$,
   $n$Machine and kettlebell piece: no running on squat day by design, so no outside version. Short on rowers? Members use the 'No machine free' swap on their own clock.
Scaling: easier warm-up: step instead of jumping, walk instead of jogging, comfortable range. Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain or injury: pain-free range, tell the coach.
Loads: e1RM × 0.65, rounded to 5 lb (lookup table in the coach book). Ramp: empty bar × 10, 40% × 5, 50% × 3, 60% × 2, rest 2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 12:00 (fixed) · Aim every minute done in 35–45 s · Feel cardio · Pace sustain. Low back: KB deadlifts instead of swings.
No machine (warm-up/cool-down): swap for easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.$n$),
  ('2026-10-27', $n$Baseline is one fresh attempt per member; write it on the scorecard with their level (it is retested Tue Dec 15 at the same level).
Scaling: Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range. Pain: pain-free range, tell the coach.
Conditioning targets: RPE 5–6, not for time. Cap 28:00 · Aim 4 rounds at a pace you could hold for 40 min · Feel cardio · Pace sustain.
No machine (warm-up/cool-down): swap for easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.$n$,
   $n$Baseline is one fresh attempt per member; write it on the scorecard with their level (it is retested Tue Dec 15 at the same level).
Scaling: easier warm-up: step instead of jumping, walk instead of jogging, comfortable range. Pain: pain-free range, tell the coach.
Conditioning targets: RPE 5–6, not for time. Cap 28:00 · Aim 4 rounds at a pace you could hold for 40 min · Feel cardio · Pace sustain.
No machine (warm-up/cool-down): swap for easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.$n$),
  ('2026-10-28', $n$No running in this piece, so no outside version. Spread members across stations at the start so the farmers handles and sandbags don't bottleneck.
Scaling: Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range. Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain or injury: pain-free range, tell the coach.
Loads: e1RM × 0.65, rounded to 5 lb (lookup table in the coach book). Ramp: 40% × 5, 50% × 3, 60% × 2; reset every rep, no bouncing; rest 2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%). Gentle: KB deadlift at RPE 6–7.
Conditioning targets: first threshold piece. Cap 20:00 · Aim: Gentle steady rounds, short pause between stations is fine; Steady every round within ±15 s of round 1; Strong/Full 6–8 rounds, each within ±15 s of round 1 · Feel cardio · Pace sustain. Knees: step-ups instead of lunges. Low back: lighter farmers carry.
No machine (warm-up/cool-down): swap for easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.$n$,
   $n$No running in this piece, so no outside version. Spread members across stations at the start so the farmers handles and sandbags don't bottleneck.
Scaling: easier warm-up: step instead of jumping, walk instead of jogging, comfortable range. Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain or injury: pain-free range, tell the coach.
Loads: e1RM × 0.65, rounded to 5 lb (lookup table in the coach book). Ramp: 40% × 5, 50% × 3, 60% × 2; reset every rep, no bouncing; rest 2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: first threshold piece. Cap 20:00 · Aim: Steady every round within ±15 s of round 1 (a short pause between stations is fine); Strong/Full 6–8 rounds, each within ±15 s of round 1 · Feel cardio · Pace sustain. Knees: step-ups instead of lunges. Low back: lighter farmers carry.
No machine (warm-up/cool-down): swap for easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.$n$),
  ('2026-10-29', $n$If there aren't enough rowers and bikes, run the class in two waves: wave 1 does the intervals while wave 2 does the accessory strength, then swap at about minute 31; or send the overflow to the 'No machine free' bodyweight rounds. The intervals have no outside version on purpose: Thursday is machine-only so weekly running volume stays as planned.
Scaling: Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range. Masters or injury: today is the best day for extra mobility or rehab work.
Conditioning targets: Zone 2 (full sentences the whole time). RPE: Gentle 3–4, Steady 4, Strong 4–5, Full 5. Cap 19:00 (fixed) · Aim: Gentle same easy pace every round; Steady/Strong/Full row split 0:15–0:25 per 500 m slower than their 1 km test split, bike same calories each round (±1) · Feel cardio (easy) · Pace sustain.
No machine (warm-up/cool-down): swap for easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.$n$,
   $n$If there aren't enough rowers and bikes, run the class in two waves: wave 1 does the intervals while wave 2 does the accessory strength, then swap at about minute 31; or send the overflow to the 'No machine free' bodyweight rounds. The intervals have no outside version on purpose: Thursday is machine-only so weekly running volume stays as planned.
Scaling: easier warm-up: step instead of jumping, walk instead of jogging, comfortable range. Masters or injury: today is the best day for extra mobility or rehab work.
Conditioning targets: Zone 2 (full sentences the whole time). RPE: Steady 4, Strong 4–5, Full 5. Cap 19:00 (fixed) · Aim: row split 0:15–0:25 per 500 m slower than their 1 km test split, bike same calories each round (±1) · Feel cardio (easy) · Pace sustain.
No machine (warm-up/cool-down): swap for easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.$n$),
  ('2026-10-30', $n$No running in this piece, so no outside version.
Scaling: Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range. Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain or injury: pain-free range, tell the coach.
Clean: build from empty bar by feel, no percentages; RPE 6 is plenty (Gentle RPE 5–6).
Press loads: e1RM × 0.65, rounded to 5 lb (lookup table in the coach book). Build to working weight in 2–3 lighter sets; rest 1:30–2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%). Gentle: seated DB press at RPE 6–7.
Conditioning targets: Cap 12:00 · Aim: Gentle finish under the cap, rest as needed; Steady under the cap, smooth; Strong under the cap; Full 7:00–9:30 · Feel gas · Pace reach. Knees: wall balls to a lower target.
No machine (warm-up/cool-down): swap for easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.$n$,
   $n$No running in this piece, so no outside version.
Scaling: easier warm-up: step instead of jumping, walk instead of jogging, comfortable range. Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain or injury: pain-free range, tell the coach.
Clean: build from empty bar by feel, no percentages; RPE 6 is plenty.
Press loads: e1RM × 0.65, rounded to 5 lb (lookup table in the coach book). Build to working weight in 2–3 lighter sets; rest 1:30–2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 12:00 · Aim: Steady under the cap, smooth (rest as needed); Strong under the cap; Full 7:00–9:30 · Feel gas · Pace reach. Knees: wall balls to a lower target.
No machine (warm-up/cool-down): swap for easy jumping jacks, marching or jump rope, about 1:00 per 250 m or per 5 cal.$n$),
  ('2026-11-02', $n$Machine-only intervals (no running on squat day), so no outside version.
Warm-up: 5 min general, 6 min specific, then ramp sets.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach. Gentle: RPE 6–7 on the squat. Gentle: step instead of jumping, walk instead of jogging, comfortable range. Shoulder: burpees without the push-up.
Loads: e1RM × 0.7, round to nearest 5 lb (coach book table). Ramp: empty bar × 10, 40% × 5, 50% × 3, 60% × 2, then working sets; rest 2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 12:00 (fixed) · Aim: steady reps every round (Full: 10–14 burpees per round, steady across all 4) · Feel: gas · Pace: reach.
No machine: warm-up/cool-down machine → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Machine-only intervals (no running on squat day), so no outside version.
Warm-up: 5 min general, 6 min specific, then ramp sets.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach. Easier warm-up: step instead of jumping, walk instead of jogging, comfortable range. Shoulder: burpees without the push-up.
Loads: e1RM × 0.7, round to nearest 5 lb (coach book table). Ramp: empty bar × 10, 40% × 5, 50% × 3, 60% × 2, then working sets; rest 2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 12:00 (fixed) · Aim: steady reps every round (Full: 10–14 burpees per round, steady across all 4) · Feel: gas · Pace: reach.
No machine: warm-up/cool-down machine → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-11-03', $n$Easy-row overflow outside: members without a rower jog easy instead; that extra jog isn't counted in the planned running volume.
Warm-up: 5 min general, 6 min specific.
Scaling: Gentle: step instead of jumping, walk instead of jogging, comfortable range.
Conditioning targets: RPE 6. Cap 29:00 · Aim: the same split every round (±10 s) · Feel: cardio · Pace: sustain.
No machine: warm-up/cool-down machine → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Easy-row overflow outside: members without a rower jog easy instead; that extra jog isn't counted in the planned running volume.
Warm-up: 5 min general, 6 min specific.
Scaling: easier warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Conditioning targets: RPE 6. Cap 29:00 · Aim: the same split every round (±10 s) · Feel: cardio · Pace: sustain.
No machine: warm-up/cool-down machine → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-11-04', $n$No running in this piece, so no outside version. Start members on different stations so the sandbags don't bottleneck.
Warm-up: 5 min general, 6 min specific, then ramp sets.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach. Gentle: RPE 6–7 on the deadlift. Gentle: step instead of jumping, walk instead of jogging, comfortable range. Knees: step-ups instead of lunges.
Loads: e1RM × 0.7, round to nearest 5 lb (coach book table). Ramp: 40% × 5, 50% × 3, 60% × 2; reset every rep, no bouncing; rest 2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: threshold effort. Cap 23:00 · Aim: Gentle steady effort in all three (rounds don't have to match); others the same score (±1 round) in all three · Feel: cardio · Pace: sustain.
No machine: warm-up/cool-down machine → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$No running in this piece, so no outside version. Start members on different stations so the sandbags don't bottleneck.
Warm-up: 5 min general, 6 min specific, then ramp sets.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach. Easier warm-up: step instead of jumping, walk instead of jogging, comfortable range. Knees: step-ups instead of lunges.
Loads: e1RM × 0.7, round to nearest 5 lb (coach book table). Ramp: 40% × 5, 50% × 3, 60% × 2; reset every rep, no bouncing; rest 2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: threshold effort. Cap 23:00 · Aim: the same score (±1 round) in all three · Feel: cardio · Pace: sustain.
No machine: warm-up/cool-down machine → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-11-05', $n$If there aren't enough rowers and bikes, run the class in two waves: wave 1 does the intervals while wave 2 does the accessory strength, then swap at about minute 31; or send the overflow to the 'No machine free' bodyweight rounds. The intervals have no outside version on purpose: Thursday is machine-only so weekly running volume stays as planned.
Warm-up: 4 min general, 3 min specific.
Scaling: Gentle: step instead of jumping, walk instead of jogging, comfortable range. Masters or injury: today is the best day for extra mobility or rehab work.
Intervals: Zone 2. Effort: Gentle RPE 3–4 (slow pedalling fine), Steady RPE 4, Strong RPE 4–5, Full RPE 5.
Conditioning targets: Cap 20:00 (fixed) · Aim: Gentle same easy pace every round, could keep going; others same pace every round: row split 0:15–0:25 per 500 m slower than 1 km test split; bike, same calories each round (±1) · Feel: cardio (easy) · Pace: sustain.
No machine: warm-up/cool-down machine → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$If there aren't enough rowers and bikes, run the class in two waves: wave 1 does the intervals while wave 2 does the accessory strength, then swap at about minute 31; or send the overflow to the 'No machine free' bodyweight rounds. The intervals have no outside version on purpose: Thursday is machine-only so weekly running volume stays as planned.
Warm-up: 4 min general, 3 min specific.
Scaling: easier warm-up: step instead of jumping, walk instead of jogging, comfortable range. Masters or injury: today is the best day for extra mobility or rehab work.
Intervals: Zone 2. Effort: Steady RPE 4 (slow pedalling fine), Strong RPE 4–5, Full RPE 5.
Conditioning targets: Cap 20:00 (fixed) · Aim: same pace every round, could keep going: row split 0:15–0:25 per 500 m slower than 1 km test split; bike, same calories each round (±1) · Feel: cardio (easy) · Pace: sustain.
No machine: warm-up/cool-down machine → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-11-06', $n$No running in this piece, so no outside version.
Warm-up: 5 min general, 7 min specific.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach. Gentle: step instead of jumping, walk instead of jogging, comfortable range. Gentle press: RPE 6–7.
Clean: RPE 6–7 (Gentle RPE 5–6; Steady RPE 6 is plenty).
Press loads: e1RM × 0.7, round to nearest 5 lb (coach book table). Build to working weight in 2–3 lighter sets; rest 1:30–2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 10:00 · Aim: Gentle steady rounds, rest when needed; Steady/Strong steady rounds; Full 6–8 rounds · Feel: cardio · Pace: reach.
No machine: warm-up/cool-down machine → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$No running in this piece, so no outside version.
Warm-up: 5 min general, 7 min specific.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach. Easier warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Clean: RPE 6–7 (Steady RPE 6 is plenty).
Press loads: e1RM × 0.7, round to nearest 5 lb (coach book table). Build to working weight in 2–3 lighter sets; rest 1:30–2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 10:00 · Aim: Steady/Strong steady rounds, rest when needed; Full 6–8 rounds · Feel: cardio · Pace: reach.
No machine: warm-up/cool-down machine → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-11-09', $n$Machine-only intervals (no running on squat day by design), so no outside version.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Gentle: goblet box squat at RPE 6–7 (3–4 reps left), one easy weight, fewer reps fine if the last ones slow down. Pain: pain-free range, tell the coach. Warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Loads: e1RM × 0.75, round to 5 lb (lookup table in the coach book). Ramp: empty bar × 10, 40% × 5, 50% × 3, 60% × 2, then working sets; rest 2:30. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 12:00 (fixed) · Aim each round under 1:30 (Gentle), under 1:10 (Steady/Strong/Full) · Feel gas · Pace reach. Shoulder: single-arm landmine press instead of push press.
No machine: warm-up/cool-down bike → jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Machine-only intervals (no running on squat day by design), so no outside version.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach. Warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Loads: e1RM × 0.75, round to 5 lb (lookup table in the coach book). Ramp: empty bar × 10, 40% × 5, 50% × 3, 60% × 2, then working sets; rest 2:30. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 12:00 (fixed) · Aim each round under 1:10 · Feel gas · Pace reach. Shoulder: single-arm landmine press instead of push press.
No machine: warm-up/cool-down bike → jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-11-11', $n$Remembrance Day (PEI statutory holiday): run this class on holiday hours. No running in this piece, so no outside version.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Gentle: one light kettlebell at RPE 6–7 (3–4 reps left), one easy weight, fewer reps fine if the last ones slow down. Pain: pain-free range, tell the coach. Warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Loads: e1RM × 0.75, round to 5 lb (lookup table in the coach book). Ramp: 40% × 5, 50% × 3, 60% × 2; reset every rep, no bouncing; rest 2:30. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 25:00 (fixed) · Aim row metres within 50 m across the 3 row blocks · Feel cardio · Pace sustain. Gentle rows steady (6/10, can say a sentence); others at threshold (7/10, breathing hard but controlled). Knees: step-ups instead of lunges. No machine: each row block becomes 5:00 of the listed bodyweight pair; score total reps (Gentle: total step-ups).
No machine: warm-up/cool-down row → jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Remembrance Day (PEI statutory holiday): run this class on holiday hours. No running in this piece, so no outside version.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach. Warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Loads: e1RM × 0.75, round to 5 lb (lookup table in the coach book). Ramp: 40% × 5, 50% × 3, 60% × 2; reset every rep, no bouncing; rest 2:30. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 25:00 (fixed) · Aim row metres within 50 m across the 3 row blocks · Feel cardio · Pace sustain. Row at threshold (7/10, breathing hard but controlled). Knees: step-ups instead of lunges. No machine: each row block becomes 5:00 of the listed bodyweight pair; score total reps.
No machine: warm-up/cool-down row → jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-11-12', $n$If there aren't enough rowers and bikes, run the class in two waves: wave 1 does the intervals while wave 2 does the accessory strength, then swap at about minute 31; or send the overflow to the 'No machine free' bodyweight rounds. The intervals have no outside version on purpose: Thursday is machine-only so weekly running volume stays as planned.
Scaling: Masters or injury: today is the best day for extra mobility or rehab work. Warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Conditioning targets: Effort RPE Gentle 3–4, Steady 4, Strong 4–5, Full 5; Zone 2 (full sentences the whole time). Cap 20:00 (fixed) · Aim same pace every round: row split 0:15–0:25 per 500 m slower than 1 km test split; bike same calories each round (±1); Gentle: same easy pace, could keep going, slow pedalling fine · Feel cardio (easy) · Pace sustain. No machine: bodyweight rounds repeat until the work time ends.
No machine: warm-up/cool-down row → jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$If there aren't enough rowers and bikes, run the class in two waves: wave 1 does the intervals while wave 2 does the accessory strength, then swap at about minute 31; or send the overflow to the 'No machine free' bodyweight rounds. The intervals have no outside version on purpose: Thursday is machine-only so weekly running volume stays as planned.
Scaling: Masters or injury: today is the best day for extra mobility or rehab work. Warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Conditioning targets: Effort RPE Steady 4, Strong 4–5, Full 5; Zone 2 (full sentences the whole time). Cap 20:00 (fixed) · Aim same pace every round: row split 0:15–0:25 per 500 m slower than 1 km test split; bike same calories each round (±1) · Feel cardio (easy) · Pace sustain. No machine: bodyweight rounds repeat until the work time ends.
No machine: warm-up/cool-down row → jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-11-13', $n$Full is the Rx standard for Cindy so scores stay comparable with the published benchmark; members record their level. No running in this piece, so no outside version.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Gentle press: light dumbbells at RPE 6–7 (3–4 reps left), one easy weight, fewer reps fine if the last ones slow down. Pain: pain-free range, tell the coach. Warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Clean: Steady/Strong/Full build to RPE 7 (Steady: RPE 6 is plenty, every rep fast and crisp). Gentle: RPE 5–6, smooth reps only.
Loads: e1RM × 0.75, round to 5 lb (lookup table in the coach book). Build to the working weight in 2–3 lighter sets; rest 1:30–2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Cindy targets: Cap 20:00 · Aim Gentle 8–12, Steady 10–14, Strong 12–16, Full 15–20 rounds · Feel cardio · Pace sustain. Keep pull-up sets unbroken: scale before breaking into singles.
No machine: warm-up row/cool-down bike → jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Full is the Rx standard for Cindy so scores stay comparable with the published benchmark; members record their level. No running in this piece, so no outside version.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach. Warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Clean: Steady/Strong/Full build to RPE 7 (Steady: RPE 6 is plenty, every rep fast and crisp).
Loads: e1RM × 0.75, round to 5 lb (lookup table in the coach book). Build to the working weight in 2–3 lighter sets; rest 1:30–2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Cindy targets: Cap 20:00 · Aim Steady 10–14, Strong 12–16, Full 15–20 rounds · Feel cardio · Pace sustain. Keep pull-up sets unbroken: scale before breaking into singles.
No machine: warm-up row/cool-down bike → jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-11-16', $n$Machine-only intervals (no running on squat day by design), so no outside version.
Warm-up: general 5 min, specific 6 min (ends with ramp sets). Easier warm-up: step instead of jump, walk instead of jog, comfortable range.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets with empty bar or light plates at RPE 7. Gentle: RPE 6–7 (3–4 reps left), one easy weight every set, fewer reps fine if they slow. Pain: pain-free range, tell the coach.
Loads: e1RM × 0.8, round to 5 lb (lookup table in the coach book). Ramp: bar × 10, 40% × 5, 50% × 3, 60% × 2. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; all sets RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 12:00 (fixed) · Aim each round under 2:00 (Gentle), under 1:40 (Steady/Strong/Full) · Feel gas · Pace reach.
Sore knees after squats: wall balls to a box target.
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Machine-only intervals (no running on squat day by design), so no outside version.
Warm-up: general 5 min, specific 6 min (ends with ramp sets). Easier warm-up: step instead of jump, walk instead of jog, comfortable range.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach.
Loads: e1RM × 0.8, round to 5 lb (lookup table in the coach book). Ramp: bar × 10, 40% × 5, 50% × 3, 60% × 2. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; all sets RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 12:00 (fixed) · Aim each round under 1:40 · Feel gas · Pace reach.
Sore knees after squats: wall balls to a box target.
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-11-17', $n$Warm-up: general 5 min, specific 6 min. Easier warm-up: step instead of jump, walk instead of jog, comfortable range.
Conditioning targets: RPE 6 all levels · Cap 28:00 (fixed) · Aim row splits within 5 s (outside: run splits within 10 s) · Feel cardio · Pace sustain.
No machine (Gentle): 1:00 step-jacks or marching per 250 m row, 0:30 per bike.$n$,
   $n$Warm-up: general 5 min, specific 6 min. Easier warm-up: step instead of jump, walk instead of jog, comfortable range.
Conditioning targets: RPE 6 all levels · Cap 28:00 (fixed) · Aim row splits within 5 s (outside: run splits within 10 s) · Feel cardio · Pace sustain.$n$),
  ('2026-11-18', $n$Stagger the start: give each member a different starting station and have them go in order from there, so only 1–2 people use the sled at a time. Use the sled substitute (plate push or heavy DB walking lunges) when the sled is busy, and the 'No machine free' swap when rowers or bikes run out.
Stations in order: 1 row, 2 sled, 3 wall balls, 4 carry, 5 step-ups/lunges. Each member starts at their assigned station. Lunges/step-ups are total reps; carry = farmers carry. Quality over speed.
No free sled: Gentle 20 m light plate push on turf or 20 bodyweight walking lunges; others 20 m heavy plate push or 20 heavy DB walking lunges.
Warm-up: general 5 min, specific 6 min (ends with ramp sets). Easier warm-up: step instead of jump, walk instead of jog, comfortable range.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets with empty bar or light plates at RPE 7. Gentle: RPE 6–7 (3–4 reps left), one easy weight every set, fewer reps fine if they slow. Pain: pain-free range, tell the coach.
Loads: e1RM × 0.8, round to 5 lb. Ramp: 40% × 5, 50% × 3, 60% × 2; reset every rep, no bouncing. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; all sets RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: RPE 6 (Gentle), RPE 7 (others), bike at threshold for Steady+ · Cap 24:00 · Aim: Gentle/Steady finish under the cap; Strong same bike pace every round; Full 16:00–20:00, same bike pace · Feel cardio · Pace sustain.
Outside aims: Gentle walking between stations is fine; Steady every run at the same easy-hard pace; Strong every 200 m at the same pace; Full every 200 m at threshold (1 km test pace + 0:40–0:50 per km).
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Stagger the start: give each member a different starting station and have them go in order from there, so only 1–2 people use the sled at a time. Use the sled substitute (plate push or heavy DB walking lunges) when the sled is busy, and the 'No machine free' swap when rowers or bikes run out.
Stations in order: 1 row, 2 sled, 3 wall balls, 4 carry, 5 step-ups/lunges. Each member starts at their assigned station. Lunges/step-ups are total reps; carry = farmers carry. Quality over speed.
No free sled: 20 m heavy plate push on turf or 20 heavy DB walking lunges.
Warm-up: general 5 min, specific 6 min (ends with ramp sets). Easier warm-up: step instead of jump, walk instead of jog, comfortable range.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach.
Loads: e1RM × 0.8, round to 5 lb. Ramp: 40% × 5, 50% × 3, 60% × 2; reset every rep, no bouncing. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; all sets RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: RPE 7, bike at threshold · Cap 24:00 · Aim: Steady finish under the cap; Strong same bike pace every round; Full 16:00–20:00, same bike pace · Feel cardio · Pace sustain.
Outside aims: Steady every run at the same easy-hard pace; Strong every 200 m at the same pace; Full every 200 m at threshold (1 km test pace + 0:40–0:50 per km).
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-11-19', $n$If there aren't enough rowers and bikes, run the class in two waves: wave 1 does the intervals while wave 2 does the accessory strength, then swap at about minute 31; or send the overflow to the 'No machine free' bodyweight rounds. The intervals have no outside version on purpose: Thursday is machine-only so weekly running volume stays as planned.
Warm-up: general 4 min, specific 3 min. Easier warm-up: step instead of jump, walk instead of jog, comfortable range.
Intervals: RPE 3–4 (Gentle), 4 (Steady), 4–5 (Strong), 5 (Full). Zone 2: if they can only say a few words, slow down. Cap 19:00 (fixed). Aim: Gentle same easy pace, could keep going; others row split 0:15–0:25 per 500 m slower than their 1 km test split, bike same calories each round (±1). Feel cardio (easy) · Pace sustain.
Masters or injury: best day for extra mobility or rehab work.
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$If there aren't enough rowers and bikes, run the class in two waves: wave 1 does the intervals while wave 2 does the accessory strength, then swap at about minute 31; or send the overflow to the 'No machine free' bodyweight rounds. The intervals have no outside version on purpose: Thursday is machine-only so weekly running volume stays as planned.
Warm-up: general 4 min, specific 3 min. Easier warm-up: step instead of jump, walk instead of jog, comfortable range.
Intervals: RPE 4 (Steady), 4–5 (Strong), 5 (Full). Zone 2: if they can only say a few words, slow down. Cap 19:00 (fixed). Aim: row split 0:15–0:25 per 500 m slower than their 1 km test split, bike same calories each round (±1). Feel cardio (easy) · Pace sustain.
Masters or injury: best day for extra mobility or rehab work.
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-11-20', $n$No running in this piece, so no outside version.
Warm-up: general 5 min, specific 7 min. Easier warm-up: step instead of jump, walk instead of jog, comfortable range.
Power clean: Strong/Full build to RPE 8 by feel. Steady: stay light, RPE 6 is plenty; hang start OK. Gentle: RPE 5–6, same Every 2:00 × 6 clock.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets with empty bar or light plates at RPE 7. Gentle: RPE 6–7 (3–4 reps left), one easy weight every set, fewer reps fine if they slow. Pain: pain-free range, tell the coach. Gentle press: light DBs, seated.
Loads: e1RM × 0.775, round to 5 lb. Build to working weight in 2–3 lighter sets. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; all sets RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 12:00 · Aim: finish under the cap (Gentle: rest when needed); Full 7:00–9:00 · Feel gas · Pace reach.
Shoulder: dumbbell hang clean instead of the snatch.
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$No running in this piece, so no outside version.
Warm-up: general 5 min, specific 7 min. Easier warm-up: step instead of jump, walk instead of jog, comfortable range.
Power clean: Strong/Full build to RPE 8 by feel. Steady: stay light, RPE 6 is plenty; hang start OK.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach.
Loads: e1RM × 0.775, round to 5 lb. Build to working weight in 2–3 lighter sets. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; all sets RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 12:00 · Aim: finish under the cap (rest when needed); Full 7:00–9:00 · Feel gas · Pace reach.
Shoulder: dumbbell hang clean instead of the snatch.
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-11-23', $n$Machine-only intervals (no running on squat day by design), so no outside version.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Gentle: one easy weight every set at RPE 6–7 (3–4 reps left); fewer reps is fine. Pain: pain-free range, tell the coach. Warm-up for Gentle: step instead of jumping, walk instead of jogging.
Loads: e1RM × 0.8 (ramp) and × 0.85 (top sets), round to 5 lb. Ramp: empty bar × 10, 40% × 5, 50% × 3, 60% × 2, then working sets; rest 2:30–3:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 12:00 (fixed) · Effort RPE Gentle 6, Steady 7, Strong 8, Full 9 · Aim steady effort every round; Full 100+ total · Feel gas · Pace reach. Knees or back: step-back burpees.
No machine (conditioning): Gentle 1:00 fast marching or step-jacks; Steady 1:00 max jumping jacks; Strong/Full 1:00 max single-unders (score the reps).
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Machine-only intervals (no running on squat day by design), so no outside version.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach. Easier warm-up: step instead of jumping, walk instead of jogging.
Loads: e1RM × 0.8 (ramp) and × 0.85 (top sets), round to 5 lb. Ramp: empty bar × 10, 40% × 5, 50% × 3, 60% × 2, then working sets; rest 2:30–3:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 12:00 (fixed) · Effort RPE Steady 7, Strong 8, Full 9 · Aim steady effort every round; Full 100+ total · Feel gas · Pace reach. Knees or back: step-back burpees.
No machine (conditioning): Steady 1:00 max jumping jacks; Strong/Full 1:00 max single-unders (score the reps).
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-11-24', $n$Warm-up for Gentle: step instead of jumping, walk instead of jogging, stay in a comfortable range.
Skill: toes-to-bar level 5, EMOM 8. No machine on odd minutes: Gentle 30 s marching or step-jacks; Steady 30 s easy jumping jacks; Strong/Full 30 s easy single-unders or jumping jacks.
Conditioning targets: Cap 30:00 · RPE 6, about 28:00 · Aim even pace (outside: even run splits), can talk in short sentences · Feel cardio · Pace sustain.
No machine (indoor): Gentle 250 m row → 1:00, 6/8 cal row → 0:30, 5/6 cal bike → 0:20 step-jacks or marching. Steady 400 m row → 100 jumping jacks, cal row → 55, bike → 45. Strong/Full 500 m row → 250 single-unders, cal row → 110, bike → 90.
No machine (outside): Gentle cal row → 150 m walk/jog, bike → 100 m. Others: cal row → 250 m run, bike → 200 m run.$n$,
   $n$Easier warm-up: step instead of jumping, walk instead of jogging, stay in a comfortable range.
Skill: toes-to-bar level 5, EMOM 8. No machine on odd minutes: Steady 30 s easy jumping jacks; Strong/Full 30 s easy single-unders or jumping jacks.
Conditioning targets: Cap 30:00 · RPE 6, about 28:00 · Aim even pace (outside: even run splits), can talk in short sentences · Feel cardio · Pace sustain.
No machine (indoor): Steady 400 m row → 100 jumping jacks, cal row → 55, bike → 45. Strong/Full 500 m row → 250 single-unders, cal row → 110, bike → 90.
No machine (outside): cal row → 250 m run, bike → 200 m run.$n$),
  ('2026-11-25', $n$Stagger the start: give each member a different starting round (R1–R4) so only 1–2 people share the sled. Swap in the sled substitutes when it's busy.
No free sled: plate push on turf; pull → 2 × 10 heavy ring rows (Gentle: light plate push, 2 × 8 ring rows on a high bar).
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Gentle: one easy weight every set at RPE 6–7 (3–4 reps left); fewer reps is fine. Pain: pain-free range, tell the coach. Warm-up for Gentle: step instead of jumping, walk instead of jogging.
Loads: e1RM × 0.8 (ramp) and × 0.85 (top sets), round to 5 lb. Ramp: 40% × 5, 50% × 3, 60% × 2; reset every rep, no bouncing; rest 2:30–3:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 24:00 · RPE Gentle 6, others 7 · Aim finish under the cap; Strong/Full last bike (or run) as fast as the first; Full 16:00–21:00 · Feel cardio / muscle · Pace sustain.
No machine (conditioning): Gentle 150 m row → 0:40, 5/6 cal bike → 0:20 step-jacks or marching. Steady 200 m row → 50 jumping jacks, bike → 30. Strong/Full 250 m row → 120 single-unders, bike → 70. Outside: row → 100 m walk/jog (Gentle), 150 m run (Steady), 200 m run (Strong/Full).
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Stagger the start: give each member a different starting round (R1–R4) so only 1–2 people share the sled. Swap in the sled substitutes when it's busy.
No free sled: plate push on turf; pull → 2 × 10 heavy ring rows.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach. Easier warm-up: step instead of jumping, walk instead of jogging.
Loads: e1RM × 0.8 (ramp) and × 0.85 (top sets), round to 5 lb. Ramp: 40% × 5, 50% × 3, 60% × 2; reset every rep, no bouncing; rest 2:30–3:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 24:00 · RPE 7 · Aim finish under the cap; Strong/Full last bike (or run) as fast as the first; Full 16:00–21:00 · Feel cardio / muscle · Pace sustain.
No machine (conditioning): Steady 200 m row → 50 jumping jacks, bike → 30. Strong/Full 250 m row → 120 single-unders, bike → 70. Outside: row → 150 m run (Steady), 200 m run (Strong/Full).
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-11-26', $n$If there aren't enough rowers and bikes, run the class in two waves: wave 1 does the intervals while wave 2 does the accessory strength, then swap at about minute 31; or send the overflow to the 'No machine free' bodyweight rounds. The intervals have no outside version on purpose: Thursday is machine-only so weekly running volume stays as planned.
Warm-up for Gentle: step instead of jumping, walk instead of jogging, stay in a comfortable range.
Intervals: Cap 19:00 (fixed) · Effort RPE Gentle 3–4, Steady 4, Strong 4–5, Full 5 · Zone 2 · Aim same pace every round: row split 0:15–0:25 per 500 m slower than 1 km test split; bike same calories each round (±1); Gentle: you could keep going · Feel cardio (easy) · Pace sustain.
Masters or injury: today is the best day for extra mobility or rehab work.
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$If there aren't enough rowers and bikes, run the class in two waves: wave 1 does the intervals while wave 2 does the accessory strength, then swap at about minute 31; or send the overflow to the 'No machine free' bodyweight rounds. The intervals have no outside version on purpose: Thursday is machine-only so weekly running volume stays as planned.
Easier warm-up: step instead of jumping, walk instead of jogging, stay in a comfortable range.
Intervals: Cap 19:00 (fixed) · Effort RPE Steady 4, Strong 4–5, Full 5 · Zone 2 · Aim same pace every round, could keep going: row split 0:15–0:25 per 500 m slower than 1 km test split; bike same calories each round (±1) · Feel cardio (easy) · Pace sustain.
Masters or injury: today is the best day for extra mobility or rehab work.
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-11-27', $n$Power clean: Every 2:00 × 5, 1 power clean + 2 front squats, build to RPE 8 (Steady: RPE 6 is plenty, empty bar or light plates, hang start OK). Gentle: RPE 5–6, dumbbell hang clean + 1–2 goblet squats. Build by feel, no percentages today.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Gentle: one easy weight every set at RPE 6–7 (3–4 reps left); fewer reps is fine. Pain: pain-free range, tell the coach. Warm-up for Gentle: step instead of jumping, walk instead of jogging.
Loads: e1RM × 0.8 (ramp) and × 0.825 (top sets), round to 5 lb. Build to the working weight in 2–3 lighter sets; rest 1:30–2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 14:00 · Aim finish under the cap; Full 9:00–11:00 · Feel cardio · Pace reach.
No machine (conditioning): Gentle 250 m row → 1:00 step-jacks or marching; Steady 400 m row → 100 jumping jacks; Strong/Full 500 m row → 250 single-unders.
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Power clean: Every 2:00 × 5, 1 power clean + 2 front squats, build to RPE 8 (Steady: RPE 6 is plenty, empty bar or light plates, hang start OK). Build by feel, no percentages today.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach. Easier warm-up: step instead of jumping, walk instead of jogging.
Loads: e1RM × 0.8 (ramp) and × 0.825 (top sets), round to 5 lb. Build to the working weight in 2–3 lighter sets; rest 1:30–2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 14:00 · Aim finish under the cap; Full 9:00–11:00 · Feel cardio · Pace reach.
No machine (conditioning): Steady 400 m row → 100 jumping jacks; Strong/Full 500 m row → 250 single-unders.
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-11-30', $n$Deload week: about 45% less volume. Machine-only intervals (no running on squat day by design), so no outside version.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach. Gentle: goblet box squat (light KB or DB at the chest, box at knee height, stand tall) at RPE 6–7; fewer reps fine if they slow. Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Loads: e1RM × 0.75 (ramp sets) and × 0.85 (top set), round to 5 lb (lookup table in the coach book). Ramp: empty bar × 10, 40% × 5, 50% × 3, 60% × 2, then working sets; rest 2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 12:00 (fixed) · Sprint effort: Gentle RPE 7, Steady RPE 8, Strong RPE 9, Full max; Masters RPE 8 · Aim: steady metres every sprint; Full 230–280 m per sprint · Feel gas · Pace reach. Score = total metres (no-machine score = reps).
No machine: warm-up/cool-down machine → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Deload week: about 45% less volume. Machine-only intervals (no running on squat day by design), so no outside version.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach. Easier warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Loads: e1RM × 0.75 (ramp sets) and × 0.85 (top set), round to 5 lb (lookup table in the coach book). Ramp: empty bar × 10, 40% × 5, 50% × 3, 60% × 2, then working sets; rest 2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 12:00 (fixed) · Sprint effort: Steady RPE 8, Strong RPE 9, Full max; Masters RPE 8 · Aim: steady metres every sprint; Full 230–280 m per sprint · Feel gas · Pace reach. Score = total metres (no-machine score = reps).
No machine: warm-up/cool-down machine → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-12-01', $n$Scaling: Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Conditioning targets: 22:00 easy, RPE 5 · Cap 22:00 · Aim: no score, keep it conversational · Feel cardio (easy) · Pace sustain.
No machine (conditioning): Gentle 300 m row → 1:15 step-jacks or marching, 12/15 cal bike → 0:55; Steady 400 m row → 100 jumping jacks, 16/20 cal bike → 70; Strong 400 m row → 200 single-unders, 24/30 cal bike → 220; Full 400 m row → 200 single-unders, 32/40 cal bike → 290. Outside: Gentle 300 m row → 250 m walk/jog; others 400 m row → 300 m run.
No machine: warm-up/cool-down machine → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Scaling: easier warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Conditioning targets: 22:00 easy, RPE 5 · Cap 22:00 · Aim: no score, keep it conversational · Feel cardio (easy) · Pace sustain.
No machine (conditioning): Steady 400 m row → 100 jumping jacks, 16/20 cal bike → 70; Strong 400 m row → 200 single-unders, 24/30 cal bike → 220; Full 400 m row → 200 single-unders, 32/40 cal bike → 290. Outside: 400 m row → 300 m run.
No machine: warm-up/cool-down machine → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-12-02', $n$Deload week. No running in this piece, so no outside version.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach. Gentle: KB deadlift (one light KB between the feet, on a low step if the floor is too far) at RPE 6–7; fewer reps fine if they slow. Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Loads: e1RM × 0.75 (ramp sets) and × 0.85 (top single), round to 5 lb (lookup table in the coach book). Ramp: 40% × 5, 50% × 3, 60% × 2; reset every rep, no bouncing; rest 2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: threshold, about 7/10 (Gentle RPE 5–6, others RPE 6–7) · Cap 18:00 · Aim: Gentle steady, blocks don't have to match; Steady block 2 = block 1; Strong/Full block 2 = block 1 (±1 round) · Feel cardio · Pace sustain.
No machine (conditioning): Gentle 5/6 cal row → 0:20 step-jacks or marching; Steady 6/8 cal → 30 jumping jacks; Strong/Full 9/12 cal → 80 single-unders.
No machine: warm-up/cool-down machine → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Deload week. No running in this piece, so no outside version.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach. Easier warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Loads: e1RM × 0.75 (ramp sets) and × 0.85 (top single), round to 5 lb (lookup table in the coach book). Ramp: 40% × 5, 50% × 3, 60% × 2; reset every rep, no bouncing; rest 2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: threshold, about 7/10 (RPE 6–7) · Cap 18:00 · Aim: Steady block 2 = block 1; Strong/Full block 2 = block 1 (±1 round) · Feel cardio · Pace sustain.
No machine (conditioning): Steady 6/8 cal → 30 jumping jacks; Strong/Full 9/12 cal → 80 single-unders.
No machine: warm-up/cool-down machine → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-12-03', $n$If there aren't enough rowers and bikes, run the class in two waves: wave 1 does the intervals while wave 2 does the accessory strength, then swap at about minute 31; or send the overflow to the 'No machine free' bodyweight rounds. The intervals have no outside version on purpose: Thursday is machine-only so weekly running volume stays as planned.
Scaling: Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range. Masters or injury: today is the best day for extra mobility or rehab work.
Conditioning targets: Effort Gentle RPE 3–4, Steady RPE 4, Strong RPE 4–5, Full RPE 5 (zone 2: full sentences; only a few words → slow down) · Cap 14:00 (fixed) · Aim: Gentle same easy pace every round, could keep going; Steady/Strong/Full same pace every round: row split 0:15–0:25 per 500 m slower than 1 km test split, bike same calories each round (±1) · Feel cardio (easy) · Pace sustain.
No machine: warm-up/cool-down machine → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$If there aren't enough rowers and bikes, run the class in two waves: wave 1 does the intervals while wave 2 does the accessory strength, then swap at about minute 31; or send the overflow to the 'No machine free' bodyweight rounds. The intervals have no outside version on purpose: Thursday is machine-only so weekly running volume stays as planned.
Scaling: easier warm-up: step instead of jumping, walk instead of jogging, comfortable range. Masters or injury: today is the best day for extra mobility or rehab work.
Conditioning targets: Effort Steady RPE 4, Strong RPE 4–5, Full RPE 5 (zone 2: full sentences; only a few words → slow down) · Cap 14:00 (fixed) · Aim: same pace every round, could keep going: row split 0:15–0:25 per 500 m slower than 1 km test split, bike same calories each round (±1) · Feel cardio (easy) · Pace sustain.
No machine: warm-up/cool-down machine → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-12-04', $n$Deload week. No running in this piece, so no outside version.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach. Gentle clean: DB/KB hang clean + 1–2 goblet squats, half the reps fine, RPE 5–6. Steady clean: empty bar or light plates, RPE 6. Gentle press: seated DB press, back against a bench, RPE 6–7; fewer reps fine if they slow. Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Loads: e1RM × 0.75 (ramp sets) and × 0.825 (top set), round to 5 lb (lookup table in the coach book). Ramp: build to the working weight in 2–3 lighter sets; rest 1:30–2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 10:00 · Aim: finish under the cap; Full 5:00–7:00 · Feel gas · Pace reach.
No machine (conditioning): Gentle 5/6 cal bike → 0:20 step-jacks or marching; Steady 8/10 cal → 35 jumping jacks; Strong/Full 12/15 cal → 110 single-unders.
No machine: cool-down bike → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Deload week. No running in this piece, so no outside version.
Scaling: Masters (40+) never above 85%, RPE 8 is the ceiling. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Pain: pain-free range, tell the coach. Steady clean: empty bar or light plates, RPE 6. Easier warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Loads: e1RM × 0.75 (ramp sets) and × 0.825 (top set), round to 5 lb (lookup table in the coach book). Ramp: build to the working weight in 2–3 lighter sets; rest 1:30–2:00. RPE 8 cap: past RPE 8 or form breaks, drop 5–10%; every set RPE 6 or easier, add 2.5–5% next week (max +5%).
Conditioning targets: Cap 10:00 · Aim: finish under the cap; Full 5:00–7:00 · Feel gas · Pace reach.
No machine (conditioning): Steady 8/10 cal → 35 jumping jacks; Strong/Full 12/15 cal → 110 single-unders.
No machine: cool-down bike → easy jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-12-07', $n$Two coaches on test days if possible. Watch depth and back position; you call the set. Steady, Strong and Full test the barbell back squat (smaller jumps at Steady); only Gentle tests the goblet squat (bell at chest, sit to a box for a depth guide if needed). Machine-only intervals: Monday has no running on purpose (heavy-leg day), so no outside version.
Test: 3RM in 18 min. Barbell ladder: bar × 8, ~50% × 5, ~65% × 3, ~75% × 3, then 2–4 attempts at 3. Gentle: light × 8, 3 sets of 3, then 2–4 attempts, stop at RPE 8. No RPE 9–10 grinders. Use Week 1 result as the second-to-last attempt. Record 3RM in lb, level, change from Week 1. Week 1 3RM × 1.06 = e1RM for every squat % this block.
Scaling: Newer lifters / first 4 weeks after on-ramp: empty or training bar, no max attempt; stop at first RPE 8 set and record that. Masters (40+): RPE 8 max on the hard pieces. Knee or back pain: air bike only. Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Conditioning targets: Cap 12:00 (fixed) · Aim: beat Week 1 average calories per hard piece · Feel: gas · Pace: reach. Hard = RPE 6 / 7 / 8 / 9 (Gentle to Full). No-machine score = reps instead of calories.
No machine: warm-up/cool-down machine → jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Two coaches on test days if possible. Watch depth and back position; you call the set. Every level tests the barbell back squat (smaller jumps at Steady). Machine-only intervals: Monday has no running on purpose (heavy-leg day), so no outside version.
Test: 3RM in 18 min. Barbell ladder: bar × 8, ~50% × 5, ~65% × 3, ~75% × 3, then 2–4 attempts at 3. Stop at RPE 8, no RPE 9–10 grinders. Use Week 1 result as the second-to-last attempt. Record 3RM in lb, level, change from Week 1. Week 1 3RM × 1.06 = e1RM for every squat % this block.
Scaling: Newer lifters / first 4 weeks after on-ramp: empty or training bar, no max attempt; stop at first RPE 8 set and record that. Masters (40+): RPE 8 max on the hard pieces. Knee or back pain: air bike only. Easier warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Conditioning targets: Cap 12:00 (fixed) · Aim: beat Week 1 average calories per hard piece · Feel: gas · Pace: reach. Hard = RPE 7 / 8 / 9 (Steady to Full). No-machine score = reps instead of calories.
No machine: warm-up/cool-down machine → jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-12-08', $n$Start the 1 km in waves of 4–6 and read times out as they finish; if rowers run out inside, the next wave rows when a machine frees up (don't swap the test). Members choose run or row once and repeat the same option in Week 8. The easy flush after the test needs no machines inside (jump ropes, floor space), so finished waves start it while the next wave rows. Record each member's Week 1 vs Week 8 time on their scorecard.
Test targets: Cap 15:00 · Aim: beat Week 1 time on the same machine or route · Feel: cardio · Pace: reach. Gentle run option: jog 1:00 / walk 1:00 or brisk walk, same plan as Week 1. No rower free: next free rower, or the 1 km run outside if safe; a bodyweight swap can't be compared with Week 1.
Flush targets: Cap 12:00 · RPE 4 Gentle, RPE 5 others · Aim: smooth and easy · Feel: cardio (easy) · Pace: sustain.
Scaling: Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range.
No machine: warm-up/cool-down machine → jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Start the 1 km in waves of 4–6 and read times out as they finish; if rowers run out inside, the next wave rows when a machine frees up (don't swap the test). Members choose run or row once and repeat the same option in Week 8. The easy flush after the test needs no machines inside (jump ropes, floor space), so finished waves start it while the next wave rows. Record each member's Week 1 vs Week 8 time on their scorecard.
Test targets: Cap 15:00 · Aim: beat Week 1 time on the same machine or route · Feel: cardio · Pace: reach. Run option for anyone who jogged and walked in Week 1: same plan as Week 1. No rower free: next free rower, or the 1 km run outside if safe; a bodyweight swap can't be compared with Week 1.
Flush targets: Cap 12:00 · RPE 5 · Aim: smooth and easy · Feel: cardio (easy) · Pace: sustain.
Scaling: easier warm-up: step instead of jumping, walk instead of jogging, comfortable range.
No machine: warm-up/cool-down machine → jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-12-09', $n$Coach stops any set where the back rounds. Steady, Strong and Full test the barbell deadlift; only Gentle tests the kettlebell deadlift (bell between the feet, on a low step if the floor is too far). Week 8's outside version uses a 100 m easy jog in each bike minute (600 m) to keep weekly running at the planned level. Stagger starts by 1:00 if bikes are short: half the class starts on Minute 2.
Test: 3RM in 16 min. Barbell ladder: 40% × 5, 55% × 3, 65% × 3, 75% × 3, then 2–4 attempts at 3. Gentle: light × 5, 3 sets of 3, then 2–4 attempts, stop at RPE 8. No touch-and-go. Use Week 1 result as the second-to-last attempt. Record 3RM in lb, level, change from Week 1. Week 1 3RM × 1.06 = e1RM for every deadlift % this block.
Scaling: Newer lifters / first 4 weeks after on-ramp: start light (bar plus small plates on blocks), no max attempt; stop at first RPE 8 set and record that. Low back sore after the test: keep the bike very easy (or walk the jog minutes) and skip the bear crawl (glute bridges only). Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Conditioning targets: not for score · RPE 4–5 Gentle, 5–6 others · Cap 12:00 (fixed) · Aim: smooth and easy, breathing stays calm · Feel: cardio (easy) · Pace: sustain.
No machine: warm-up/cool-down machine → jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Coach stops any set where the back rounds. Every level tests the barbell deadlift. Week 8's outside version uses a 100 m easy jog in each bike minute (600 m) to keep weekly running at the planned level. Stagger starts by 1:00 if bikes are short: half the class starts on Minute 2.
Test: 3RM in 16 min. Barbell ladder: 40% × 5, 55% × 3, 65% × 3, 75% × 3, then 2–4 attempts at 3. Stop at RPE 8. No touch-and-go. Use Week 1 result as the second-to-last attempt. Record 3RM in lb, level, change from Week 1. Week 1 3RM × 1.06 = e1RM for every deadlift % this block.
Scaling: Newer lifters / first 4 weeks after on-ramp: start light (bar plus small plates on blocks), no max attempt; stop at first RPE 8 set and record that. Low back sore after the test: keep the bike very easy (or walk the jog minutes) and skip the bear crawl (glute bridges only). Easier warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Conditioning targets: not for score · RPE 5–6 · Cap 12:00 (fixed) · Aim: smooth and easy, breathing stays calm · Feel: cardio (easy) · Pace: sustain.
No machine: warm-up/cool-down machine → jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-12-10', $n$If there aren't enough rowers and bikes, run the class in two waves: wave 1 does the intervals while wave 2 does the accessory strength, then swap at about minute 31; or send the overflow to the 'No machine free' bodyweight rounds. The intervals have no outside version on purpose: Thursday is machine-only so weekly running volume stays as planned.
Intervals: Zone 2 (Gentle: slow pedalling fine), full sentences the whole time; if only a few words, slow down. RPE 3–4 Gentle, 4 Steady, 4–5 Strong, 5 Full. Cap 14:00 (fixed) · Aim: same easy pace every round; Steady/Strong/Full row split 0:15–0:25 per 500 m slower than their 1 km test split, bike same calories each round (±1) · Feel: cardio (easy) · Pace: sustain.
Scaling: Masters or injury: today is the best day for extra mobility or rehab work. Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range.
No machine: warm-up/cool-down machine → jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$If there aren't enough rowers and bikes, run the class in two waves: wave 1 does the intervals while wave 2 does the accessory strength, then swap at about minute 31; or send the overflow to the 'No machine free' bodyweight rounds. The intervals have no outside version on purpose: Thursday is machine-only so weekly running volume stays as planned.
Intervals: Zone 2 (slow pedalling fine), full sentences the whole time; if only a few words, slow down. RPE 4 Steady, 4–5 Strong, 5 Full. Cap 14:00 (fixed) · Aim: same easy pace every round; row split 0:15–0:25 per 500 m slower than their 1 km test split, bike same calories each round (±1) · Feel: cardio (easy) · Pace: sustain.
Scaling: Masters or injury: today is the best day for extra mobility or rehab work. Easier warm-up: step instead of jumping, walk instead of jogging, comfortable range.
No machine: warm-up/cool-down machine → jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-12-11', $n$Demo the wall ball, farmers carry, sandbag lunge and burpee broad jump standards before the AMRAP (4 min). Start members on different stations if kit is short. Steady, Strong and Full test the barbell strict press; only Gentle tests the seated dumbbell press (back against a bench, record weight per hand). Benchmark: Full is the Rx standard; members record their level. No outside version: no running in this piece.
Test: 5RM in 15 min. Barbell ladder: bar × 10, ~50% × 5, ~65% × 5, then 2–4 attempts at 5. Gentle: light × 10, 2 sets of 5, then 2–4 attempts, stop at RPE 8. No leg drive. Use Week 1 result as the second-to-last attempt. Record 5RM in lb, level, change from Week 1. Week 1 5RM × 1.13 = e1RM for every press % this block.
Scaling: Newer lifters / first 4 weeks after on-ramp: empty or training bar, no max attempt; stop at first RPE 8 set and record that. Shoulder sore after the press: goblet squats instead of wall balls. Knees: step-ups instead of lunges. Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range.
AMRAP targets: steady, RPE 6 · Cap 10:00 · Aim: beat Week 1 rounds · Feel: cardio · Pace: sustain.$n$,
   $n$Demo the wall ball, farmers carry, sandbag lunge and burpee broad jump standards before the AMRAP (4 min). Start members on different stations if kit is short. Every level tests the barbell strict press. Benchmark: Full is the Rx standard; members record their level. No outside version: no running in this piece.
Test: 5RM in 15 min. Barbell ladder: bar × 10, ~50% × 5, ~65% × 5, then 2–4 attempts at 5. Stop at RPE 8. No leg drive. Use Week 1 result as the second-to-last attempt. Record 5RM in lb, level, change from Week 1. Week 1 5RM × 1.13 = e1RM for every press % this block.
Scaling: Newer lifters / first 4 weeks after on-ramp: empty or training bar, no max attempt; stop at first RPE 8 set and record that. Shoulder sore after the press: goblet squats instead of wall balls. Knees: step-ups instead of lunges. Easier warm-up: step instead of jumping, walk instead of jogging, comfortable range.
AMRAP targets: steady, RPE 6 · Cap 10:00 · Aim: beat Week 1 rounds · Feel: cardio · Pace: sustain.$n$),
  ('2026-12-14', $n$Flex week: every session is optional (members pick 3–4); guests and on-ramp members join at Steady (Foundations), or Gentle if they need an easier start. Machine-only intervals (no running on squat day by design), so no outside version.
Scaling: Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Gentle goblet box squat at RPE 5–6.
Strength: optional technique work, stop well short of RPE 8. Not a test. Warm-up ends with ramp sets.
Conditioning targets: AMRAP 20:00 at RPE 6–7. Cap 20:00 (fixed) · Aim: steady rounds, same pace (Gentle: rest when needed; Full: 6–8 rounds) · Feel cardio · Pace sustain. New or visiting: Steady, or Gentle for an easier start; coach demos every movement.
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Flex week: every session is optional (members pick 3–4); guests and on-ramp members join at Steady. Machine-only intervals (no running on squat day by design), so no outside version.
Scaling: easier warm-up: step instead of jumping, walk instead of jogging, comfortable range. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7.
Strength: optional technique work, stop well short of RPE 8. Not a test. Warm-up ends with ramp sets.
Conditioning targets: AMRAP 20:00 at RPE 6–7. Cap 20:00 (fixed) · Aim: steady rounds, same pace (rest when needed; Full: 6–8 rounds) · Feel cardio · Pace sustain. New or visiting: Steady; coach demos every movement.
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-12-15', $n$Flex week: every session is optional (members pick 3–4); guests and on-ramp members join at Steady (Foundations), or Gentle if they need an easier start. Write each retest next to the Week 2 baseline on the scorecard; members retest at the same level as their baseline. The easy flow is air bike only on purpose (no running before Helen and the Mini Challenge; rowers stay free), so no outside version. Short on bikes? Half the class starts with the step-ups and side plank.
Scaling: Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Easy flow targets: RPE Gentle 3–4, Steady 4, Strong 4–5, Full 5 (Zone 2, full sentences). Cap 20:00 · Aim: same easy bike pace every round · Feel cardio (easy) · Pace sustain.
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Flex week: every session is optional (members pick 3–4); guests and on-ramp members join at Steady. Write each retest next to the Week 2 baseline on the scorecard; members retest at the same level as their baseline. The easy flow is air bike only on purpose (no running before Helen and the Mini Challenge; rowers stay free), so no outside version. Short on bikes? Half the class starts with the step-ups and side plank.
Scaling: easier warm-up: step instead of jumping, walk instead of jogging, comfortable range.
Easy flow targets: RPE Steady 4, Strong 4–5, Full 5 (Zone 2, full sentences). Cap 20:00 · Aim: same easy bike pace every round · Feel cardio (easy) · Pace sustain.
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-12-16', $n$Flex week: every session is optional (members pick 3–4); guests and on-ramp members join at Steady (Foundations), or Gentle if they need an easier start. Benchmark: Full is the Rx standard so scores compare with the published version; every member records their level.
Scaling: Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Gentle KB deadlift at RPE 5. Helen lighter option: 2 rounds at RPE 5–6 (Gentle) or Gentle at RPE 6.
Strength: optional technique work, stop well short of RPE 8. Not a test. Warm-up ends with ramp sets.
Helen targets: Cap 15:00 · Aim: Gentle/Steady finish under the cap, Strong 11:00–14:00, Full 9:00–12:00 · Feel cardio · Pace sustain, then reach in round 3.
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Flex week: every session is optional (members pick 3–4); guests and on-ramp members join at Steady. Benchmark: Full is the Rx standard so scores compare with the published version; every member records their level.
Scaling: easier warm-up: step instead of jumping, walk instead of jogging, comfortable range. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Helen lighter option: 2 rounds at RPE 5–6.
Strength: optional technique work, stop well short of RPE 8. Not a test. Warm-up ends with ramp sets.
Helen targets: Cap 15:00 · Aim: Steady finish under the cap, Strong 11:00–14:00, Full 9:00–12:00 · Feel cardio · Pace sustain, then reach in round 3.
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-12-17', $n$Flex week: every session is optional (members pick 3–4); guests and on-ramp members join at Steady (Foundations), or Gentle if they need an easier start. Scorecard review with a coach during the accessory block: about 5 min per small group; help each member write one goal for the next block. If there aren't enough rowers and bikes, run the class in two waves: wave 1 does the intervals while wave 2 does the accessory strength, then swap at about minute 31; or send the overflow to the 'No machine free' bodyweight rounds. The intervals have no outside version on purpose: Thursday is machine-only so weekly running volume stays as planned.
Scaling: Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range. Masters or injury: today is the best day for extra mobility or rehab work.
Interval targets: RPE Gentle 3–4, Steady 4, Strong 4–5, Full 5 (Zone 2: full sentences; if only a few words, slow down). Cap 19:00 (fixed) · Aim: same pace every round; Steady–Full row split 0:15–0:25 per 500 m slower than their 1 km test split, bike same calories each round (±1) · Feel cardio (easy) · Pace sustain.
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Flex week: every session is optional (members pick 3–4); guests and on-ramp members join at Steady. Scorecard review with a coach during the accessory block: about 5 min per small group; help each member write one goal for the next block. If there aren't enough rowers and bikes, run the class in two waves: wave 1 does the intervals while wave 2 does the accessory strength, then swap at about minute 31; or send the overflow to the 'No machine free' bodyweight rounds. The intervals have no outside version on purpose: Thursday is machine-only so weekly running volume stays as planned.
Scaling: easier warm-up: step instead of jumping, walk instead of jogging, comfortable range. Masters or injury: today is the best day for extra mobility or rehab work.
Interval targets: RPE Steady 4, Strong 4–5, Full 5 (Zone 2: full sentences; if only a few words, slow down). Cap 19:00 (fixed) · Aim: same pace every round; row split 0:15–0:25 per 500 m slower than their 1 km test split, bike same calories each round (±1) · Feel cardio (easy) · Pace sustain.
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$),
  ('2026-12-18', $n$Flex week: every session is optional (members pick 3–4); guests and on-ramp members join at Steady (Foundations), or Gentle if they need an easier start. Two coaches if possible. Run heats of 4 (one rower each) starting every 3:00; if rowers run short, members in a heat use the 'No machine free' swap and note it. Members count their own reps; the coach records total time and the run 1 and run 4 splits on the scorecard. Benchmark: Full is the Rx standard so scores compare with the published version; every member records their level.
Scaling: Gentle warm-up: step instead of jumping, walk instead of jogging, comfortable range. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Gentle DB press at RPE 5–6. Lighter option: Gentle RPE 5–6 all the way; others drop to Gentle at RPE 6.
Strength: optional technique work, stop well short of RPE 8. Not a test.
Challenge targets: Cap 26:00 · Aim: Gentle/Steady finish under the cap, Strong 17:00–23:00, Full 15:00–20:00 · Feel cardio · Pace sustain (even run splits).
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$,
   $n$Flex week: every session is optional (members pick 3–4); guests and on-ramp members join at Steady. Two coaches if possible. Run heats of 4 (one rower each) starting every 3:00; if rowers run short, members in a heat use the 'No machine free' swap and note it. Members count their own reps; the coach records total time and the run 1 and run 4 splits on the scorecard. Benchmark: Full is the Rx standard so scores compare with the published version; every member records their level.
Scaling: easier warm-up: step instead of jumping, walk instead of jogging, comfortable range. Newer lifters / first 4 weeks: same sets and reps with empty bar or light plates at RPE 7. Lighter option: drop a level and stay at RPE 6.
Strength: optional technique work, stop well short of RPE 8. Not a test.
Challenge targets: Cap 26:00 · Aim: Steady finish under the cap, Strong 17:00–23:00, Full 15:00–20:00 · Feel cardio · Pace sustain (even run splits).
No machine (warm-up/cool-down): jumping jacks, marching or jump rope, ~1:00 per 250 m or 5 cal.$n$)
) as v(d, old, new)
where n.class_date = v.d::date and n.body = v.old;

do $$
declare d date;
begin
  for d in select class_date from public.workout_coach_notes where body ilike '%gentle%' order by class_date loop
    raise notice 'coach note on % still mentions Gentle (edited since it was seeded); fix it by hand', d;
  end loop;
end $$;

-- The saved coach brief, if it still has the stock Gentle lines.
update public.program set coach_brief = replace(replace(coach_brief,
    E'- Safe and sensible for older adults: no high-skill Olympic lifting for Gentle or Steady,',
    E'- Safe and sensible for older adults: no high-skill Olympic lifting for Steady,'),
    E'- Gentle is genuinely gentle: low impact, lighter tools, step-ups not box jumps, wall or incline push-ups, walking not running.\n',
    '')
  where coach_brief like '%Gentle%';

commit;

-- Afterwards, these should all be 0:
--   select count(*) from public.workouts w, jsonb_array_elements(w.parts) p where jsonb_array_length(p->'versions') <> 3;
--   select count(*) from public.workouts where parts::text ilike '%gentle%';
--   select count(*) from public.cycles where days::text like '%"gentle"%';
--   select count(*) from public.program where coach_brief like '%Gentle%';
--   select count(*) from public.workout_coach_notes where body ilike '%gentle%';
