# 9AM Crew

A phone-friendly web app for a small group that trains together every weekday at 9.

- **Today**: tap "I'm coming" for the next class and see who else is going.
- **Workouts**: the next three weeks, each at four levels (Gentle, Steady, Strong, Full), with your own weights worked out from your lifts, and inside and outside versions depending on the weather.
- **My lifts**: log lifts; new personal bests are spotted automatically, posted to the chat and shown on Today for cheering.
- **Benchmarks** (a tab on My lifts): log timed tests and named workouts (1 km run, Cindy, Helen...). Bests are kept per level. Admins add benchmarks and mark a workout part as a benchmark in the builder.
- **On each workout**: every part folds away, and lift and benchmark parts have a "Log" button, so results go in without leaving the workout.
- **Workout mode** (everyone) and **Coach mode** (admins): full screen, one part at a time, big text, a timer for each part, and the screen stays awake. Coach mode shows all four levels side by side, who's coming, and the coach notes sorted onto the part they're about.
- **Chat**: one live group chat.
- **Spirit animals**: pick a (mid-energy) animal avatar, or describe one and Claude draws it.
- **Admin** (for members you choose): the program planner (cycle length, start date, goals) and the workout builder, which suggests each day's workout from the plan so you can tweak, swap or replace it before posting.

People sign up with their email and a password, and stay signed in. New people wait until an admin approves them. The first person to sign up becomes the first admin. Forgotten passwords can be reset by email.

## How the programming works

- **Weekly split**: Mon press + steady rounds · Tue deadlift + intervals · Wed pull-up skills + longer cardio · Thu easy day · Fri squat + short, hard workout.
- **Cycles** (6 weeks by default): weights climb for three weeks, ease off in week 4, go heavy in week 5, and week 6 is test week where everyone tries for a new best. Then the next cycle starts automatically.
- **Levels**: Strong gets the planned percentage, Steady 10% less, Full 5% more, and Gentle uses lighter tools (goblet squat instead of back squat, and so on).
- **Your weight**: the app estimates each person's one-rep best from what they've logged and shows "Your weight: 155 lb" on the workout.
- **Conditioning** rotates through a library week to week; "Swap" in the builder steps to the next option.

All of this lives in `src/lib/programming/` and is easy to change.

## Putting it online (about 30 minutes, free)

You need two free accounts: **Supabase** (the database and sign-in) and **Vercel** (hosting). A GitHub account makes Vercel easiest.

### 1. Supabase

1. Go to supabase.com, create a new project. Pick a region near you (Canada Central or US East).
2. Open **SQL Editor**, paste the whole of `supabase/schema.sql`, and press **Run**. Then do the same with each `supabase/migration-*.sql` file in number order.
3. Open **Authentication → Sign In / Providers → Email** and turn off **Confirm email** (admin approval already keeps strangers out).
4. Under **Authentication → URL Configuration**, set **Site URL** to your Vercel address once you have it.
5. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key.

### 2. Vercel

1. Put this folder in a GitHub repository (or use `npx vercel` from the folder).
2. On vercel.com, **Add New → Project**, pick the repository.
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon public key
4. Deploy. Vercel gives you a web address; you can point a domain at it later.
5. Back in Supabase, **Authentication → URL Configuration**, set **Site URL** to that address.

### 3. First day

1. **You** sign up first, so you become the admin.
2. Open **Admin**, set the cycle start date (a Monday) and the crew's goals.
3. Build and publish the first week of workouts.
4. Share the link with the crew. As they sign up, approve them in **Admin → Members** and make one or two of them admins.
5. Ask everyone to log one recent lift for each main move (an estimate is fine) so their weights show up on the workouts.

## For developers

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL and anon key
npm run dev                  # http://localhost:3000
npm test                     # programming engine tests
npm run test:db              # runs schema.sql in an in-memory Postgres and checks the security rules
```

Stack: Next.js 16 (App Router, server actions), Supabase (Postgres with row-level security, email and password sign-in, realtime for chat). Times use `America/Halifax`; set `NEXT_PUBLIC_TIME_ZONE` to change it. Weights are in pounds. Coach notes live in `workout_coach_notes` (admins only).

### Claude features (optional)

Add your Claude API key in Vercel as a **Secret** named `ANTHROPIC_API_KEY`. That turns on:
- **Ask Claude** in the workout builder and **Draft a week with Claude** on the Admin page (admins only, saved as drafts for review).
- **Need to adjust today?** on each upcoming workout: swaps for a sore knee, low energy or missing equipment.
- **Friday recap** in the chat, written once per week after Friday's class.
Daily limits per person keep the cost down; set a monthly spending limit in the Claude Console too.

### Cycle planner

**Admin → Cycle planner** lists the current cycle and the next three. Plan any future cycle with Claude (write a brief: focus lifts, dates away, number of weeks) or by hand from the usual pattern. A planned cycle sets its weeks (percentages, sets × reps, ease-off and test weeks), the weekday split and the goals; every suggestion, Claude draft and the cycle chart follow it. Unplanned cycles use the usual pattern. Two weeks before a cycle ends, admins get a nudge to plan the next one.

With Claude on, opening the Program page drafts any empty days in the coming week, and each planned cycle has **Draft the rest of the cycle**. Drafts always wait for an admin to publish.

## Working on the code together

The live app deploys automatically whenever something lands on `main`, so:

1. **Work on a branch** (`git switch -c better-chat`), push it, and open a pull request. Small changes straight to `main` are fine too; every push to `main` goes live in about a minute.
2. **Run the checks first**: `npm test && npm run test:db && npm run build`. Vercel runs the tests too (`npm run build` runs them before building), and if anything fails the deploy stops and the current version stays live.
3. **Database changes** go in a new numbered file, `supabase/migration-008-whatever.sql`, written so it's safe to run twice (`if not exists`, `drop ... if exists`). Add it to `scripts/test-db.mjs` with a check, then run it in the Supabase SQL editor **before** merging code that needs it. Tell the others when you do.
4. **Secrets never go in the code.** Keys live in Vercel's environment variables and in your own `.env.local` (which git ignores). This repository is public.
5. Local development uses the live database (there's only one). Use your own test account, and be careful with anything that deletes.

House rules for the app itself:
- **Never program partner or team workouts.** Everyone works on their own. The Claude prompts check for it too.
- No comments on workouts; the group chat covers that.
- Spirit animals stay mid-energy: no bears, no lions.

### Ideas for later

- Push notifications ("tomorrow's workout is up", "Marie hit a PR")
- Let members suggest workouts for admins to approve
- Kilograms option
- A history view of past workouts and who came
