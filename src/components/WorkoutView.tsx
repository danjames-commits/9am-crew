'use client';
import { useState, useTransition } from 'react';
import { setLevel as saveLevel } from '@/app/actions';
import { LEVELS, type Level, type Part } from '@/lib/types';
import { YourNumbers } from './YourNumbers';
import { ScaleHelper } from './ScaleHelper';
import type { WeatherCall } from '@/lib/weather-rules';
import { Icon } from './Icon';
import { PartBody, partWords } from './PartText';
import { QuickLog, type QuickLogContext } from './QuickLog';
import { FollowMode, type CoachInfo } from './FollowMode';

export function WorkoutView({
  title,
  parts,
  myLevel,
  maxes,
  weather,
  classDate,
  canScale = false,
  log,
  coach,
  checkIn,
}: {
  title: string;
  parts: Part[];
  myLevel: number;
  maxes: Record<string, number>;
  weather?: WeatherCall | null;
  classDate: string;
  canScale?: boolean;
  /** What quick logging needs: movements, benchmarks, today. */
  log: Omit<QuickLogContext, 'classDate' | 'maxes'>;
  /** Admins only: notes and who's coming, for coach mode. */
  coach?: CoachInfo;
  /** Who's coming, shown in the same card as the mode buttons. */
  checkIn?: React.ReactNode;
}) {
  const [level, setLevel] = useState<Level>(Math.min(4, Math.max(1, myLevel)) as Level);
  // Your saved level; you can make the level you're looking at your own from here.
  const [mine, setMine] = useState(myLevel);
  const [savingLevel, startSaving] = useTransition();
  const hasOutdoor = parts.some((p) => p.outdoor);
  const [outside, setOutside] = useState(Boolean(hasOutdoor && weather?.outside));
  // Every part can fold away; all start open.
  const [open, setOpen] = useState<boolean[]>(() => parts.map(() => true));
  const [mode, setMode] = useState<'member' | 'coach' | null>(null);
  const i = level - 1;
  const ctx: QuickLogContext = { ...log, classDate, maxes };
  const allOpen = open.every(Boolean);

  return (
    <div className="stack loose">
      <section className="card class-bar" aria-label="This class">
        {checkIn}
        <div className="mode-row">
          <button type="button" className="btn primary" onClick={() => setMode('member')}>
            ▶ Workout mode
          </button>
          {coach && (
            <button type="button" className="btn ghost" onClick={() => setMode('coach')}>
              Coach mode
            </button>
          )}
        </div>
      </section>

      <div className="segmented" role="group" aria-label="Level">
        {LEVELS.map((l) => (
          <button key={l.n} aria-pressed={level === l.n} onClick={() => setLevel(l.n)}>
            {l.name}
            {l.n === mine && <small>your level</small>}
          </button>
        ))}
      </div>

      {level !== mine && (
        <div className="level-switch small">
          Not your level.{' '}
          <button
            type="button"
            className="link-btn"
            disabled={savingLevel}
            onClick={() =>
              startSaving(async () => {
                const r = await saveLevel(level);
                if (r && 'ok' in r) setMine(level);
              })
            }
          >
            {savingLevel ? 'Saving…' : `Make ${LEVELS[level - 1].name} my level`}
          </button>
        </div>
      )}
      <button type="button" className="link-btn fold-all" onClick={() => setOpen(parts.map(() => !allOpen))}>
        {allOpen ? 'Collapse all' : 'Expand all'}
      </button>

      {parts.map((p, k) => {
        const w = partWords(p, i, outside);
        return (
          <details
            key={k}
            open={open[k]}
            onToggle={(e) => {
              const now = (e.currentTarget as HTMLDetailsElement).open;
              setOpen((o) => (o[k] === now ? o : o.map((x, j) => (j === k ? now : x))));
            }}
            className={`card part-fold ${p.kind === 'strength' ? 'outline-gold' : ''}`}
          >
            <summary>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row between">
                  <div className="eyebrow">
                    {p.label}
                    {w.useOutdoor ? ' · outside' : ''}
                  </div>
                  {p.minutes ? <span className="muted small">{p.minutes} min</span> : null}
                </div>
                {!open[k] && <div className="fold-peek">{w.headline || w.title || p.title}</div>}
              </div>
              <span className="chev">
                <Icon name="next" size={18} />
              </span>
            </summary>
            <div className="stack tight">
              {p.outdoor && (
                <div className="stack tight">
                  <div className="segmented" role="group" aria-label="Inside or outside" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <button aria-pressed={!outside} onClick={() => setOutside(false)}>
                      Inside
                    </button>
                    <button aria-pressed={!!outside} onClick={() => setOutside(true)}>
                      Outside
                    </button>
                  </div>
                  <p className="small" style={{ color: weather?.outside ? 'var(--teal)' : 'var(--ink-3)' }}>
                    {weather ? (
                      <>
                        <b>{weather.headline}.</b> {weather.detail} at 9 AM.
                      </>
                    ) : (
                      'The 9 AM forecast shows here a few days before.'
                    )}
                  </p>
                </div>
              )}
              {w.headline && <h3 style={{ fontSize: 20 }}>{w.headline}</h3>}
              <PartBody body={w.body} />
              {p.lift && <YourNumbers part={w.useOutdoor ? { ...p, versions: w.versions } : p} level={level} maxes={maxes} />}
              <QuickLog part={p} level={level} outside={outside} ctx={ctx} />
            </div>
          </details>
        );
      })}
      {canScale && <ScaleHelper classDate={classDate} outside={outside} />}

      {mode && (
        <FollowMode
          mode={mode}
          title={title}
          parts={parts}
          level={level}
          outside={outside}
          maxes={maxes}
          ctx={ctx}
          coach={mode === 'coach' ? coach : undefined}
          onClose={() => setMode(null)}
        />
      )}
    </div>
  );
}
