"""Writes supabase/cycle1.sql and supabase/cycle1-undo.sql from the Court6 Cycle 1 program
(docs/programming/court6-cycle1-app.json, Oct 19 - Dec 18, 2026).

cycle1.sql, in one transaction:
  1. adds the cycle row (fails if another cycle overlaps those 9 weeks),
  2. upserts each workout on class_date as 'published' (Week 1 replaces the week1.sql version),
  3. upserts each workout's coach note right after it (empty notes skipped).

cycle1-undo.sql, in one transaction: removes the cycle row and the coach notes, deletes
the Oct 26 - Dec 18 workouts (their comments go with them), and puts week1.sql's
Week 1 back.

Checks the program against the app's rules first and stops if anything is off.
"""
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "docs/programming/court6-cycle1-app.json"
WEEK1 = Path(__file__).with_name("week1.json")

STATUS = "published"
WEEK_COUNT = 9
PART_KINDS = {"warmup", "strength", "skill", "conditioning", "cooldown"}
WEEK_KINDS = {"build", "deload", "test"}
# Seeded in schema.sql / migration-005. Check `select name from public.movements` if admins added more.
MOVEMENTS = {
    "Back squat", "Front squat", "Deadlift", "Bench press", "Strict press",
    "Push press", "Power clean", "Snatch", "Squat clean & jerk",
}
NOTE_MAX = 2000


def sql_text(s):
    return "'" + s.replace("'", "''") + "'"


def sql_json(v):
    return sql_text(json.dumps(v, ensure_ascii=False)) + "::jsonb"


def clean_note(s):
    return (s or "").replace("\r\n", "\n").strip()[:NOTE_MAX].strip()


def check(program):
    errors = []
    cycle, workouts = program["cycle"], program["workouts"]

    start = date.fromisoformat(cycle["start_date"])
    if start.isoweekday() != 1:
        errors.append(f"cycle start_date {start} is not a Monday")
    if not cycle["name"] or len(cycle["name"]) > 80:
        errors.append("cycle name must be 1-80 characters")
    if len(cycle["why"]) > 1500:
        errors.append(f"cycle why is {len(cycle['why'])} characters (max 1500)")
    if len(cycle["weeks"]) != WEEK_COUNT:
        errors.append(f"cycle has {len(cycle['weeks'])} weeks, expected {WEEK_COUNT}")
    for i, w in enumerate(cycle["weeks"], 1):
        if w.get("kind") not in WEEK_KINDS:
            errors.append(f"week {i}: kind {w.get('kind')!r} not in {sorted(WEEK_KINDS)}")
    if sorted(cycle["days"]) != ["1", "2", "3", "4", "5"]:
        errors.append(f"cycle days keys are {sorted(cycle['days'])}, expected '1'-'5'")
    for key, d in cycle["days"].items():
        if d.get("lift") and d["lift"] not in MOVEMENTS:
            errors.append(f"day {key}: lift {d['lift']!r} not in movements")

    if len(workouts) != WEEK_COUNT * 5:
        errors.append(f"{len(workouts)} workouts, expected {WEEK_COUNT * 5}")
    seen = set()
    for w in workouts:
        d = w["class_date"]
        day = date.fromisoformat(d)
        if d in seen:
            errors.append(f"{d}: duplicate date")
        seen.add(d)
        if not 0 <= (day - start).days < WEEK_COUNT * 7 or day.isoweekday() > 5:
            errors.append(f"{d}: not a weekday inside the cycle")
        if not 1 <= len(w["title"]) <= 80:
            errors.append(f"{d}: title must be 1-80 characters")
        for p in w["parts"]:
            where = f"{d} {p.get('title')!r}"
            if p.get("kind") not in PART_KINDS:
                errors.append(f"{where}: kind {p.get('kind')!r} not in {sorted(PART_KINDS)}")
            if len(p.get("versions", [])) != 4:
                errors.append(f"{where}: {len(p.get('versions', []))} versions, expected 4")
            if "outdoor" in p and len(p["outdoor"].get("versions", [])) != 4:
                errors.append(f"{where}: outdoor has {len(p['outdoor'].get('versions', []))} versions, expected 4")
            lift = p.get("lift")
            if lift:
                if lift.get("movement") not in MOVEMENTS:
                    errors.append(f"{where}: lift {lift.get('movement')!r} not in movements")
                if len(lift.get("pct", [])) != 4:
                    errors.append(f"{where}: lift pct needs 4 values")
    return errors


