import Link from 'next/link';

/** Switches between My lifts and Benchmarks. */
export function LiftsTabs({ current }: { current: 'lifts' | 'benchmarks' }) {
  return (
    <nav className="tabs" aria-label="My lifts sections">
      <Link href="/lifts" aria-current={current === 'lifts' ? 'page' : undefined}>
        Lifts
      </Link>
      <Link href="/lifts/benchmarks" aria-current={current === 'benchmarks' ? 'page' : undefined}>
        Benchmarks
      </Link>
    </nav>
  );
}
