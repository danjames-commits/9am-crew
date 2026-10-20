'use client';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from './Avatar';

/** Someone else's avatar. Hover (or tap on a phone) shows their full name. */
export function PersonAvatar({ id, name, animal, size = 'sm' }: { id: string; name: string; animal?: string | null; size?: 'sm' | 'md' }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), 2500);
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => {
      clearTimeout(t);
      document.removeEventListener('pointerdown', close);
    };
  }, [open]);

  return (
    <button ref={box} type="button" className="person" data-open={open || undefined} aria-label={name} onClick={() => setOpen((o) => !o)}>
      <Avatar id={id} name={name} animal={animal} size={size} />
      <span className="name-tip" aria-hidden="true">
        {name}
      </span>
    </button>
  );
}
