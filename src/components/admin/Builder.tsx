'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveWorkout, deleteWorkout } from '@/app/actions';
import { suggestWorkout, conditioningOptions, liftPart, liftPct, type Schedule } from '@/lib/programming/engine';
import { LiftEditor } from './LiftEditor';
import { AskClaude } from './AskClaude';
import { LEVELS, type Level, type Part, type WorkoutDraft, type LevelText, type LiftSpec } from '@/lib/types';
import { Icon } from '../Icon';
import { COACH_NOTES_MAX } from '@/lib/coach-notes';
import type { WeatherCall } from '@/lib/weather-rules';

interface Saved extends WorkoutDraft {
  status: 'draft' | 'published';
}

const BLANK: Part[] = [
  { kind: 'warmup', label: 'Warm-up', title: 'Warm-up', minutes: 10, versions: ['', '', '', ''] },
  { kind: 'strength', label: 'Strength', ...liftPart({ movement: 'Back squat', gentleMovement: 'Goblet squat', mode: 'percent', sets: 5, reps: 5, pct: liftPct(75) }) },
  { kind: 'conditioning', label: 'Conditioning', title: '', minutes: 15, versions: ['', '', '', ''] },
  { kind: 'cooldown', label: 'Cool-down', title: 'Cool-down', minutes: 5, versions: ['', '', '', ''] },
];

