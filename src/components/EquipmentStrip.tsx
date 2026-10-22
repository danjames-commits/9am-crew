'use client';
import { useEffect, useRef, useState } from 'react';

/** Simple line icons for each piece of kit, in the same style as the bottom nav. */
const ICONS: Record<string, React.ReactNode> = {
  Barbell: (
    <>
      <path d="M2 12h20" />
      <rect x="5" y="7" width="2.5" height="10" rx="0.8" />
      <rect x="16.5" y="7" width="2.5" height="10" rx="0.8" />
      <path d="M3.5 9.5v5M20.5 9.5v5" />
    </>
  ),
  Dumbbells: (
    <>
      <path d="M8.5 12h7" />
      <rect x="4.5" y="8" width="4" height="8" rx="1.2" />
      <rect x="15.5" y="8" width="4" height="8" rx="1.2" />
    </>
  ),
  Kettlebell: (
    <>
      <path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" />
      <circle cx="12" cy="15" r="6" />
    </>
  ),
  'Wall ball': (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M4.6 9c4.4 2 10.4 2 14.8 0M4.6 15c4.4-2 10.4-2 14.8 0" />
    </>
  ),
  'Med ball': (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v16M4 12h16" />
    </>
  ),
  Sandbag: (
    <>
      <path d="M5 9.5h14l-1.2 9.5H6.2z" />
      <path d="M9 9.5V8a3 3 0 0 1 6 0v1.5" />
    </>
  ),
  Box: (
    <>
      <path d="M4 9h13v11H4z" />
      <path d="M4 9l3-4h13l-3 4M20 5v11l-3 4" />
    </>
  ),
  Rower: (
    <>
      <path d="M3 19h18" />
      <circle cx="6" cy="14" r="3" />
      <path d="M13 16.5h4M9 14l7-4" />
    </>
  ),
  'Air bike': (
    <>
      <circle cx="6" cy="17" r="3" />
      <circle cx="18" cy="17" r="3" />
      <path d="M6 17l4-7h5l3 7M10 10L8.5 6.5M14 6h3" />
    </>
  ),
  'Ski erg': (
    <>
      <rect x="9" y="3" width="6" height="18" rx="1.5" />
      <path d="M9 8l-3 4M15 8l3 4" />
    </>
  ),
  Sled: (
    <>
      <path d="M3 18h16l2-3" />
      <path d="M7 18V9M15 18V9M7 13h8" />
    </>
  ),
  'Jump rope': (
    <>
      <path d="M6 3v6M18 3v6" />
      <path d="M6 9c0 13 12 13 12 0" />
    </>
  ),
  Rings: (
    <>
      <path d="M8 3v8M16 3v8" />
      <circle cx="8" cy="15" r="4" />
      <circle cx="16" cy="15" r="4" />
    </>
  ),
  'Pull-up bar': (
    <>
      <path d="M3 6h18M5 6v14M19 6v14" />
      <path d="M10 6v4M14 6v4" />
    </>
  ),
  Bands: <path d="M4 12c0-4.5 16-4.5 16 0s-16 4.5-16 0z" />,
};

function KitIcon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name] ?? <circle cx="12" cy="12" r="6" />}
    </svg>
  );
}

/** Icons shown before "+N", so the row shares a line with who's coming. */
const SHOW = 5;

/** The kit for this workout as a row of small icons. Tap for the names. */
export function EquipmentStrip({ kit }: { kit: string[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  if (!kit.length) return <span />;

  return (
    <div className="kit" ref={box}>
      <button type="button" className="kit-strip" aria-expanded={open} aria-label={`Equipment: ${kit.join(', ')}. Tap for names.`} onClick={() => setOpen((o) => !o)}>
        {kit.slice(0, SHOW).map((k) => (
          <KitIcon key={k} name={k} size={19} />
        ))}
        {kit.length > SHOW && <span className="kit-more">+{kit.length - SHOW}</span>}
      </button>
      {open && (
        <div className="kit-pop" role="dialog" aria-label="Equipment">
          <div className="kit-pop-title">Grab for this workout</div>
          {kit.map((k) => (
            <div key={k} className="kit-pop-item">
              <KitIcon name={k} size={22} />
              {k}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
