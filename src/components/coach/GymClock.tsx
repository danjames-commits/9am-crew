'use client';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { draftClockTimers, pressClockSequence, saveClockPlan } from '@/app/actions';
import { buttonsFor, clockTime, describeStep, digitsToSeconds, LEAD_IN, stepSeconds, type ClockPlan, type ClockStep } from '@/lib/clock-plan';
import { CLOCK_BUTTONS } from '@/lib/clock-buttons';
import { ClockRemote } from '../admin/ClockRemote';
import type { Part } from '@/lib/types';

export interface ClockInfo {
  date: string;
  plan: ClockPlan;
  /** Claude can draft timers. */
  canDraft: boolean;
}

// ---------------------------------------------------------------
// Running timers: the app sets the clock, then keeps its own copy of the time
// so it knows when to start the next timer in the part.
// ---------------------------------------------------------------

export interface ClockRun {
  part: number;
  step: number;
  phase: 'sending' | 'running' | 'paused' | 'done';
  /** When the current step ends (lead-in included), while running. */
  endsAt: number;
  /** Seconds left when paused. */
  left: number;
}

export function useClockRunner(plan: ClockPlan) {
  const [run, setRun] = useState<ClockRun | null>(null);
  const [error, setError] = useState('');
  const [auto, setAuto] = useState(true);
  const [, tick] = useState(0);
  const planRef = useRef(plan);
  planRef.current = plan;
  const busy = useRef(false);

  const stepOf = (r: { part: number; step: number }) => planRef.current.find((p) => p.part === r.part)?.steps[r.step];

  const start = useCallback(async (part: number, step: number) => {
    const s = planRef.current.find((p) => p.part === part)?.steps[step];
    if (!s || busy.current) return;
    busy.current = true;
    setError('');
    setRun({ part, step, phase: 'sending', endsAt: 0, left: 0 });
    // If the app was updated while this page was open, the call fails; say so instead of hanging.
    const r = await pressClockSequence(buttonsFor(s), `timer ${describeStep(s)}`).catch(() => ({ error: 'The app was just updated. Pull down to reload, then try again.' }));
    busy.current = false;
    if (r && 'error' in r && r.error) {
      setError(r.error);
      setRun(null);
      return;
    }
    setRun({ part, step, phase: 'running', endsAt: Date.now() + (LEAD_IN + stepSeconds(s)) * 1000, left: 0 });
  }, []);

  const send = useCallback(async (buttons: string[]) => {
    const r = await pressClockSequence(buttons, 'control').catch(() => ({ error: 'The app was just updated. Pull down to reload, then try again.' }));
    if (r && 'error' in r && r.error) setError(r.error);
    return !(r && 'error' in r && r.error);
  }, []);

  const pause = useCallback(() => {
    setRun((r) => (r && r.phase === 'running' ? { ...r, phase: 'paused', left: Math.max(0, (r.endsAt - Date.now()) / 1000) } : r));
    send(['Pause']);
  }, [send]);
  const resume = useCallback(() => {
    setRun((r) => (r && r.phase === 'paused' ? { ...r, phase: 'running', endsAt: Date.now() + r.left * 1000 } : r));
    send(['OK']);
  }, [send]);
  const stop = useCallback(() => {
    setRun(null);
    send(['Exit']);
  }, [send]);

  // Tick, and when a step ends, start the next one in the part (if "run back to back" is on).
  useEffect(() => {
    if (!run || run.phase !== 'running') return;
    const id = setInterval(() => {
      tick((n) => n + 1);
      if (Date.now() < run.endsAt) return;
      clearInterval(id);
      const steps = planRef.current.find((p) => p.part === run.part)?.steps ?? [];
      if (auto && run.step + 1 < steps.length) start(run.part, run.step + 1);
      else {
        setRun({ ...run, phase: 'done' });
        try {
          navigator.vibrate?.([300, 150, 300]);
        } catch {}
      }
    }, 250);
    return () => clearInterval(id);
  }, [run, auto, start]);

  // What's showing: "Get ready 0:07", or the time left in this round of work / rest.
  let view: { title: string; time: string; sub: string } | null = null;
  const s = run ? stepOf(run) : undefined;
  if (run && s) {
    const total = stepSeconds(s);
    const left = run.phase === 'paused' ? run.left : run.phase === 'running' ? Math.max(0, (run.endsAt - Date.now()) / 1000) : 0;
    const into = LEAD_IN + total - left;
    if (run.phase === 'sending') view = { title: 'Setting the clock…', time: '', sub: describeStep(s) };
    else if (run.phase === 'done') view = { title: 'Done', time: '0:00', sub: s.label || describeStep(s) };
    else if (into < LEAD_IN) view = { title: 'Get ready', time: clockTime(Math.ceil(LEAD_IN - into)), sub: s.label || describeStep(s) };
    else if (s.type === 'countdown') view = { title: s.label || 'Countdown', time: clockTime(Math.ceil(left)), sub: describeStep(s) };
    else {
      const t = into - LEAD_IN;
      const cycle = s.work + s.rest;
      const round = Math.min(s.rounds, Math.floor(t / cycle) + 1);
      const inRound = t - (round - 1) * cycle;
      const working = inRound < s.work;
      const tLeft = working ? s.work - inRound : cycle - inRound;
      view = { title: `${working ? 'Work' : 'Rest'} · round ${round} of ${s.rounds}`, time: clockTime(Math.ceil(tLeft)), sub: s.label || describeStep(s) };
    }
    if (run.phase === 'paused') view.title = `Paused · ${view.title}`;
  }

  return { run, view, error, setError, auto, setAuto, start, pause, resume, stop, send };
}

