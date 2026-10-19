'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LEVELS, type Level, type Part } from '@/lib/types';
import { notesByPart, splitCoachNotes, type CoachNoteSection } from '@/lib/coach-notes';
import { PartBody, partWords } from './PartText';
import { YourNumbers } from './YourNumbers';
import { QuickLog, type QuickLogContext } from './QuickLog';

export interface CoachInfo {
  notes: string | null;
  going: string[];
}

const SIZES = [17, 20, 24, 28];

/**
 * Full-screen, one-part-at-a-time view for the gym, like a recipe's cooking mode.
 * Members follow their level with big text and their own numbers; coaches (mode "coach")
 * see every level side by side plus the coach notes for each part. The screen stays awake.
 */
export function FollowMode({
  mode,
  title,
  parts,
  level: startLevel,
  outside: startOutside,
  maxes,
  ctx,
  coach,
  onClose,
}: {
  mode: 'member' | 'coach';
  title: string;
  parts: Part[];
  level: Level;
  outside: boolean;
  maxes: Record<string, number>;
  ctx: QuickLogContext;
  coach?: CoachInfo;
  onClose: () => void;
}) {
  const isCoach = mode === 'coach';
  const [level, setLevel] = useState<Level>(startLevel);
  const [outside, setOutside] = useState(startOutside);
  const [size, setSize] = useState(() => {
    try {
      return Number(localStorage.getItem('follow-size') ?? 1) || 1;
    } catch {
      return 1;
    }
  });
  const sections = splitCoachNotes(coach?.notes ?? '');
  const { perPart, general } = notesByPart(sections, parts);
  // Coaches get a "before class" screen first; everyone gets a wrap-up at the end.
  const screens = [...(isCoach ? ['intro' as const] : []), ...parts.map((_, i) => i), 'done' as const];
  const [at, setAt] = useState(0);
  const screen = screens[at];
  const go = useCallback((d: number) => setAt((a) => Math.max(0, Math.min(screens.length - 1, a + d))), [screens.length]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [at]);

  useEffect(() => {
    try {
      localStorage.setItem('follow-size', String(size));
    } catch {}
  }, [size]);

  // Keep the screen on, and stop the page behind from scrolling.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const ask = async () => {
      try {
        const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
        if (wl && document.visibilityState === 'visible') lock = await wl.request('screen');
      } catch {}
    };
    ask();
    const again = () => document.visibilityState === 'visible' && ask();
    document.addEventListener('visibilitychange', again);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('visibilitychange', again);
      document.body.style.overflow = overflow;
      lock?.release().catch(() => {});
    };
  }, []);

  // Arrow keys and Escape on a laptop or tablet keyboard.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [go, onClose]);

  // Swipe left and right between parts.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea, select, button, .timer')) return;
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = touch.current;
    touch.current = null;
    if (!t) return;
    const dx = e.changedTouches[0].clientX - t.x;
    const dy = e.changedTouches[0].clientY - t.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  };

  const part = typeof screen === 'number' ? parts[screen] : null;
  const hasOutdoor = parts.some((p) => p.outdoor);

  return (
    <div className={`follow ${isCoach ? 'coach' : ''}`} role="dialog" aria-modal="true" aria-label={isCoach ? 'Coach mode' : 'Workout mode'} style={{ ['--follow-size' as string]: `${SIZES[size]}px` }}>
      <header className="follow-top">
        <button type="button" className="follow-x" onClick={onClose} aria-label="Leave">
          ✕
        </button>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="follow-mode">{isCoach ? 'Coach mode' : 'Workout mode'}</div>
          <div className="follow-title">{title}</div>
        </div>
        <div className="follow-size" role="group" aria-label="Text size">
          <button type="button" onClick={() => setSize((s) => Math.max(0, s - 1))} disabled={size === 0} aria-label="Smaller text">
            A−
          </button>
          <button type="button" onClick={() => setSize((s) => Math.min(SIZES.length - 1, s + 1))} disabled={size === SIZES.length - 1} aria-label="Bigger text">
            A+
          </button>
        </div>
      </header>

      <nav className="follow-steps" aria-label="Parts">
        {screens.map((s, i) => (
          <button
            key={i}
            type="button"
            aria-current={i === at ? 'step' : undefined}
            className={i < at ? 'done' : ''}
            onClick={() => setAt(i)}
            aria-label={s === 'intro' ? 'Before class' : s === 'done' ? 'Wrap up' : parts[s].label || parts[s].title}
          >
            <span>{s === 'intro' ? 'Start' : s === 'done' ? 'End' : parts[s].label.split(' · ')[0] || parts[s].kind}</span>
          </button>
        ))}
      </nav>

      <div className="follow-body" ref={scroller} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {(!isCoach || hasOutdoor) && (screen === 'intro' || part) && (
          <div className="follow-controls">
            {!isCoach && (
              <div className="segmented" role="group" aria-label="Level">
                {LEVELS.map((l) => (
                  <button key={l.n} type="button" aria-pressed={level === l.n} onClick={() => setLevel(l.n)}>
                    {l.name}
                  </button>
                ))}
              </div>
            )}
            {hasOutdoor && (
              <div className="segmented" role="group" aria-label="Inside or outside" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <button type="button" aria-pressed={!outside} onClick={() => setOutside(false)}>
                  Inside
                </button>
                <button type="button" aria-pressed={outside} onClick={() => setOutside(true)}>
                  Outside
                </button>
              </div>
            )}
          </div>
        )}

        {screen === 'intro' && (
          <section className="stack loose">
            <h2 className="follow-h">Before class</h2>
            <div className="follow-card">
              <div className="follow-eyebrow">Coming today · {coach?.going.length ?? 0}</div>
              <p>{coach?.going.length ? coach.going.join(', ') : 'Nobody has tapped “I’m coming” yet.'}</p>
            </div>
            <div className="follow-card">
              <div className="follow-eyebrow">The plan</div>
              <ol className="follow-plan">
                {parts.map((p, i) => (
                  <li key={i}>
                    <b>{p.label}</b>
                    {p.title && p.title !== p.label ? ` · ${partWords(p, 2, outside).title}` : ''}
                    {p.minutes ? <span className="follow-muted"> · {p.minutes} min</span> : null}
                  </li>
                ))}
              </ol>
            </div>
            <NoteList sections={general} heading="Coach notes for the whole class" />
          </section>
        )}

        {part && (
          <PartScreen
            part={part}
            index={screen as number}
            isCoach={isCoach}
            level={level}
            outside={outside}
            maxes={maxes}
            ctx={ctx}
            notes={perPart[screen as number]}
          />
        )}

        {screen === 'done' && (
          <section className="stack loose" style={{ textAlign: 'center', paddingTop: 24 }}>
            <div style={{ fontSize: 54 }} aria-hidden="true">
              🎉
            </div>
            <h2 className="follow-h">{isCoach ? 'Class done' : 'Nice work'}</h2>
            <p className="follow-muted">
              {isCoach
                ? 'Remind everyone to log their lifts and any benchmark results.'
                : ctx.classDate <= ctx.today
                  ? 'Log your lifts and results on the parts that have a log button, or on My lifts.'
                  : 'See you at 9.'}
            </p>
            <button type="button" className="btn primary big" onClick={onClose}>
              Back to the workout
            </button>
          </section>
        )}
      </div>

      <footer className="follow-nav">
        <button type="button" className="btn ghost big" onClick={() => go(-1)} disabled={at === 0}>
          ← Back
        </button>
        <span className="follow-count">
          {at + 1} / {screens.length}
        </span>
        <button type="button" className="btn primary big" onClick={() => (at === screens.length - 1 ? onClose() : go(1))}>
          {at === screens.length - 1 ? 'Finish' : 'Next →'}
        </button>
      </footer>
    </div>
  );
}

