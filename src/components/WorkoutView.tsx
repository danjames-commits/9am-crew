'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { setLevel as saveLevel } from '@/app/actions';
import { LEVELS, type Level, type Part } from '@/lib/types';
import { YourNumbers } from './YourNumbers';
import { ScaleHelper } from './ScaleHelper';
import type { WeatherCall } from '@/lib/weather-rules';
import { Icon } from './Icon';
import { PartBody, partWords } from './PartText';
import { BARBELL_LIFTS, equipmentIn } from '@/lib/equipment';
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
  const [placeOpen, setPlaceOpen] = useState(false);
  const levelRef = useRef<HTMLDivElement>(null);
  const placeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!levelOpen && !placeOpen) return;
    const close = (e: PointerEvent) => {
      if (!levelRef.current?.contains(e.target as Node)) setLevelOpen(false);
      if (!placeRef.current?.contains(e.target as Node)) setPlaceOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [levelOpen, placeOpen]);
  const i = level - 1;
  // What to grab for this workout, at the level and place you're looking at.
  const kit = equipmentIn(
    parts.flatMap((p) => {
      const w = partWords(p, i, outside);
      return [p.kind === 'strength' ? '' : w.title, w.headline, w.body];
    }),
    // The main lift at this level (Gentle often swaps to a dumbbell or kettlebell version).
    { barbellLift: parts.some((p) => p.lift && BARBELL_LIFTS.has(level === 1 ? (p.lift.gentleMovement ?? p.lift.movement) : p.lift.movement)) },
  );
  const ctx: QuickLogContext = { ...log, classDate, maxes };

  return (
    <div className="stack loose">
      {(kit.length > 0 || meta) && (
        <div className="title-meta">
          <EquipmentStrip kit={kit} />
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
        {hasOutdoor && (
          <div className="wv-level" ref={placeRef}>
            <button type="button" className="wv-chip" aria-expanded={placeOpen} onClick={() => setPlaceOpen((o) => !o)}>
              {outside ? 'Outside' : 'Inside'} <span aria-hidden="true">▾</span>
            </button>
            {placeOpen && (
              <div className="wv-pop" role="dialog" aria-label="Inside or outside">
                {[false, true].map((o) => (
                  <button
                    key={String(o)}
                    type="button"
                    className={`wv-pop-item ${outside === o ? 'on' : ''}`}
                    onClick={() => {
                      setOutside(o);
                      setPlaceOpen(false);
                    }}
                  >
                    <b>{o ? 'Outside' : 'Inside'}</b>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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

      {hasOutdoor && (
        <p className="small wv-weather" style={{ color: weather?.outside ? 'var(--teal)' : 'var(--ink-3)' }}>
          {weather ? (
            <>
              <b>{weather.headline}.</b> {weather.detail} at 9 AM.
            </>
          ) : (
            'The 9 AM forecast shows here a few days before.'
          )}
        </p>
      )}

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
