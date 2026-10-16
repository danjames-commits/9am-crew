# 9AM Crew

A phone-friendly web app for a small group that trains together every weekday at 9.

- **Today**: tap "I'm coming" for the next class and see who else is going.
- **Workouts**: the next three weeks, each at four levels (Gentle, Steady, Strong, Full), with your own weights worked out from your lifts, and a comment thread on every day.
- **My lifts**: log lifts; new personal bests are spotted automatically, posted to the chat and shown on Today for cheering.
- **Chat**: one live group chat.
- **Admin** (for members you choose): the program planner (cycle length, start date, goals) and the workout builder, which suggests each day's workout from the plan so you can tweak, swap or replace it before posting.

People sign up with their email and a password, and stay signed in. New people wait until an admin approves them. The first person to sign up becomes the first admin. Forgotten passwords can be reset by email.

## How the programming works

- **Weekly split**: Mon press + partner workout · Tue deadlift + intervals · Wed pull-up skills + longer cardio · Thu easy day · Fri squat + short, hard workout.
- **Cycles** (6 weeks by default): weights climb for three weeks, ease off in week 4, go heavy in week 5, and week 6 is test week where everyone tries for a new best. Then the next cycle starts automatically.
- **Levels**: Strong gets the planned percentage, Steady 10% less, Full 5% more, and Gentle uses lighter tools (goblet squat instead of back squat, and so on).
- **Your weight**: the app estimates each person's one-rep best from what they've logged and shows "Your weight: 155 lb" on the workout.
- **Conditioning** rotates through a library week to week; "Swap" in the builder steps to the next option.

All of this lives in `src/lib/programming/` and is easy to change.

## Putting it online (about 30 minutes, free)

You need two free accounts: **Supabase** (the database and sign-in) and **Vercel** (hosting). A GitHub account makes Vercel easiest.

### 1. Supabase

1. Go to supabase.com, create a new project. Pick a region near you (Canada Central or US East).
2. Open **SQL Editor**, paste the whole of `supabase/schema.sql`, and press **Run**. Then do the same with `supabase/migration-003-claude.sql` and `supabase/migration-004-cycles.sql`.
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

Stack: Next.js 16 (App Router, server actions), Supabase (Postgres with row-level security, email-code sign-in, realtime for chat). Times use `America/Halifax`; set `NEXT_PUBLIC_TIME_ZONE` to change it. Weights are in pounds.

### Claude features (optional)

Add your Claude API key in Vercel as a **Secret** named `ANTHROPIC_API_KEY`. That turns on:
- **Ask Claude** in the workout builder and **Draft a week with Claude** on the Admin page (admins only, saved as drafts for review).
- **Need to adjust today?** on each upcoming workout: swaps for a sore knee, low energy or missing equipment.
- **Friday recap** in the chat, written once per week after Friday's class.
Daily limits per person keep the cost down; set a monthly spending limit in the Claude Console too.

### Cycle planner

**Admin → Cycle planner** lists the current cycle and the next three. Plan any future cycle with Claude (write a brief: focus lifts, dates away, number of weeks) or by hand from the usual pattern. A planned cycle sets its weeks (percentages, sets × reps, ease-off and test weeks), the weekday split and the goals; every suggestion, Claude draft and the cycle chart follow it. Unplanned cycles use the usual pattern. Two weeks before a cycle ends, admins get a nudge to plan the next one.

With Claude on, opening the Program page drafts any empty days in the coming week, and each planned cycle has **Draft the rest of the cycle**. Drafts always wait for an admin to publish.

### Ideas for later

- Push notifications ("tomorrow's workout is up", "Marie hit a PR")
- Let members suggest workouts for admins to approve
- Kilograms option
- A history view of past workouts and who came
