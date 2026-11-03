'use client';
import { useState, useTransition } from 'react';
import { coachSetAttendance } from '@/app/actions';

interface Person {
  id: string;
  name: string;
}

/** Coaches: who was at class, with a way to add someone who forgot to check in (or take out a mistake). */
export function ClassRoster({ classDate, people, attending }: { classDate: string; people: Person[]; attending: string[] }) {
  const [ids, setIds] = useState(attending);
  const [pick, setPick] = useState('');
  const [error, setError] = useState('');
  const [busy, start] = useTransition();
  const byId = Object.fromEntries(people.map((p) => [p.id, p.name]));
  const missing = people.filter((p) => !ids.includes(p.id)).sort((a, b) => a.name.localeCompare(b.name));

  const change = (uid: string, going: boolean) =>
    start(async () => {
      setError('');
      const r = await coachSetAttendance(classDate, uid, going);
      if (r && 'error' in r && r.error) return setError(r.error);
      setIds((l) => (going ? [...l, uid] : l.filter((x) => x !== uid)));
      setPick('');
    });

  return (
    <details className="card coach-notes" style={{ marginTop: 8 }}>
      <summary>
        <span className="eyebrow">
          Who was there · {ids.length} · coaches only
        </span>
      </summary>
      <ul className="roster">
        {ids.map((id) => (
          <li key={id}>
            <span className="grow">{byId[id] ?? 'Member'}</span>
            <button type="button" className="btn small ghost" disabled={busy} aria-label={`Take ${byId[id] ?? 'them'} off this class`} onClick={() => change(id, false)}>
              ✕
            </button>
          </li>
        ))}
        {!ids.length && <li className="muted small">Nobody checked in yet.</li>}
      </ul>
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <select className="input grow" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Someone who forgot to check in">
          <option value="">Add someone who forgot…</option>
          {missing.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn small primary" disabled={!pick || busy} onClick={() => change(pick, true)}>
          Add
        </button>
      </div>
      {error && (
        <p className="small" role="alert">
          {error}
        </p>
      )}
    </details>
  );
}