export function Builder({
  date,
  schedule,
  saved,
  weather,
  movements,
  aiOn,
  savedNotes,
  benchmarks = [],
}: {
  date: string;
  schedule: Schedule;
  saved: Saved | null;
  weather: WeatherCall | null;
  movements: string[];
  aiOn: boolean;
  savedNotes: string;
  benchmarks?: string[];
}) {
  const router = useRouter();
  const suggest = (swap: number, adjust: number) => suggestWorkout({ date, schedule, swap, adjust });

  const [swap, setSwap] = useState(0);
  const [draft, setDraft] = useState<WorkoutDraft>(() => saved ?? suggest(0, 0));
  const [status, setStatus] = useState<'new' | 'draft' | 'published'>(saved?.status ?? 'new');
  const [preview, setPreview] = useState<Level>(3);
  const [previewOutside, setPreviewOutside] = useState(Boolean(weather?.outside));
  const [editing, setEditing] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, run] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [notes, setNotes] = useState(savedNotes);
  const [lastSavedNotes, setLastSavedNotes] = useState(savedNotes);

  const optionCount = conditioningOptions(date, schedule).length;
  const update = (d: WorkoutDraft) => {
    setDraft(d);
    setDirty(true);
    setMsg(null);
  };
  const setPart = (i: number, p: Part) => update({ ...draft, parts: draft.parts.map((x, j) => (j === i ? p : x)) });

  function replaceFromSuggestion(kind: Part['kind'], s: number, a: number) {
    const fresh = suggest(s, a);
    const part = fresh.parts.find((p) => p.kind === kind);
    if (!part) return;
    const i = draft.parts.findIndex((p) => p.kind === kind);
    const parts = i >= 0 ? draft.parts.map((p, j) => (j === i ? part : p)) : [...draft.parts, part];
    const condTitle = (kind === 'conditioning' ? part : parts.find((p) => p.kind === 'conditioning'))?.title;
    update({ ...draft, parts, why: fresh.why, title: kind === 'conditioning' && condTitle ? fresh.title : draft.title });
  }

  function doSwap() {
    const s = swap + 1;
    setSwap(s);
    replaceFromSuggestion('conditioning', s, 0);
  }
  /** Heavier or lighter for every level of this lift, keeping its own movement and sets. */
  function doAdjust(i: number, delta: number) {
    const p = draft.parts[i];
    if (!p.lift) return;
    const pct = p.lift.pct.map((x) => (x == null ? null : Math.max(40, Math.min(100, x + delta)))) as LiftSpec['pct'];
    setPart(i, { ...p, ...liftPart({ ...p.lift, pct }) });
  }

  function save(next: 'draft' | 'published') {
    run(async () => {
      const r = await saveWorkout({
        ...draft,
        class_date: date,
        status: next,
        coach_notes: notes !== lastSavedNotes ? notes : undefined,
      });
      if (r?.error) {
        setMsg({ error: r.error });
        if (r.saved) {
          // The workout is saved; only the notes failed, so keep dirty on.
          setStatus(next);
          router.refresh();
        }
      } else {
        setStatus(next);
        setLastSavedNotes(notes);
        setDirty(false);
        setMsg({ ok: next === 'published' ? 'Published. The crew can see it now.' : 'Saved as a draft. Only admins can see it.' });
        router.refresh();
      }
    });
  }

  const idx = preview - 1;
  const hasSuggestedLift = draft.parts.some((p) => p.kind === 'strength' && p.lift);
  const hasConditioning = draft.parts.some((p) => p.kind === 'conditioning');
  const hasOutdoor = draft.parts.some((p) => p.outdoor);

  return (
    <div className="stack loose">
      {status === 'new' && (
        <div className="notice bad" role="note">
          <b>Not saved yet.</b> This is {dirty ? 'your work in progress' : 'a suggestion from the plan'}. Nothing is saved, and the crew won’t see it, until you tap <b>Save draft</b> or <b>Publish to crew</b>.
        </div>
      )}
      {aiOn && (
        <AskClaude
          date={date}
          current={draft}
          onDraft={(d) => {
            setEditing(null);
            update(d);
          }}
        />
      )}
      {draft.why && <div className="card teal small">{draft.why}</div>}

      <div className="card stack tight">
        <div className="eyebrow">Coach notes · admins only</div>
        <textarea
          value={notes}
          rows={4}
          maxLength={COACH_NOTES_MAX}
          placeholder="Class logistics for coaches: waves, set-up, who records what."
          onChange={(e) => {
            setNotes(e.target.value);
            setDirty(true);
            setMsg(null);
          }}
        />
        <div className="muted small">Members never see these.</div>
      </div>

      <div className={`card small stack tight ${weather?.outside ? 'gold' : ''}`}>
        <b>Weather at 9 AM</b>
        {weather ? (
          <span>
            {weather.headline}. {weather.detail}.
          </span>
        ) : (
          <span className="muted">No forecast yet (it appears about two weeks ahead). Give the conditioning an outside version and the app picks inside or outside on the day.</span>
        )}
      </div>

      <label className="field">
        Workout name
        <input type="text" value={draft.title} maxLength={80} onChange={(e) => update({ ...draft, title: e.target.value })} />
      </label>

      <div className="stack tight">
        <div className="eyebrow">Preview level</div>
        <div className="segmented" role="group" aria-label="Preview level">
          {LEVELS.map((l) => (
            <button key={l.n} type="button" aria-pressed={preview === l.n} onClick={() => setPreview(l.n)}>
              {l.name}
            </button>
          ))}
        </div>
        {hasOutdoor && (
          <div className="segmented" role="group" aria-label="Preview inside or outside" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', marginTop: 6 }}>
            <button type="button" aria-pressed={!previewOutside} onClick={() => setPreviewOutside(false)}>
              Inside
            </button>
            <button type="button" aria-pressed={previewOutside} onClick={() => setPreviewOutside(true)}>
              Outside
            </button>
          </div>
        )}
      </div>

      {draft.parts.map((p, i) => {
        const showOut = previewOutside && p.outdoor;
        const shownTitle = showOut ? p.outdoor!.title : p.title;
        const shownText = (showOut ? p.outdoor!.versions : p.versions)[idx];
        return (
        <section key={i} className={`card stack ${p.kind === 'strength' ? 'outline-gold' : ''}`}>
          <div className="row between">
            <div className="eyebrow">
              {p.label}
              {p.minutes ? ` · ${p.minutes} min` : ''}
              {showOut ? ' · outside' : p.outdoor ? ' · has outside version' : ''}
            </div>
            <div className="row" style={{ gap: 6 }}>
              {p.kind === 'conditioning' && optionCount > 1 && (
                <button type="button" className="btn small" onClick={doSwap}>
                  <Icon name="swap" size={16} /> Swap
                </button>
              )}
              <button type="button" className="btn small ghost" onClick={() => setEditing(editing === i ? null : i)} aria-expanded={editing === i}>
                {editing === i ? 'Done' : 'Edit'}
              </button>
            </div>
          </div>

          {p.kind === 'conditioning' && shownTitle && <h3>{shownTitle}</h3>}
          <p className="pre">{shownText || <span className="muted">Nothing written for {LEVELS[idx].name} yet.</span>}</p>

          {p.kind === 'strength' && p.lift && p.lift.mode !== 'build' && p.lift.pct[2] != null && (
            <div className="row">
              <button type="button" className="btn ghost" onClick={() => doAdjust(i, -5)} aria-label="Lighter" style={{ width: 48, padding: 0, fontSize: 22 }}>
                −
              </button>
              <span className="grow center small">
                Strong at {p.lift.pct[2]}%{p.lift.pct[1] != null ? ` · Steady ${p.lift.pct[1]}%` : ''}{p.lift.pct[3] != null ? ` · Full ${p.lift.pct[3]}%` : ''}
              </span>
              <button type="button" className="btn ghost" onClick={() => doAdjust(i, 5)} aria-label="Heavier" style={{ width: 48, padding: 0, fontSize: 22 }}>
                +
              </button>
            </div>
          )}
          {p.kind === 'strength' && p.lift && (
            <p className="muted small">Each member sees their own weight, worked out from their logged {p.lift.movement.toLowerCase()}.</p>
          )}

          {editing === i && <PartEditor part={p} movements={movements} benchmarks={benchmarks} onChange={(np) => setPart(i, np)} onRemove={() => { update({ ...draft, parts: draft.parts.filter((_, j) => j !== i) }); setEditing(null); }} />}
        </section>
        );
      })}

      <div className="row wrap">
        <button
          type="button"
          className="btn ghost small"
          onClick={() => {
            setSwap(0);
            update(suggest(0, 0));
          }}
        >
          Start over from suggestion
        </button>
        <button type="button" className="btn ghost small" onClick={() => update({ class_date: date, title: '', focus: draft.focus, why: '', parts: BLANK.map((p) => ({ ...p, versions: [...p.versions] as LevelText })) })}>
          Write my own
        </button>
        {!hasConditioning && (
          <button type="button" className="btn ghost small" onClick={() => replaceFromSuggestion('conditioning', swap, 0)}>
            + Suggested conditioning
          </button>
        )}
        {!hasSuggestedLift && suggest(0, 0).parts.some((p) => p.kind === 'strength') && (
          <button type="button" className="btn ghost small" onClick={() => replaceFromSuggestion('strength', swap, 0)}>
            Use suggested strength
          </button>
        )}
      </div>

      {msg?.error && <div className="notice bad" role="alert">{msg.error}</div>}
      {msg?.ok && <div className="notice good" role="status">{msg.ok}</div>}

      <div className="row" style={{ position: 'sticky', bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 8px)', background: 'var(--ground)', padding: '8px 0' }}>
        <button type="button" className="btn outline big" disabled={pending} onClick={() => save('draft')}>
          {status === 'published' ? 'Unpublish' : 'Save draft'}
        </button>
        <button type="button" className="btn primary big grow" disabled={pending || (status === 'published' && !dirty)} onClick={() => save('published')}>
          {pending ? 'Saving…' : status === 'published' ? (dirty ? 'Update for crew' : 'Published') : 'Publish to crew'}
        </button>
      </div>

      {status !== 'new' && (
        <form
          action={deleteWorkout.bind(null, date)}
          onSubmit={(e) => {
            if (!confirm('Delete this workout?')) e.preventDefault();
          }}
        >
          <button className="btn danger block">Delete workout</button>
        </form>
      )}
    </div>
  );
}

