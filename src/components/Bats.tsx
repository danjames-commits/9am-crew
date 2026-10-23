/** Three little bats flapping by the greeting, for Halloween. */
const BAT =
  'M20 7 C19 4 17.5 3.5 17 5 L16.5 2.5 L15.5 5.5 C12 2.5 6 2 0 6 C4 7 6 9.5 6 13 C8 11 11 11 13 13 C14 11.5 16 11 20 15 C24 11 26 11.5 27 13 C29 11 32 11 34 13 C34 9.5 36 7 40 6 C34 2 28 2.5 24.5 5.5 L23.5 2.5 L23 5 C22.5 3.5 21 4 20 7 Z';

export function Bats() {
  return (
    <div className="bats" aria-hidden="true">
      {[
        { x: 70, y: 2, s: 30 },
        { x: 32, y: 24, s: 22 },
        { x: 2, y: 8, s: 16 },
      ].map((b, i) => (
        <svg key={i} viewBox="0 0 40 16" width={b.s} height={b.s * 0.4} style={{ left: b.x, top: b.y }}>
          <path d={BAT} />
        </svg>
      ))}
    </div>
  );
}
