import Link from 'next/link';
import { Icon } from '@/components/Icon';

// Shown the moment a workout is tapped. Shaped like the workout page, with a
// working back button so a mistaken tap doesn't have to wait.
export default function Loading() {
  return (
    <main className="screen" aria-busy="true" aria-label="Loading workout">
      <div className="row">
        <Link href="/workouts" className="avatar" style={{ background: 'var(--card)', color: 'var(--ink)' }} aria-label="Back to workouts">
          <Icon name="back" />
        </Link>
        <div className="grow stack tight">
          <div className="skeleton" style={{ height: 14, width: '45%', borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 32, width: '75%', borderRadius: 10 }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: 40 }} />
      <div className="skeleton" style={{ height: 160 }} />
      <div className="skeleton" style={{ height: 64 }} />
      <div className="skeleton" style={{ height: 64 }} />
    </main>
  );
}