def workout_upsert(w, status):
    return (
        "insert into public.workouts (class_date, title, focus, why, parts, status, created_by) values ("
        f"{sql_text(w['class_date'])}, {sql_text(w['title'])}, {sql_text(w['focus'])}, {sql_text(w['why'])}, "
        f"{sql_json(w['parts'])}, {sql_text(status)}, null)\n"
        "on conflict (class_date) do update set title = excluded.title, focus = excluded.focus, why = excluded.why, "
        "parts = excluded.parts, status = excluded.status, updated_at = now();"
    )


program = json.loads(SOURCE.read_text())
errors = check(program)
if errors:
    sys.exit("Program does not fit the app's rules, nothing written:\n  " + "\n  ".join(errors))

cycle, workouts = program["cycle"], program["workouts"]
goals = "array[" + ", ".join(sql_text(g) for g in cycle["goals"]) + "]::text[]"

lines = [
    f"-- 9AM Crew: Court6 Cycle 1 ({cycle['start_date']}, {WEEK_COUNT} weeks). Generated by supabase/cycle1.py.",
    "-- Run once. Fails without changing anything if a cycle already covers these weeks.",
    "begin;",
    "insert into public.cycles (start_date, week_count, name, why, brief, goals, weeks, days, created_by) values ("
    f"{sql_text(cycle['start_date'])}, {WEEK_COUNT}, {sql_text(cycle['name'])}, {sql_text(cycle['why'])}, '', "
    f"{goals}, {sql_json(cycle['weeks'])}, {sql_json(cycle['days'])}, null);",
]
notes = 0
for w in workouts:
    lines.append(workout_upsert(w, STATUS))
    note = clean_note(w.get("coach_notes"))
    if note:
        notes += 1
        lines.append(
            "insert into public.workout_coach_notes (class_date, body) values ("
            f"{sql_text(w['class_date'])}, {sql_text(note)})\n"
            "on conflict (class_date) do update set body = excluded.body, updated_at = now();"
        )
lines.append("commit;")
Path(__file__).with_name("cycle1.sql").write_text("\n".join(lines) + "\n")

week1 = json.loads(WEEK1.read_text())
week1_dates = {w["class_date"] for w in week1}
dates = ", ".join(sql_text(w["class_date"]) for w in workouts)
later = ", ".join(sql_text(w["class_date"]) for w in workouts if w["class_date"] not in week1_dates)
undo = [
    "-- 9AM Crew: undo supabase/cycle1.sql. Generated by supabase/cycle1.py.",
    "-- Deleting a workout also deletes its comments. Attendance and lift logs are kept.",
    "begin;",
    f"delete from public.workout_coach_notes where class_date in ({dates});",
    f"delete from public.workouts where class_date in ({later});",
    f"delete from public.cycles where start_date = {sql_text(cycle['start_date'])} and name = {sql_text(cycle['name'])};",
    "-- Put the original Week 1 (week1.sql) back.",
    *(workout_upsert(w, "published") for w in week1),
    "commit;",
]
Path(__file__).with_name("cycle1-undo.sql").write_text("\n".join(undo) + "\n")

print(f"wrote cycle1.sql: 1 cycle, {len(workouts)} workouts ({STATUS}), {notes} coach notes")
print(f"wrote cycle1-undo.sql: restores {len(week1)} Week 1 workouts")
