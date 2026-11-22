# Cycle 1 audit: remaining days (Nov 23 – Dec 18, 2026)

Live data audited against [RULES.md](RULES.md) and the app's preview checks (`src/lib/programming/rules.ts`). Data pulled with `get_days` on Sun Nov 22, 2026. **No live data was changed.**

This replaces the Nov 14 audit (221 findings). Pushes 26–35 on Nov 14–15 rewrote every day from Nov 16 to Dec 18 and cleared almost all of them.

## Result

The app's checks find **no problems that would block a push**. There are 2 warnings, plus one more thing a person has to check:

| Date | Day | Finding | Source |
|---|---|---|---|
| 2026-12-07 | Mon | "Bike/row intervals" has no outside version. Every other Monday has a 200 m-run outside version. | Checker warning |
| 2026-12-15 / 2026-12-16 | Tue / Wed | Pull-ups on back-to-back days: the optional strict pull-up max on the toes-to-bar retest day, then Helen. Helen is a fixed benchmark, so keep it as written unless Jake says otherwise. | Checker warning |
| 2026-12-11 | Fri | "Station retest" has no outside version. The checker doesn't warn because the piece uses no row, bike or run. It mirrors the Week 1 station test, which also had none, so scores still compare. | Manual |

## Cleared since the Nov 14 audit

- The sled push/pull and the plate-push substitute are gone (Nov 25).
- No runs under 200 m. No timed runs.
- No tibialis raises. No side planks or shoulder taps in conditioning.
- "No machine free" swaps and effort cues now live in the coach notes only.
- "easy" appears only in warm-ups and cool-downs, where rules.ts allows it.
- Thursdays run conditioning first, then accessories, with light barbell work and a different format each week.
- Fridays are station-style (wall balls, burpees, carries, lunges, row/bike) with outside versions (except the Dec 11 retest above).
- Tuesday's toes-to-bar work changes format every week.
- No no-clock flushes.
- Warm-ups and cool-downs each have at least 2 stretches.
- All percentages are in steps of 5.
- Every coach note is under 2,000 characters; the longest is 1,126.

## Not checked

- **Weekly running volume** (the ≤10% rise rule). It needs a per-week count of run metres at each level, which the checker doesn't do.
- **Repeats of movements outside the checker's list.** It only knows a fixed set of common movements.
- **Exercise-science quality of the warm-ups and cool-downs** beyond the stretch count.
- **Past days (Oct 19 – Nov 20).** They're read-only, so they weren't audited.
