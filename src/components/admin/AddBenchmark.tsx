'use client';
import { useState, useTransition } from 'react';
import { addBenchmark } from '@/app/actions';
import { SCORE_TYPES, type ScoreType } from '@/lib/benchmarks';

/** Admins: add a benchmark to the list (a named workout, a run distance...). */
export function AddBenchmark() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [score, setScore] = useState<ScoreType>('time');
  const [better, setBetter] = useState<'higher' | 'lower'>('lower');
  const [description, setDescription] = useState('');
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button type="button" className="btn ghost" onClick={() => setOpen(true)}>
        + Add a benchmark (admins)
      </button>
    );
  }
  return (
    <form
      className="card stack"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addBenchmark({ name, score, better, description });
          setMsg(r);
          if ('ok' in r) {
            setName('');
            setDescription('');
          }
        });
      }}
    >
      <h2>Add a benchmark</h2>
      <label className="field">
        Name
        <input type="text" value={name} maxLength={60} placeholder="e.g. Annie, 400 m run" onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="field">
        Scored by
        <select value={score} onChange={(e) => setScore(e.target.value as ScoreType)}>
          {SCORE_TYPES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {score === 'time' && (
        <label className="field">
          Better is
          <select value={better} onChange={(e) => setBetter(e.target.value as 'higher' | 'lower')}>
            <option value="lower">Faster (for time)</option>
            <option value="higher">Longer (holds, hangs)</option>
          </select>
        </label>
      )}
      <label className="field">
        What it is (optional)
        <textarea rows={2} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div className="row">
        <button className="btn primary grow" disabled={pending}>
          {pending ? 'Adding…' : 'Add'}
        </button>
        <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      {msg?.ok && <div className="notice good" role="status">Added.</div>}
      {msg?.error && <div className="notice bad" role="alert">{msg.error}</div>}
    </form>
  );
}