function PartScreen({
  part,
  index,
  isCoach,
  level,
  outside,
  maxes,
  ctx,
  notes,
}: {
  part: Part;
  index: number;
  isCoach: boolean;
  level: Level;
  outside: boolean;
  maxes: Record<string, number>;
  ctx: QuickLogContext;
  notes: CoachNoteSection[];
}) {
  const shown = partWords(part, level - 1, outside);
  return (
    <section className="stack loose" key={index}>
      <div>
        <div className="follow-eyebrow">
          {part.label}
          {shown.useOutdoor ? ' · outside' : ''}
          {part.minutes ? ` · ${part.minutes} min` : ''}
        </div>
        <h2 className="follow-h">{isCoach ? shown.title || part.label : shown.headline || shown.title || part.label}</h2>
      </div>

      {part.minutes ? <Timer minutes={part.minutes} key={`t${index}`} /> : null}

      {isCoach ? (
        <>
          <NoteList sections={notes} heading="Coach notes" />
          <div className="follow-levels">
            {LEVELS.map((l) => {
              const w = partWords(part, l.n - 1, outside);
              return (
                <div key={l.n} className="follow-level">
                  <div className="follow-level-name">{l.name}</div>
                  <div>
                    {w.headline && part.kind !== 'conditioning' && <p className="follow-strong">{w.headline}</p>}
                    <PartBody body={w.body} className="part-body follow-text" />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <PartBody body={shown.body} className="part-body follow-text" />
          {part.lift && <YourNumbers part={shown.useOutdoor ? { ...part, versions: shown.versions } : part} level={level} maxes={maxes} />}
          <QuickLog part={part} level={level} outside={outside} ctx={ctx} big />
        </>
      )}
    </section>
  );
}

function NoteList({ sections, heading }: { sections: CoachNoteSection[]; heading: string }) {
  if (!sections.length) return null;
  return (
    <div className="follow-card follow-notes">
      <div className="follow-eyebrow">{heading}</div>
      <dl>
        {sections.map((s, i) => (
          <div key={i}>
            <dt>{s.label}</dt>
            <dd className="pre">{s.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A simple countdown for a part's minutes. Buzzes and beeps at zero. */
function Timer({ minutes }: { minutes: number }) {
  const total = minutes * 60;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const endAt = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const rest = Math.max(0, Math.round(((endAt.current ?? 0) - Date.now()) / 1000));
      setLeft(rest);
      if (rest === 0) {
        setRunning(false);
        try {
          navigator.vibrate?.([300, 150, 300]);
          const ac = new AudioContext();
          const o = ac.createOscillator();
          o.frequency.value = 880;
          o.connect(ac.destination);
          o.start();
          o.stop(ac.currentTime + 0.6);
        } catch {}
      }
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');
  return (
    <div className={`timer ${left === 0 ? 'zero' : ''}`}>
      <div className="timer-digits" aria-live="off">
        {mm}:{ss}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (running) {
              setRunning(false);
            } else {
              endAt.current = Date.now() + (left || total) * 1000;
              if (!left) setLeft(total);
              setRunning(true);
            }
          }}
        >
          {running ? 'Pause' : left === total ? `Start ${minutes} min` : left === 0 ? 'Again' : 'Resume'}
        </button>
        {left !== total && !running && (
          <button type="button" className="btn ghost" onClick={() => setLeft(total)}>
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
