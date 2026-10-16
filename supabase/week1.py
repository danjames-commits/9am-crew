"""Writes supabase/week1.sql: the crew's first week (Oct 19-23, 2026).

Week 1 is a starting-point week. Nobody has logged lifts yet, so each lift
day builds to a solid set of 5 (one or two left in the tank), not a max.
Those logs give the app everyone's numbers for the percentage weeks after.
Every conditioning piece has an inside and an outside version. No partner work.
"""
import json
from pathlib import Path


def same(text):
    return [text] * 4


GENTLE = {"Strict press": "Dumbbell press", "Deadlift": "Kettlebell deadlift", "Back squat": "Goblet squat"}


def part(kind, label, title, versions, minutes=None, lift=None, outdoor=None):
    p = {"kind": kind, "label": label, "title": title, "versions": versions}
    if minutes:
        p["minutes"] = minutes
    if lift:
        p["lift"] = {"movement": lift, "pct": [None, None, None, None], "reps": 5, "gentleMovement": GENTLE[lift], "mode": "build"}
    if outdoor:
        p["outdoor"] = {"title": outdoor[0], "versions": outdoor[1]}
    return p


def find_your_five(lift, gentle):
    return [
        f"{gentle}: 4 × 10, building to a weight you could lift about 12 times\nLog your heaviest set.",
        f"{lift}: build over 5 sets to a solid set of 5\nStop where you could still do 1 or 2 more. Log it.",
        f"{lift}: build over 5–6 sets to a solid set of 5\nStop where you could still do 1 or 2 more. Log it.",
        f"{lift}: build over 6 sets to a heavy set of 5\nPerfect reps only. Log it.",
    ]


WHY = (
    "Cycle 1, week 1: starting-point week. Nobody has logged lifts yet, so every lift day builds to a solid set of 5, "
    "not a max. Log it, and from week 2 the app shows each person their own weights."
)

