import Link from 'next/link';

/** Switches between the My stats sections. */
export function LiftsTabs({ current }: { current: 'lifts' | 'benchmarks' | 'attendance' }) {
  return (
    <nav className="tabs" aria-label="My stats sections">
      <Link href="/lifts" aria-current={current === 'lifts' ? 'page' : undefined}>
        Lifts
      </Link>
      <Link href="/lifts/benchmarks" aria-current={current === 'benchmarks' ? 'page' : undefined}>
        Benchmarks
      </Link>
      <Link href="/lifts/attendance" aria-current={current === 'attendance' ? 'page' : undefined}>
        Show-ups
      </Link>
    </nav>
  );
}