export type ClockRunner = ReturnType<typeof useClockRunner>;

// ---------------------------------------------------------------
// One part's timers: start them, and change them (coaches)
// ---------------------------------------------------------------

export function ClockPartPanel({
  partIndex,
  part,
  info,
  plan,
  setPlan,
  runner,
  onRemote,
}: {
  partIndex: number;
  part: Part;
  info: ClockInfo;
  plan: ClockPlan;
  setPlan: (p: ClockPlan) => void;
  runner: ClockRunner;
  onRemote: () => void;
}) {
  const steps = plan.find((p) => p.part === partIndex)?.steps ?? [];
  const [editing, setEditing] = useState(false);
  const here = runner.run && runner.run.part === partIndex ? runner.run : null;
  const elsewhere = runner.run && !here && runner.run.phase !== 'done';

  if (editing) {
    return (
      <StepEditor
        steps={steps}
        part={part}
        onCancel={() => setEditing(false)}
        onSave={async (next) => {
          const rest = plan.filter((p) => p.part !== partIndex);
          const all = next.length ? [...rest, { part: partIndex, label: part.label, steps: next }] : rest;
          const r = await saveClockPlan(info.date, all);
          if (r && 'error' in r && r.error) return r.error;
          setPlan(r && 'plan' in r && r.plan ? r.plan : all);
          setEditing(false);
          return '';
        }}
      />
    );
  }

  return (
    <div className="follow-card clock-card">
      <ClockHeading onRemote={onRemote} />

      {here && runner.view ? (
        <div className={`clock-now ${here.phase}`}>
          <div className="clock-now-title">{runner.view.title}</div>
          {runner.view.time && <div className="clock-now-time">{runner.view.time}</div>}
          <div className="clock-now-sub">
            {runner.view.sub}
            {steps.length > 1 ? ` · timer ${here.step + 1} of ${steps.length}` : ''}
          </div>
          <div className="row" style={{ gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {here.phase === 'running' && (
              <button type="button" className="btn" onClick={runner.pause}>
                Pause
              </button>
            )}
            {here.phase === 'paused' && (
              <button type="button" className="btn" onClick={runner.resume}>
                Resume
              </button>
            )}
            {(here.phase === 'running' || here.phase === 'paused') && (
              <button type="button" className="btn ghost" onClick={() => runner.start(partIndex, here.step)}>
                Restart
              </button>
            )}
            {here.phase !== 'sending' && here.step + 1 < steps.length && (
              <button type="button" className="btn ghost" onClick={() => runner.start(partIndex, here.step + 1)}>
                Next timer
              </button>
            )}
            {here.phase !== 'sending' && (
              <button type="button" className="btn ghost" onClick={runner.stop}>
                {here.phase === 'done' ? 'Clear' : 'Stop'}
              </button>
            )}
          </div>
        </div>
      ) : steps.length ? (
        <ol className="clock-steps">
          {steps.map((s, i) => (
            <li key={i}>
              <span className="grow">
                <b>{s.label || (s.type === 'countdown' ? 'Countdown' : 'Intervals')}</b>
                <span className="follow-muted"> · {describeStep(s)}</span>
              </span>
              {i === 0 && (
                <button type="button" className="btn small primary" onClick={() => setEditing(true)}>
                  Change
                </button>
              )}
              <button type="button" className="btn small go" disabled={Boolean(runner.run && runner.run.phase === 'sending')} onClick={() => runner.start(partIndex, i)}>
                Start
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div className="row between" style={{ gap: 10 }}>
          <p className="follow-muted small">No timers for this part.</p>
          <button type="button" className="btn small primary" onClick={() => setEditing(true)}>
            Add timer
          </button>
        </div>
      )}

      {elsewhere && <p className="small follow-muted">A timer from another part is running. Starting one here replaces it.</p>}
      {steps.length > 1 && (
        <label className="row small" style={{ gap: 8, marginTop: 6 }}>
          <input type="checkbox" checked={runner.auto} onChange={(e) => runner.setAuto(e.target.checked)} />
          Run these back to back
        </label>
      )}
      {runner.error && (
        <p className="small" role="alert" style={{ color: 'var(--red, #b42318)' }}>
          {runner.error}
        </p>
      )}
    </div>
  );
}

/** Edit one part's timers. */
function StepEditor({ steps: start, part, onSave, onCancel }: { steps: ClockStep[]; part: Part; onSave: (s: ClockStep[]) => Promise<string>; onCancel: () => void }) {
  const [steps, setSteps] = useState<ClockStep[]>(start);
  const [error, setError] = useState('');
  const [saving, startSave] = useTransition();
  const set = (i: number, s: ClockStep) => setSteps((l) => l.map((x, j) => (j === i ? s : x)));
  const fallback = part.minutes ? part.minutes * 60 : 600;

  return (
    <div className="follow-card clock-card stack tight">
      <div className="follow-eyebrow">Timers for {part.label}</div>
      {steps.map((s, i) => (
        <div key={i} className="clock-edit">
          <div className="row" style={{ gap: 6 }}>
            <div className="segmented grow" role="group" aria-label="Kind of timer" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <button type="button" aria-pressed={s.type === 'countdown'} onClick={() => set(i, { type: 'countdown', label: s.label, seconds: s.type === 'countdown' ? s.seconds : stepSeconds(s) })}>
                Countdown
              </button>
              <button
                type="button"
                aria-pressed={s.type === 'intervals'}
                onClick={() => set(i, s.type === 'intervals' ? s : { type: 'intervals', label: s.label, rounds: 8, work: 40, rest: 20 })}
              >
                Intervals
              </button>
            </div>
            <button type="button" className="btn small ghost" aria-label="Remove this timer" onClick={() => setSteps((l) => l.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
          <input className="input" placeholder="Name (e.g. AMRAP)" value={s.label} maxLength={60} onChange={(e) => set(i, { ...s, label: e.target.value })} />
          {s.type === 'countdown' ? (
            <TimeField label="Time" seconds={s.seconds} onChange={(v) => set(i, { ...s, seconds: v })} />
          ) : (
            <div className="clock-edit-grid">
              <label>
                <span>Rounds</span>
                <input
                  className="input"
                  inputMode="numeric"
                  value={s.rounds}
                  onChange={(e) => set(i, { ...s, rounds: Math.min(99, Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0)) })}
                />
              </label>
              <TimeField label="Work" seconds={s.work} onChange={(v) => set(i, { ...s, work: v })} />
              <TimeField label="Rest" seconds={s.rest} onChange={(v) => set(i, { ...s, rest: v })} allowZero />
            </div>
          )}
        </div>
      ))}
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        <button type="button" className="btn small ghost" onClick={() => setSteps((l) => [...l, { type: 'countdown', label: '', seconds: fallback }])}>
          + Countdown
        </button>
        <button type="button" className="btn small ghost" onClick={() => setSteps((l) => [...l, { type: 'intervals', label: '', rounds: 8, work: 40, rest: 20 }])}>
          + Intervals
        </button>
      </div>
      <p className="small follow-muted">Type times like a microwave: 1200 is 12:00, 45 is 0:45. More than one timer runs back to back.</p>
      {error && (
        <p className="small" role="alert">
          {error}
        </p>
      )}
      <div className="row" style={{ gap: 6 }}>
        <button
          type="button"
          className="btn primary grow"
          disabled={saving}
          onClick={() =>
            startSave(async () => {
              const bad = steps.find((s) => (s.type === 'countdown' ? s.seconds < 5 : s.rounds < 1 || s.work < 5));
              if (bad) return setError('Each timer needs a time (and rounds for intervals).');
              setError(await onSave(steps));
            })
          }
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn ghost" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/** A time on the number pad, typed like a microwave timer: 1, 2, 0, 0 shows 12:00. */
function TimeField({ label, seconds, onChange, allowZero = false }: { label: string; seconds: number; onChange: (s: number) => void; allowZero?: boolean }) {
  const toDigits = (sec: number) => String(Math.floor(sec / 60) * 100 + (sec % 60));
  const [digits, setDigits] = useState(toDigits(seconds));
  const [bad, setBad] = useState(false);
  useEffect(() => setDigits(toDigits(seconds)), [seconds]);
  const shown = digits ? `${digits.slice(0, -2) || '0'}:${digits.slice(-2).padStart(2, '0')}` : '';
  return (
    <label>
      <span>{label}</span>
      <input
        className="input"
        inputMode="numeric"
        pattern="[0-9:]*"
        enterKeyHint="done"
        autoComplete="off"
        value={shown}
        placeholder="0:00"
        aria-invalid={bad}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 4))}
        onBlur={() => {
          const v = digitsToSeconds(digits);
          if ((!allowZero && v < 5) || (!digits && !allowZero)) {
            setBad(true);
            setDigits(toDigits(seconds));
          } else {
            setBad(false);
            onChange(v);
            setDigits(toDigits(v));
          }
        }}
      />
    </label>
  );
}

// ---------------------------------------------------------------
// Before class: the day's timers at a glance, and "Claude, set the timers"
// ---------------------------------------------------------------

export function ClockOverview({ info, parts, plan, setPlan, onRemote }: { info: ClockInfo; parts: Part[]; plan: ClockPlan; setPlan: (p: ClockPlan) => void; onRemote: () => void }) {
  const [busy, start] = useTransition();
  const [error, setError] = useState('');
  const withTimers = plan.filter((p) => p.steps.length && parts[p.part]);
  return (
    <div className="follow-card clock-card">
      <ClockHeading onRemote={onRemote} />
      {withTimers.length ? (
        <ul className="clock-overview">
          {withTimers.map((p) => (
            <li key={p.part}>
              <b>{parts[p.part].label}</b>
              <span className="follow-muted"> · {p.steps.map(describeStep).join(', then ')}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="follow-muted small">No timers set for today yet.</p>
      )}
      <p className="small follow-muted" style={{ marginTop: 6 }}>
        Start each part’s timers from its screen. You can change them there too.
      </p>
      {info.canDraft && (
        <button
          type="button"
          className="btn small ghost"
          style={{ marginTop: 8 }}
          disabled={busy}
          onClick={() =>
            start(async () => {
              setError('');
              const r = await draftClockTimers(info.date);
              if (r && 'error' in r && r.error) setError(r.error);
              else if (r && 'plan' in r && r.plan) setPlan(r.plan);
            })
          }
        >
          {busy ? 'Claude is reading the workout…' : withTimers.length ? 'Have Claude redo the timers' : 'Have Claude set the timers'}
        </button>
      )}
      {error && (
        <p className="small" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** "Gym clock" with the manual remote right beside it. */
function ClockHeading({ onRemote }: { onRemote: () => void }) {
  return (
    <div className="row" style={{ gap: 10, alignItems: 'center' }}>
      <div className="follow-eyebrow" style={{ margin: 0 }}>
        Gym clock
      </div>
      <button type="button" className="clock-remote-chip" onClick={onRemote}>
        Manual remote
      </button>
    </div>
  );
}

/** The whole remote, for going manual. */
export function RemoteSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="clock-sheet" role="dialog" aria-modal="true" aria-label="Clock remote">
      <div className="clock-sheet-inner">
        <div className="row between">
          <div>
            <h2 className="follow-h" style={{ fontSize: 22 }}>
              Manual remote
            </h2>
            <p className="small follow-muted" style={{ margin: 0 }}>
              Same buttons as the real clock remote.
            </p>
          </div>
          <button type="button" className="follow-x" onClick={onClose} aria-label="Close remote">
            ✕
          </button>
        </div>
        <ClockRemote rows={CLOCK_BUTTONS} ready />
      </div>
    </div>
  );
}

/** A thin line under the header while a timer runs, so it's visible from any screen. */
export function ClockNowBar({ runner, parts, onGo }: { runner: ClockRunner; parts: Part[]; onGo: (part: number) => void }) {
  if (!runner.run || !runner.view || runner.run.phase === 'done') return null;
  return (
    <button type="button" className="clock-bar" onClick={() => onGo(runner.run!.part)}>
      <span>{parts[runner.run.part]?.label} · {runner.view.title}</span>
      <b>{runner.view.time}</b>
    </button>
  );
}
