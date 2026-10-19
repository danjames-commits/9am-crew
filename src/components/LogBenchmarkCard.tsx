'use client';
import { useState } from 'react';
import type { Benchmark } from '@/lib/benchmarks';
import { BenchmarkLogForm } from './BenchmarkLogForm';

/** The "+ Log a result" button that opens the result form. */
export function LogBenchmarkCard({ benchmarks, myLevel, today, startOpen = false, initialId }: { benchmarks: Benchmark[]; myLevel: number; today: string; startOpen?: boolean; initialId?: number }) {
  const [open, setOpen] = useState(startOpen);
  const list = initialId ? [...benchmarks.filter((b) => b.id === initialId), ...benchmarks.filter((b) => b.id !== initialId)] : benchmarks;
  if (!open) {
    return (
      <button className="btn primary big" onClick={() => setOpen(true)}>
        + Log a result
      </button>
    );
  }
  return (
    <div className="card stack">
      <div className="row between">
        <h2>Log a result</h2>
        <button type="button" className="btn small ghost" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      <BenchmarkLogForm benchmarks={list} myLevel={myLevel} today={today} />
    </div>
  );
}
