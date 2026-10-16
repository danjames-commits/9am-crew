import { avatarColor, initials } from '@/lib/ui';

export function Avatar({ id, name, size }: { id: string; name: string; size?: 'sm' }) {
  return (
    <span className={`avatar ${size ?? ''}`} style={{ background: avatarColor(id) }} title={name} aria-label={name} role="img">
      {initials(name)}
    </span>
  );
}
