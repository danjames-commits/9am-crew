// Little Halloween costumes that sit on everyone's avatar. Hidden unless the page has
// the Halloween theme on (see the root layout), so nothing changes the rest of the year.

const COSTUMES = [
  // Witch hat
  <g key="witch">
    <path d="M50 2 L68 40 L32 40 Z" fill="#2b1840" />
    <path d="M50 2 C56 8 62 6 66 12" stroke="#2b1840" strokeWidth="5" fill="none" strokeLinecap="round" />
    <rect x="34" y="33" width="32" height="6" rx="1" fill="#f07c1a" />
    <ellipse cx="50" cy="42" rx="30" ry="6" fill="#2b1840" />
  </g>,
  // Pumpkin hat
  <g key="pumpkin">
    <ellipse cx="50" cy="30" rx="22" ry="15" fill="#f07c1a" />
    <path d="M40 17 C36 26 36 36 40 44 M60 17 C64 26 64 36 60 44 M50 15 V45" stroke="#c4560b" strokeWidth="2.5" fill="none" />
    <path d="M48 16 C47 10 50 6 55 5" stroke="#3f6b2a" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M55 9 C60 6 65 9 64 13 C60 12 57 12 55 9 Z" fill="#5c9a3a" />
  </g>,
  // Devil horns
  <g key="devil">
    <path d="M27 44 C20 30 22 18 30 10 C30 22 34 32 40 40 Z" fill="#d7262f" />
    <path d="M73 44 C80 30 78 18 70 10 C70 22 66 32 60 40 Z" fill="#d7262f" />
  </g>,
  // Black cat ears
  <g key="cat">
    <path d="M24 46 L28 14 L46 36 Z" fill="#1e1a22" />
    <path d="M76 46 L72 14 L54 36 Z" fill="#1e1a22" />
    <path d="M30 38 L31 24 L40 35 Z M70 38 L69 24 L60 35 Z" fill="#f29bb5" />
  </g>,
  // Pirate hat
  <g key="pirate">
    <path d="M14 40 C24 16 76 16 86 40 C70 34 30 34 14 40 Z" fill="#1e1a22" />
    <circle cx="50" cy="28" r="5" fill="#fff" />
    <path d="M46 35 L54 39 M54 35 L46 39" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </g>,
  // Wizard hat with stars
  <g key="wizard">
    <path d="M50 0 L70 42 L30 42 Z" fill="#3b4cc0" />
    <path d="M45 18 l1.5 3 3 .4-2.2 2 .6 3-2.9-1.5-2.9 1.5.6-3-2.2-2 3-.4Z" fill="#ffd34d" />
    <path d="M56 30 l1.2 2.4 2.6.3-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.3Z" fill="#ffd34d" />
    <ellipse cx="50" cy="42" rx="28" ry="5" fill="#2c3a99" />
  </g>,
];

/** Picks the same costume for a person every time, from their id. */
function pick(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COSTUMES[h % COSTUMES.length];
}

export function Costume({ id, px }: { id: string; px: number }) {
  const w = Math.round(px * 1.05);
  return (
    <svg
      className="costume"
      aria-hidden="true"
      viewBox="0 0 100 50"
      width={w}
      height={Math.round(w / 2)}
      style={{ position: 'absolute', left: '50%', top: -Math.round(px * 0.3), transform: 'translateX(-50%)', pointerEvents: 'none' }}
    >
      {pick(id)}
    </svg>
  );
}
