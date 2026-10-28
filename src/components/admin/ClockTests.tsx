'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { pressClockSequence, recordClockFinding } from '@/app/actions';
import type { ClockTest } from '@/lib/clock-tests';

const LABEL: Record<string, string> = { Star: '*', Hash: '#', Up: '↑', Down: '↓', Left: '←', Right: '→' };
type Finding = { result: 'yes' | 'no'; note: string; by?: string; at?: string };

/** One card per test: send the buttons, watch the clock, mark what happened. */
export function ClockTests({ tests, findings, ready }: { tests: ClockTest[]; findings: Record<string, Finding>; ready: boolean }) {
  return (
    <div className="stack tight">
      {tests.map((t, i) => (
        <TestCard key={t.id} n={i + 1} test={t} finding={findings[t.id]} ready={ready} />
      ))}
    </div>
  );
}

function TestCard({ n, test, finding, ready }: { n: number; test: ClockTest; finding?: Finding; ready: boolean }) {
  const [sending, startSend] = useTransition();
  const [saving, startSave] = useTransition();
  const [status, setStatus] = useState('');
  const [note, setNote] = useState(finding?.note ?? '');
  const router = useRouter();

  function send() {
    setStatus('');
    startSend(async () => {
      const r = await pressClockSequence(test.buttons, `test ${test.id}`);
      setStatus(r && 'error' in r && r.error ? r.error : 'Sent. Watch the clock.');
    });
  }
  function mark(result: 'yes' | 'no') {
    startSave(async () => {
      const r = await recordClockFinding(test.id, result, note);
      if (r && 'error' in r && r.error) setStatus(r.error);
      else router.refresh();
    });
  }

  return (
    <div className={`card stack tight clock-test ${finding ? `done ${finding.result}` : ''}`}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <b>
          {n}. {test.title}
        </b>
        {finding && <span className={`badge ${finding.result === 'yes' ? 'gold' : 'soft'}`}>{finding.result === 'yes' ? '✓ Yes' : '✗ No'}</span>}
      </div>
      <div className="clock-seq">
        {test.buttons.map((b, i) => (
          <span key={i}>{LABEL[b] ?? b}</span>
        ))}
      </div>
      <p className="small">{test.look}</p>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        <button type="button" className="btn small primary" disabled={!ready || sending} onClick={send}>
          {sending ? 'Sending…' : 'Send'}
        </button>
        {test.buttons[0] !== 'Exit' || test.buttons.length > 1 ? (
          <button type="button" className="btn small ghost" disabled={!ready || sending} onClick={() => startSend(async () => void (await pressClockSequence(['Exit'])))}>
            Exit
          </button>
        ) : null}
        <span className="grow" />
        <button type="button" className="btn small ghost" disabled={saving} onClick={() => mark('yes')}>
          ✓ Yes
        </button>
        <button type="button" className="btn small ghost" disabled={saving} onClick={() => mark('no')}>
          ✗ No
        </button>
      </div>
      <input type="text" placeholder="What did the clock show? (optional)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
      {status && (
        <p className="small muted" role="status">
          {status}
        </p>
      )}
      {finding?.by && <p className="small muted">Marked by {finding.by}</p>}
    </div>
  );
}
