'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { recordClockFinding } from '@/app/actions';

/** Step 3: SwitchBot can't report which buttons were taught, so the admin confirms it. */
export function LearnedButton() {
  const [saving, start] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();
  return (
    <div className="stack tight">
      <button
        type="button"
        className="btn primary"
        disabled={saving}
        onClick={() =>
          start(async () => {
            setError('');
            const r = await recordClockFinding('learned', 'yes', '');
            if (r && 'error' in r && r.error) setError(r.error);
            else router.refresh();
          })
        }
      >
        {saving ? 'Saving…' : 'All buttons taught'}
      </button>
      {error && (
        <p className="small" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
