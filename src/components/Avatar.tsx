import { avatarColor, initials } from '@/lib/ui';
import { animalName, isAnimal } from '@/lib/animals';

const SIZES = { sm: 34, md: 40, lg: 72 } as const;

/** A person's spirit animal with their initials on a little badge, or just their initials. */
export function Avatar({
  id,
  name,
  animal,
  size = 'md',
  ring,
  hidden,
}: {
  id: string;
  name: string;
  animal?: string | null;
  size?: keyof typeof SIZES;
  /** Border colour, for overlapping stacks of avatars. */
  ring?: string;
  /** Keeps the space but hides it (for runs of chat messages). */
  hidden?: boolean;
}) {
  const px = SIZES[size];
  const label = animal && isAnimal(animal) ? `${name} (${animalName(animal)})` : name;
  const base: React.CSSProperties = {
    width: px,
    height: px,
    background: avatarColor(id),
    position: 'relative',
    visibility: hidden ? 'hidden' : undefined,
    border: ring ? `2px solid ${ring}` : undefined,
    fontSize: size === 'lg' ? 24 : size === 'sm' ? 12 : 14,
  };

  if (!animal || !isAnimal(animal)) {
    return (
      <span className="avatar" style={base} title={name} aria-label={name} role="img">
        {initials(name)}
      </span>
    );
  }

  const badge = Math.round(px * 0.48);
  return (
    <span className="avatar" style={{ ...base, overflow: 'visible' }} title={label} aria-label={label} role="img">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/animals/${animal}.svg`} alt="" width={Math.round(px * 0.68)} height={Math.round(px * 0.68)} style={{ display: 'block' }} />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: -Math.round(px * 0.1),
          bottom: -Math.round(px * 0.1),
          minWidth: badge,
          height: badge,
          padding: '0 3px',
          borderRadius: badge / 2,
          background: 'var(--ink)',
          color: '#fff',
          fontSize: Math.max(9, Math.round(px * 0.24)),
          fontWeight: 800,
          lineHeight: `${badge}px`,
          textAlign: 'center',
          boxShadow: '0 0 0 2px #fff',
          letterSpacing: '0.02em',
        }}
      >
        {initials(name)}
      </span>
    </span>
  );
}
