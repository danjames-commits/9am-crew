'use client';
import { useState } from 'react';
import { LEVELS, type Level, type Part } from '@/lib/types';
import { YourNumbers } from './YourNumbers';
import { ScaleHelper } from './ScaleHelper';
import type { WeatherCall } from '@/lib/weather-rules';
import { splitPartText } from '@/lib/part-text';
import { Icon } from './Icon';

export function WorkoutView({
  parts,
  myLevel,
  maxes,
  weather,
  classDate,
  canScale = false,
}: {
  parts: Part[];
  myLevel: number;
  maxes: Record<string, number>;
  weather?: WeatherCall | null;
  classDate?: string;
  canScale?: boolean;
}) {
  const [level, setLevel] = useState<Level>(Math.min(4, Math.max(1, myLevel)) as Level);
  const hasOutdoor = parts.some((p) => p.outdoor);
  const [outside, setOutside] = useState(Boolean(hasOutdoor && weather?.outside));
  const i = level - 1;

  return (
    <div className="stack loose">
      <div className="segmented" role="group" aria-label="Level">
        {LEVELS.map((l) => (
          <button key={l.n} aria-pressed={level === l.n} onClick={() => setLevel(l.n)}>
            {l.name}
            {l.n === myLevel && <small>your level</small>}
          </button>
        ))}
      </div>

      {parts.map((p, k) => {
        const useOutdoor = outside && p.outdoor;
        const versions = useOutdoor ? p.outdoor!.versions : p.versions;
        const partTitle = useOutdoor ? p.outdoor!.title : p.title;
        const text = versions[i];
        // Strength and skill: the level's first line is the headline.
        // A first line that is a "·" list stays in the body instead.
        const lines = text.split('\n');
        const firstIsHeadline = (p.kind === 'strength' || p.kind === 'skill') && !lines[0].includes(' · ');
        const headline = firstIsHeadline ? lines[0] : p.kind === 'conditioning' ? partTitle : '';
        const body = firstIsHeadline ? lines.slice(1).join('\n') : text;
        const header = (
          <div className="row between" style={{ flex: 1 }}>
            <div className="eyebrow">
              {p.label}
              {useOutdoor ? ' · outside' : ''}
            </div>
            {p.minutes ? <span className="muted small">{p.minutes} min</span> : null}
          </div>
        );
        const content = (
          <>
            {p.outdoor && (
              <div className="stack tight">
                <div
                  className="segmented"
                  role="group"
                  aria-label="Inside or outside"
                  style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
                >
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
            {headline && <h3 style={{ fontSize: 20 }}>{headline}</h3>}
            {body && (
              <div className="part-body">
                {splitPartText(body).map((b, n) =>
                  b.kind === 'text' ? (
                    <p key={n}>{b.text}</p>
                  ) : (
                    <div key={n}>
                      {b.label && <div className="part-sub">{b.label}</div>}
                      <ul>
                        {b.items.map((item, j) => (
                          <li key={j}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ),
                )}
              </div>
            )}
            {p.lift && <YourNumbers part={useOutdoor ? { ...p, versions } : p} level={level} maxes={maxes} />}
          </>
        );
        // The warm-up folds away once you're done with it; open by default.
        if (p.kind === 'warmup') {
          return (
            <details key={k} open className="card part-fold">
              <summary>
                {header}
                <span className="chev">
                  <Icon name="next" size={18} />
                </span>
              </summary>
              <div className="stack tight">{content}</div>
            </details>
          );
        }
        return (
          <section key={k} className={`card stack tight ${p.kind === 'strength' ? 'outline-gold' : ''}`}>
            {header}
            {content}
          </section>
        );
      })}
      {canScale && classDate && <ScaleHelper classDate={classDate} outside={outside} />}
    </div>
  );
}