function BenchmarkPicker({ part, benchmarks, onChange }: { part: Part; benchmarks: string[]; onChange: (p: Part) => void }) {
  if (!benchmarks.length) return null;
  return (
    <div className="row fields">
      <label className="field grow">
        Benchmark (members can log a result)
        <select value={part.benchmark ?? ''} onChange={(e) => onChange({ ...part, benchmark: e.target.value || undefined })}>
          <option value="">Not a benchmark</option>
          {benchmarks.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </label>
      {part.outdoor && (
        <label className="field grow">
          Outside version
          <select
            value={part.outdoor.benchmark ?? ''}
            onChange={(e) => onChange({ ...part, outdoor: { ...part.outdoor!, benchmark: e.target.value || undefined } })}
          >
            <option value="">Same as inside</option>
            {benchmarks.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

function PartEditor({ part, movements, benchmarks, onChange, onRemove }: { part: Part; movements: string[]; benchmarks: string[]; onChange: (p: Part) => void; onRemove: () => void }) {
  const setVersion = (i: number, v: string) => onChange({ ...part, versions: part.versions.map((x, j) => (j === i ? v : x)) as LevelText });
  if (part.lift) {
    const lift = part.lift;
    return (
      <div className="stack" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <LiftEditor spec={lift} movements={movements} onChange={(spec) => onChange({ ...part, ...liftPart(spec) })} />
        <label className="field" style={{ width: 120 }}>
          Minutes
          <input type="number" min={1} max={119} value={part.minutes ?? ''} onChange={(e) => onChange({ ...part, minutes: e.target.value ? Number(e.target.value) : undefined })} />
        </label>
        <div className="row wrap">
          <button
            type="button"
            className="btn small ghost"
            onClick={() => {
              if (confirm('Write the text yourself instead? Members won’t see their own weights for this part.')) onChange({ ...part, lift: undefined });
            }}
          >
            Write the text myself instead
          </button>
          <button type="button" className="btn small danger" onClick={onRemove}>
            Remove this part
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="stack" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
      <div className="row fields">
        <label className="field grow">
          Heading
          <input type="text" value={part.title} maxLength={80} onChange={(e) => onChange({ ...part, title: e.target.value })} />
        </label>
        <label className="field" style={{ width: 96 }}>
          Minutes
          <input
            type="number"
            min={1}
            max={119}
            value={part.minutes ?? ''}
            onChange={(e) => onChange({ ...part, minutes: e.target.value ? Number(e.target.value) : undefined })}
          />
        </label>
      </div>
      {LEVELS.map((l, i) => (
        <label key={l.n} className="field">
          {l.name}
          <textarea value={part.versions[i]} rows={3} onChange={(e) => setVersion(i, e.target.value)} />
        </label>
      ))}
      <div className="stack" style={{ borderTop: '1px dashed var(--line-2)', paddingTop: 12 }}>
        {part.outdoor ? (
          <>
            <div className="eyebrow">Outside version (used when the weather is good)</div>
            <label className="field">
              Outside heading
              <input type="text" value={part.outdoor.title} maxLength={80} onChange={(e) => onChange({ ...part, outdoor: { ...part.outdoor!, title: e.target.value } })} />
            </label>
            {LEVELS.map((l, i) => (
              <label key={l.n} className="field">
                {l.name}, outside
                <textarea
                  value={part.outdoor!.versions[i]}
                  rows={3}
                  onChange={(e) =>
                    onChange({ ...part, outdoor: { ...part.outdoor!, versions: part.outdoor!.versions.map((x, j) => (j === i ? e.target.value : x)) as LevelText } })
                  }
                />
              </label>
            ))}
            <button type="button" className="btn small danger" style={{ alignSelf: 'flex-start' }} onClick={() => onChange({ ...part, outdoor: undefined })}>
              Remove outside version
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn small ghost"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => onChange({ ...part, outdoor: { title: part.title ? `${part.title}, outside` : 'Outside', versions: [...part.versions] as LevelText } })}
          >
            + Add an outside version
          </button>
        )}
      </div>
      {(part.kind === 'conditioning' || part.kind === 'skill') && <BenchmarkPicker part={part} benchmarks={benchmarks} onChange={onChange} />}
      {part.kind === 'strength' && (
        <button
          type="button"
          className="btn small"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => onChange({ ...part, ...liftPart({ movement: 'Back squat', gentleMovement: 'Goblet squat', mode: 'percent', sets: 5, reps: 5, pct: liftPct(75) }) })}
        >
          Set this up as a tracked lift
        </button>
      )}
      <div className="row wrap">
        <button type="button" className="btn small ghost" onClick={() => onChange({ ...part, versions: [part.versions[2], part.versions[2], part.versions[2], part.versions[2]] })}>
          Copy Strong to all levels
        </button>
        <button type="button" className="btn small danger" onClick={onRemove}>
          Remove this part
        </button>
      </div>
    </div>
  );
}
