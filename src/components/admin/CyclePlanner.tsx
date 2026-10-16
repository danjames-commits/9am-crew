'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { aiPlanCycle, deleteCycle, saveCycle } from '@/app/actions';
import { addDays, shortDate, weekday } from '@/lib/dates';
import { GENTLE_FOR, STYLES, STYLE_NAMES, type CycleDay, type CycleWeek } from '@/lib/programming/engine';
import { asWeekPlans, cleanWeek, KIND_NAMES, WEEKDAYS, type PlanDraft } from '@/lib/programming/plan';
import { CycleChart } from '../CycleChart';

const monthDay = (d: string) => shortDate(d).split(' · ')[1];

export function CyclePlanner({
  id,
  cycleNumber,
  initial,
  movements,
  aiOn,
  hasPlan,
}: {
  id: number | null;
  cycleNumber: number;
  initial: PlanDraft;
  movements: string[];
  aiOn: boolean;
  /** True when editing a saved cycle (the plan shows straight away). */
  hasPlan: boolean;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanDraft>(initial);
  const [showPlan, setShowPlan] = useState(hasPlan || !aiOn);
  const [brief, setBrief] = useState(initial.brief);
  const [change, setChange] = useState('');
  const [goalText, setGoalText] = useState('');
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [thinking, think] = useTransition();
  const [saving, save] = useTransition();

  const update = (p: Partial<PlanDraft>) => {
    setPlan((cur) => ({ ...cur, ...p }));
    setDirty(true);
    setMsg(null);
  };
  // Numbers are tidied when saving, so typing "80" doesn't get clamped at "8".
  const setWeek = (i: number, w: Partial<CycleWeek>) => update({ weeks: plan.weeks.map((x, j) => (j === i ? { ...x, ...w } : x)) });
  const setDay = (n: string, d: Partial<CycleDay>) => update({ days: { ...plan.days, [n]: { ...plan.days[n], ...d } } });

  function ask(request: string) {
    setMsg(null);
    think(async () => {
      const r = await aiPlanCycle(plan.start_date, brief, request ? plan : null, request, id);
      if (r.error) setMsg({ error: r.error });
      else if (r.plan) {
        setPlan(r.plan);
        setShowPlan(true);
        setDirty(true);
        setChange('');
        setMsg({ ok: request ? 'Claude updated the plan. Check it over, then save.' : 'Here’s Claude’s plan. Check it over, change anything you like, then save.' });
      }
    });
  }

  function doSave() {
    setMsg(null);
    save(async () => {
      const r = await saveCycle(id, { ...plan, brief });
      if (r.error) setMsg({ error: r.error });
      else {
        setDirty(false);
        setMsg({ ok: 'Saved. Workouts for these weeks will follow this plan.' });
        if (!id && r.id) router.replace(`/admin/cycles/${r.id}`);
        else router.refresh();
      }
    });
  }

  const startOk = weekday(plan.start_date) === 1;
  const lastFriday = addDays(plan.start_date, plan.weeks.length * 7 - 3);

  return (
    <div className="stack loose">
      {aiOn && (
        <section className="card stack" style={{ border: '2px solid var(--teal)' }} aria-labelledby="brief-title">
          <h2 id="brief-title" style={{ fontSize: 18 }}>
            {showPlan ? 'Brief for Claude' : `Plan cycle ${cycleNumber} with Claude`}
          </h2>
          <p className="muted small">
            Tell Claude what this cycle should focus on, and anything it should know: dates people are away, injuries, lifts to work on, how many weeks,
            outdoor work, holidays. Leave it blank for a sensible next cycle.
          </p>
          <label className="sr-only" htmlFor="brief">
            Brief for Claude
          </label>
          <textarea
            id="brief"
            rows={4}
            maxLength={1500}
            placeholder="e.g. 6 weeks. Focus on deadlift and pull-ups. Two of us are away the week of Dec 21. Keep Thursdays easy. More outdoor work while the weather holds."
            value={brief}
            disabled={thinking}
            onChange={(e) => {
              setBrief(e.target.value);
              setDirty(true);
            }}
          />
          <button type="button" className="btn teal" disabled={thinking || !startOk} onClick={() => ask('')}>
            {thinking ? 'Claude is planning… about 30 seconds' : showPlan ? 'Start over: plan it fresh from the brief' : 'Plan it with Claude'}
          </button>
          {!showPlan && (
            <button type="button" className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => setShowPlan(true)}>
              Or plan it by hand, starting from the usual pattern
            </button>
          )}
        </section>
      )}

      <section className="card stack" aria-labelledby="dates-title">
        <h2 id="dates-title" style={{ fontSize: 18 }}>
          Dates
        </h2>
        <label className="field">
          Starts on (a Monday)
          <input type="date" value={plan.start_date} onChange={(e) => update({ start_date: e.target.value })} />
        </label>
        {startOk ? (
          <p className="muted small">
            {plan.weeks.length} weeks: {monthDay(plan.start_date)} to {monthDay(lastFriday)}.
          </p>
        ) : (
          <p className="small" role="alert" style={{ color: 'var(--danger)' }}>
            Pick a Monday.
          </p>
        )}
      </section>

      {showPlan && (
        <>
          <section className="card stack" aria-labelledby="plan-title">
            <h2 id="plan-title" style={{ fontSize: 18 }}>
              The plan
            </h2>
            <label className="field">
              Name
              <input type="text" maxLength={80} placeholder="e.g. Deadlift and pull-ups" value={plan.name} onChange={(e) => update({ name: e.target.value })} />
            </label>
            <label className="field">
              Why it’s planned this way <span className="muted" style={{ fontWeight: 400 }}>(everyone sees this)</span>
              <textarea rows={3} maxLength={1500} value={plan.why} onChange={(e) => update({ why: e.target.value })} />
            </label>
            <div className="stack tight">
              <div className="field" style={{ gap: 0 }}>
                Crew goals
              </div>
              <div className="row wrap" style={{ gap: 6 }}>
                {plan.goals.map((g, i) => (
                  <button
                    key={g + i}
                    type="button"
                    className="pill"
                    style={{ cursor: 'pointer' }}
                    aria-label={`Remove goal: ${g}`}
                    onClick={() => update({ goals: plan.goals.filter((_, j) => j !== i) })}
                  >
                    {g} ✕
                  </button>
                ))}
              </div>
              {plan.goals.length < 8 && (
                <div className="row">
                  <label className="sr-only" htmlFor="new-goal">
                    New goal
                  </label>
                  <input id="new-goal" type="text" maxLength={60} placeholder="Add a goal" value={goalText} onChange={(e) => setGoalText(e.target.value)} />
                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={!goalText.trim()}
                    onClick={() => {
                      update({ goals: [...plan.goals, goalText.trim()] });
                      setGoalText('');
                    }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="card stack" aria-labelledby="weeks-title">
            <h2 id="weeks-title" style={{ fontSize: 18 }}>
              Weeks
            </h2>
            <CycleChart weeks={asWeekPlans(plan.weeks)} />
            <p className="muted small">Percentages are for Strong. Steady is 10% lighter, Full 5% heavier.</p>
            <div className="stack">
              {plan.weeks.map((w, i) => (
                <fieldset key={i} className="stack tight" style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 10, margin: 0 }}>
                  <legend className="small" style={{ fontWeight: 700, padding: '0 4px' }}>
                    Week {i + 1} · {monthDay(addDays(plan.start_date, i * 7))}
                  </legend>
                  <div className="row fields">
                    <label className="field grow">
                      Type
                      <select value={w.kind} onChange={(e) => setWeek(i, { kind: e.target.value as CycleWeek['kind'], label: KIND_NAMES[e.target.value as CycleWeek['kind']] })}>
                        <option value="build">Build</option>
                        <option value="deload">Ease off</option>
                        <option value="test">Test</option>
                      </select>
                    </label>
                    <label className="field grow">
                      Label
                      <input type="text" maxLength={20} value={w.label} onChange={(e) => setWeek(i, { label: e.target.value })} />
                    </label>
                  </div>
                  {w.kind !== 'test' && (
                    <div className="row fields">
                      <label className="field grow">
                        Strong %
                        <input type="number" min={50} max={90} value={w.pct} onChange={(e) => setWeek(i, { pct: Number(e.target.value) })} />
                      </label>
                      <label className="field grow">
                        Sets
                        <input type="number" min={1} max={8} value={w.sets} onChange={(e) => setWeek(i, { sets: Number(e.target.value) })} />
                      </label>
                      <label className="field grow">
                        Reps
                        <input type="number" min={1} max={12} value={w.reps} onChange={(e) => setWeek(i, { reps: Number(e.target.value) })} />
                      </label>
                    </div>
                  )}
                  {plan.weeks.length > 3 && (
                    <button
                      type="button"
                      className="btn small danger"
                      style={{ alignSelf: 'flex-start' }}
                      onClick={() => update({ weeks: plan.weeks.filter((_, j) => j !== i) })}
                    >
                      Remove week {i + 1}
                    </button>
                  )}
                </fieldset>
              ))}
            </div>
            {plan.weeks.length < 12 && (
              <button
                type="button"
                className="btn small ghost"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => {
                  const last = plan.weeks[plan.weeks.length - 1];
                  const add = cleanWeek({ kind: 'build', label: 'Build', pct: 75, sets: 5, reps: 5 });
                  // Keep a final test week last.
                  update({ weeks: last?.kind === 'test' ? [...plan.weeks.slice(0, -1), add, last] : [...plan.weeks, add] });
                }}
              >
                + Add a week
              </button>
            )}
          </section>

          <section className="card stack" aria-labelledby="split-title">
            <h2 id="split-title" style={{ fontSize: 18 }}>
              Weekday split
            </h2>
            {WEEKDAYS.map(({ n, long }) => {
              const d = plan.days[n];
              return (
                <fieldset key={n} className="stack tight" style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 10, margin: 0 }}>
                  <legend className="small" style={{ fontWeight: 700, padding: '0 4px' }}>
                    {long}
                  </legend>
                  <label className="field">
                    Focus
                    <input type="text" maxLength={60} value={d.focus} onChange={(e) => setDay(n, { focus: e.target.value })} />
                  </label>
                  <div className="row fields">
                    <label className="field grow">
                      Main lift
                      <select
                        value={d.lift ?? ''}
                        onChange={(e) => {
                          const lift = e.target.value || null;
                          setDay(n, { lift, gentle: lift ? GENTLE_FOR[lift] ?? lift : null });
                        }}
                      >
                        <option value="">None</option>
                        {movements.map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </label>
                    {d.lift && (
                      <label className="field grow">
                        Gentle does
                        <select value={d.gentle ?? d.lift} onChange={(e) => setDay(n, { gentle: e.target.value })}>
                          {movements.map((m) => (
                            <option key={m}>{m}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <div className="row fields">
                    <label className="field grow">
                      Conditioning
                      <select value={d.style} onChange={(e) => setDay(n, { style: e.target.value as CycleDay['style'] })}>
                        {STYLES.map((s) => (
                          <option key={s} value={s}>
                            {STYLE_NAMES[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field grow">
                      Pull-up practice
                      <select value={d.skill ?? ''} onChange={(e) => setDay(n, { skill: e.target.value === 'pullup' ? 'pullup' : null })}>
                        <option value="">No</option>
                        <option value="pullup">Yes</option>
                      </select>
                    </label>
                  </div>
                  <label className="field">
                    Note for the workout writer <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
                    <input type="text" maxLength={200} placeholder="e.g. add a farmer carry" value={d.notes ?? ''} onChange={(e) => setDay(n, { notes: e.target.value })} />
                  </label>
                </fieldset>
              );
            })}
          </section>

          {aiOn && (
            <section className="card stack" style={{ border: '2px solid var(--teal)' }} aria-labelledby="change-title">
              <h2 id="change-title" style={{ fontSize: 18 }}>
                Ask Claude for changes
              </h2>
              <label className="sr-only" htmlFor="change">
                What should change?
              </label>
              <textarea
                id="change"
                rows={2}
                maxLength={800}
                placeholder="e.g. make it 5 weeks, keep squat on Fridays, lighter week over Christmas"
                value={change}
                disabled={thinking}
                onChange={(e) => setChange(e.target.value)}
              />
              <button type="button" className="btn teal" disabled={thinking || !change.trim()} onClick={() => ask(change)}>
                {thinking ? 'Claude is updating the plan…' : 'Ask Claude'}
              </button>
            </section>
          )}
        </>
      )}

      {msg?.error && <div className="notice bad" role="alert">{msg.error}</div>}
      {msg?.ok && <div className="notice good" role="status">{msg.ok}</div>}

      {showPlan && (
        <div className="row" style={{ position: 'sticky', bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 8px)', background: 'var(--ground)', padding: '8px 0' }}>
          <button type="button" className="btn primary big grow" disabled={saving || thinking || !startOk || (!dirty && !!id)} onClick={doSave}>
            {saving ? 'Saving…' : id ? (dirty ? 'Save changes' : 'Saved') : `Save cycle ${cycleNumber}`}
          </button>
        </div>
      )}

      {id && (
        <form
          action={deleteCycle.bind(null, id)}
          onSubmit={(e) => {
            if (!confirm('Delete this planned cycle? Its weeks go back to the usual pattern. Workouts already saved stay as they are.')) e.preventDefault();
          }}
        >
          <button className="btn danger block">Delete this cycle plan</button>
        </form>
      )}
    </div>
  );
}
