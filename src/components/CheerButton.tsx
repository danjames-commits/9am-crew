'use client';
import { useOptimistic, useTransition } from 'react';
import { setCheer } from '@/app/actions';

export function CheerButton({ liftLogId, count, mine, name, disabled }: { liftLogId: number; count: number; mine: boolean; name: string; disabled?: boolean }) {
  const [, start] = useTransition();
  const [state, setState] = useOptimistic({ count, mine });

  function toggle() {
    start(async () => {
      const on = !state.mine;
      setState({ mine: on, count: state.count + (on ? 1 : -1) });
      await setCheer(liftLogId, on);
    });
  }

  return (
    <button
      className={`btn small ${state.mine ? 'teal' : 'ghost'}`}
      onClick={toggle}
      disabled={disabled}
      aria-pressed={state.mine}
      aria-label={`Cheer for ${name}`}
      style={{ minWidth: 92 }}
    >
      Cheer · {state.count}
    </button>
  );
}
