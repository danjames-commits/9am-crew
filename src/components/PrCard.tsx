import type { ReactNode } from 'react';
import { PersonAvatar } from './PersonAvatar';
import { PrArt } from './PrArt';

interface Person {
  id: string;
  name: string;
  animal?: string | null;
}

/** "Jake hit a new best": a gold medal card with the lift big, who's cheered, and the 👏 button. */
export function PrCard({
  who,
  body,
  when,
  cheer,
  cheerers = [],
  art,
  artTarget,
  canRedraw = false,
}: {
  who: string;
  body: string;
  when?: string;
  cheer: ReactNode;
  cheerers?: Person[];
  /** Their spirit animal doing this lift, once Claude has drawn it. */
  art?: string;
  artTarget?: { userId: string; movementId: number };
  /** Admins can (re)draw it. */
  canRedraw?: boolean;
}) {
  const [lift, ...rest] = body.split(' · ');
  const amount = rest.join(' · ');
  return (
    <div className="pr-card">
      <PrArt art={art} caption={`${who === 'You' ? 'Your' : `${who}’s`} new best: ${lift}${amount ? ` ${amount}` : ''}`} target={artTarget} canRedraw={canRedraw} />
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
              <PersonAvatar key={p.id} id={p.id} name={p.name} animal={p.animal} />
            ))}
          </div>
        )}
      </div>
      {cheer}
    </div>
  );
}
