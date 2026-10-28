'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { setLevel as saveLevel } from '@/app/actions';
import { LEVELS, type Level, type Part } from '@/lib/types';
import { YourNumbers } from './YourNumbers';
import { ScaleHelper } from './ScaleHelper';
import type { WeatherCall } from '@/lib/weather-rules';
import { Icon } from './Icon';
import { PartBody, partWords } from './PartText';
import { setOutKit, workoutKit, type KitChanges } from '@/lib/workout-kit';
import { EquipmentStrip } from './EquipmentStrip';
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
  meta,
  kitChanges,
  kitEditDate,
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
  /** Shown on the right of the row under the title (who's coming). */
  meta?: React.ReactNode;
  /** A coach's additions and removals to the equipment the app finds. */
  kitChanges?: KitChanges;
  /** Admins: the class date, to save equipment changes. */
  kitEditDate?: string;
}) {
  const [level, setLevel] = useState<Level>(Math.min(4, Math.max(1, myLevel)) as Level);
  // Your saved level; you can make the level you're looking at your own from here.
  const [mine, setMine] = useState(myLevel);
  const [savingLevel, startSaving] = useTransition();
  const hasOutdoor = parts.some((p) => p.outdoor);
  const [outside, setOutside] = useState(Boolean(hasOutdoor && weather?.outside));
  // Every part can fold away. Warm-up and cool-down start folded; the main work starts open.
  const [open, setOpen] = useState<boolean[]>(() => parts.map((p) => p.kind !== 'warmup' && p.kind !== 'cooldown'));
  const [mode, setMode] = useState<'member' | 'coach' | null>(null);
  const [levelOpen, setLevelOpen] = useState(false);
  const levelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!levelOpen) return;
    const close = (e: PointerEvent) => {
      if (!levelRef.current?.contains(e.target as Node)) setLevelOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [levelOpen]);
  const i = level - 1;
  // What to grab for this workout, at the level and place you're looking at, plus any coach changes.
  const kit = workoutKit(parts, level, outside, kitChanges);
  const ctx: QuickLogContext = { ...log, classDate, maxes };

  return (
    <div className="stack loose">
      {(kit.length > 0 || meta || kitEditDate) && (
        <div className="title-meta">
          <EquipmentStrip
            kit={kit}
            edit={kitEditDate ? { date: kitEditDate, setOut: setOutKit(parts, outside, kitChanges), found: setOutKit(parts, outside), changes: kitChanges ?? { add: [], remove: [] } } : undefined}
          />
          {meta}
        </div>
      )}
      <div className="wv-toolbar">
        <div className="wv-level" ref={levelRef}>
          <button type="button" className="wv-chip" aria-expanded={levelOpen} onClick={() => setLevelOpen((o) => !o)}>
            {LEVELS[level - 1].name} <span aria-hidden="true">▾</span>
          </button>
          {levelOpen && (
            <div className="wv-pop" role="dialog" aria-label="Level">
              {LEVELS.map((l) => (
                <button
                  key={l.n}
                  type="button"
                  className={`wv-pop-item ${level === l.n ? 'on' : ''}`}
                  onClick={() => {
                    setLevel(l.n);
                    setLevelOpen(false);
                  }}
                >
                  <b>{l.name}</b>
                  {l.n === mine && <span className="muted small"> · your level</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="grow" />
        {coach && (
          <button type="button" className="btn small ghost" onClick={() => setMode('coach')}>
            Coach
          </button>
        )}
        <button type="button" className="btn small primary" onClick={() => setMode('member')} aria-label="Start workout mode">
          {coach ? '▶ Start' : '▶ Workout mode'}
        </button>
      </div>

      {level !== mine && (
        <div className="level-switch small">
          Showing {LEVELS[level - 1].name}.{' '}
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
            {savingLevel ? 'Saving…' : 'Make it my level'}
          </button>
        </div>
      )}

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
              {/* Only parts with an outside version (in practice, the conditioning) depend on the weather. */}
              {p.outdoor && (
                <div className="place-pick">
                  <div className="segmented" role="group" aria-label="Inside or outside" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <button type="button" aria-pressed={!outside} onClick={() => setOutside(false)}>
                      Inside
                    </button>
                    <button type="button" aria-pressed={outside} onClick={() => setOutside(true)}>
                      Outside
                    </button>
                  </div>
                  <p className="small" style={{ color: weather?.outside ? 'var(--teal)' : 'var(--ink-3)', margin: 0 }}>
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
          kitChanges={kitChanges}
          onClose={() => setMode(null)}
        />
      )}
    </div>
  );
}
