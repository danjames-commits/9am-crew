import type { ReactNode } from 'react';
import { Avatar } from './Avatar';

interface Person {
  id: string;
  name: string;
  animal?: string | null;
}

/** "Jake hit a new best": a gold medal card with the lift big, who's cheered, and the 👏 button. */
export function PrCard({ who, body, when, cheer, cheerers = [] }: { who: string; body: string; when?: string; cheer: ReactNode; cheerers?: Person[] }) {
  const [lift, ...rest] = body.split(' · ');
  const amount = rest.join(' · ');
  return (
    <div className="pr-card">
      <div className="pr-medal" aria-hidden="true">
        🏆
      </div>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="pr-who">
          {who} hit a new best{when ? <span className="pr-when"> · {when}</span> : null}
        </div>
        <div className="pr-lift">
          {lift}
          {amount && <b> {amount}</b>}
        </div>
        {cheerers.length > 0 && (
          <div className="pr-cheerers" aria-label={`Cheered by ${cheerers.map((p) => p.name).join(', ')}`}>
            {cheerers.slice(0, 5).map((p) => (
              <Avatar key={p.id} id={p.id} name={p.name} animal={p.animal} size="sm" />
            ))}
          </div>
        )}
      </div>
      {cheer}
    </div>
  );
}
