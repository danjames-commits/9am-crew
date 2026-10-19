import type { Part } from '@/lib/types';
import { splitPartText } from '@/lib/part-text';

/** The words for one part at one level: an optional headline, then text and short lists. */
export function partWords(p: Part, i: number, outside: boolean) {
  const useOutdoor = Boolean(outside && p.outdoor);
  const versions = useOutdoor ? p.outdoor!.versions : p.versions;
  const title = useOutdoor ? p.outdoor!.title : p.title;
  const text = versions[i] ?? '';
  // Strength and skill: the level's first line is the headline.
  // A first line that is a "·" list stays in the body instead.
  const lines = text.split('\n');
  const firstIsHeadline = (p.kind === 'strength' || p.kind === 'skill') && !lines[0].includes(' · ');
  const headline = firstIsHeadline ? lines[0] : p.kind === 'conditioning' ? title : '';
  const body = firstIsHeadline ? lines.slice(1).join('\n') : text;
  return { useOutdoor, versions, title, headline, body };
}

export function PartBody({ body, className = 'part-body' }: { body: string; className?: string }) {
  if (!body) return null;
  return (
    <div className={className}>
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
  );
}