WEEK = [
    {
        "class_date": "2026-10-19",
        "title": "Press + Steady Twelve",
        "focus": "Press · steady conditioning",
        "why": WHY,
        "parts": [
            part("warmup", "Warm-up", "Warm-up",
                 same("2 rounds: 200 m row or easy jog · 10 band pull-aparts · 10 arm circles each way · 5 empty-bar presses"), 10),
            part("strength", "Strength · find your starting point", "Strict press: find your 5",
                 find_your_five("Strict press", "Dumbbell press"), lift="Strict press"),
            part("conditioning", "Conditioning", "Steady Twelve", [
                "As many rounds as you can in 12 min, easy pace:\n150 m row · 8 box sit-to-stands · 8 wall push-ups",
                "As many rounds as you can in 12 min:\n200 m row · 10 air squats · 8 knee push-ups",
                "As many rounds as you can in 12 min:\n250 m row · 15 kettlebell swings (26/35 lb) · 10 push-ups",
                "As many rounds as you can in 14 min:\n300 m row · 20 kettlebell swings (35/53 lb) · 15 push-ups",
            ], 12, outdoor=("Steady Twelve, Outside", [
                "As many rounds as you can in 12 min, easy pace:\n150 m brisk walk · 8 box sit-to-stands · 8 wall push-ups",
                "As many rounds as you can in 12 min:\n200 m jog · 10 air squats · 8 knee push-ups",
                "As many rounds as you can in 12 min:\n200 m run · 15 kettlebell swings (26/35 lb) · 10 push-ups",
                "As many rounds as you can in 14 min:\n300 m run · 20 kettlebell swings (35/53 lb) · 15 push-ups",
            ])),
            part("cooldown", "Cool-down", "Cool-down", same("Shoulder and chest stretch, 5 min"), 5),
        ],
    },
    {
        "class_date": "2026-10-20",
        "title": "Deadlift + Repeats",
        "focus": "Deadlift · intervals",
        "why": WHY,
        "parts": [
            part("warmup", "Warm-up", "Warm-up",
                 same("2 rounds: 200 m row or easy jog · 10 hip hinges with a dowel · 10 glute bridges · 5 light deadlifts"), 10),
            part("strength", "Strength · find your starting point", "Deadlift: find your 5",
                 find_your_five("Deadlift", "Kettlebell deadlift"), lift="Deadlift"),
            part("conditioning", "Conditioning", "Row Repeats", [
                "4 rounds: 150 m row at an easy-moderate pace, rest 2 min",
                "5 rounds: 250 m row, rest 2 min",
                "6 rounds: 250 m row hard, rest 1:30",
                "8 rounds: 250 m row hard, rest 1:15",
            ], 18, outdoor=("Run Repeats", [
                "4 rounds: 2 min brisk walk, then 2 min easy walk",
                "5 rounds: 200 m jog, walk back to recover",
                "6 rounds: 200 m run hard, walk back to recover",
                "8 rounds: 200 m run hard, jog back to recover",
            ])),
            part("cooldown", "Cool-down", "Cool-down", same("Hamstring and lower-back stretch, 5 min"), 5),
        ],
    },
    {
        "class_date": "2026-10-21",
        "title": "Pull-up Check-in + Steady 25",
        "focus": "Pull-up skills · longer cardio",
        "why": "Cycle 1, week 1. A pull-up check-in so we know where everyone starts on the pull-up goal, then a long steady piece.",
        "parts": [
            part("warmup", "Warm-up", "Warm-up",
                 same("2 rounds: 3 min bike or jog · 10 scap pull-ups or hangs · 10 ring rows · 10 band pull-aparts"), 10),
            part("skill", "Skill · check-in", "Pull-up check-in", [
                "Max ring rows in 1 min, feet far back. Write down your number.\nThen 3 × 15 s dead hang.",
                "Max ring rows in 1 min, feet close in. Write it down.\nThen 3 × 5 band pull-ups with a heavy band.",
                "Max band pull-ups in one go with your lightest band. Note the band and reps.\nThen 3 × 3 slow lowering pull-ups (5 s down).",
                "Max strict pull-ups in one go. Write down your number.\nThen 3 × 3 slow lowering pull-ups (5 s down).",
            ]),
            part("conditioning", "Conditioning", "Steady 25", [
                "15 min at an easy pace, keep moving:\n8 cal bike · 8 step-ups · 8 ring rows (feet far back)",
                "20 min at a steady pace:\n10 cal bike · 10 step-ups · 10 ring rows",
                "25 min at a steady pace:\n12 cal bike · 12 box step-ups (20 in) · 10 ring rows",
                "25 min at a steady pace:\n15 cal bike · 15 box jumps or step-ups (24 in) · 12 ring rows",
            ], 25, outdoor=("Loop and Station", [
                "15 min, easy pace: walk a lap of the block (about 400 m), then 8 step-ups and 8 ring rows. Repeat.",
                "20 min, steady: brisk walk or jog 400 m, then 10 step-ups and 10 ring rows. Repeat.",
                "25 min, steady: run 400 m, then 12 box step-ups (20 in) and 10 ring rows. Repeat.",
                "25 min, steady: run 400 m, then 15 box jumps or step-ups (24 in) and 12 ring rows. Repeat.",
            ])),
            part("cooldown", "Cool-down", "Cool-down", same("Lat and shoulder stretch, 5 min"), 5),
        ],
    },
    {
        "class_date": "2026-10-22",
        "title": "Easy Day: Walk and Mobility",
        "focus": "Easy day · mobility + steady pace",
        "why": "Cycle 1, week 1. Easy day between the hard ones, so everyone can come every day without wearing down. If it's nice out, walk.",
        "parts": [
            part("warmup", "Warm-up", "Warm-up",
                 same("5 min easy bike, then 2 rounds: 10 cat-cows · 10 hip circles each way · 5 inchworms"), 10),
            part("conditioning", "Steady pace", "Bike and Balance", [
                "3 rounds: 4 min easy bike · 10 heel raises · 20 s single-leg stand each side",
                "4 rounds: 4 min easy bike · 15 heel raises · 30 s single-leg stand each side",
                "4 rounds: 5 min easy bike · 20 heel raises · 10 slow step-downs each side",
                "5 rounds: 5 min easy bike · 20 single-leg heel raises · 10 slow step-downs each side",
            ], 22, outdoor=("Walk and Talk", [
                "20 min walk at a chatting pace, then 3 × 20 s single-leg stand each side",
                "25 min brisk walk, then 3 × 30 s single-leg stand each side",
                "25 min brisk walk carrying a light kettlebell for 1 min every 5 min",
                "30 min brisk walk or easy jog with a 35 lb carry for 1 min every 5 min",
            ])),
            part("cooldown", "Cool-down", "Mobility",
                 same("10 min mobility: hips, ankles, upper back. Go slow and breathe."), 10),
        ],
    },
    {
        "class_date": "2026-10-23",
        "title": "Squat + Crew Benchmark",
        "focus": "Squat · short and spicy",
        "why": (
            "Cycle 1, week 1. Find your squat starting point, then the Crew Benchmark: a short test we repeat in test week "
            "(Fri Nov 27) so everyone can see how far they've come. Write down your time and whether you ran or rowed."
        ),
        "parts": [
            part("warmup", "Warm-up", "Warm-up",
                 same("2 rounds: 200 m row or easy jog · 10 goblet squats · 10 band pull-aparts · 5 empty-bar squats"), 10),
            part("strength", "Strength · find your starting point", "Back squat: find your 5",
                 find_your_five("Back squat", "Goblet squat"), lift="Back squat"),
            part("conditioning", "Conditioning · benchmark", "Crew Benchmark", [
                "3 rounds for time:\n250 m row · 10 kettlebell deadlifts (15 lb) · 10 incline push-ups (on a box)\nWrite down your time.",
                "3 rounds for time:\n400 m row · 12 kettlebell swings (18 lb) · 10 knee push-ups\nWrite down your time.",
                "3 rounds for time:\n500 m row · 15 kettlebell swings (26/35 lb) · 10 push-ups\nWrite down your time.",
                "3 rounds for time:\n500 m row · 20 kettlebell swings (35/53 lb) · 15 push-ups\nWrite down your time.",
            ], 15, outdoor=("Crew Benchmark, Outside", [
                "3 rounds for time:\n200 m brisk walk · 10 kettlebell deadlifts (15 lb) · 10 incline push-ups (on a box)\nWrite down your time.",
                "3 rounds for time:\n300 m jog · 12 kettlebell swings (18 lb) · 10 knee push-ups\nWrite down your time.",
                "3 rounds for time:\n400 m run · 15 kettlebell swings (26/35 lb) · 10 push-ups\nWrite down your time.",
                "3 rounds for time:\n400 m run · 20 kettlebell swings (35/53 lb) · 15 push-ups\nWrite down your time.",
            ])),
            part("cooldown", "Cool-down", "Cool-down", same("Hip and quad stretch, 5 min"), 5),
        ],
    },
]


def sql_text(s):
    return "'" + s.replace("'", "''") + "'"


lines = [
    "-- 9AM Crew: first week (Oct 19-23, 2026). Safe to run again: it replaces those five days.",
    "update public.program set cycle_start = '2026-10-19', cycle_weeks = 6, updated_at = now() where id = 1;",
]
for w in WEEK:
    parts_json = json.dumps(w["parts"], ensure_ascii=False)
    lines.append(
        "insert into public.workouts (class_date, title, focus, why, parts, status, created_by) values ("
        f"{sql_text(w['class_date'])}, {sql_text(w['title'])}, {sql_text(w['focus'])}, {sql_text(w['why'])}, "
        f"{sql_text(parts_json)}::jsonb, 'published', null)\n"
        "on conflict (class_date) do update set title = excluded.title, focus = excluded.focus, why = excluded.why, "
        "parts = excluded.parts, status = excluded.status, updated_at = now();"
    )
Path(__file__).with_name("week1.sql").write_text("\n".join(lines) + "\n")
Path(__file__).with_name("week1.json").write_text(json.dumps(WEEK, ensure_ascii=False))
print("wrote week1.sql with", len(WEEK), "workouts")
