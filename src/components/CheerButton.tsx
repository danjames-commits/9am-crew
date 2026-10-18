'use client';
import { useState } from 'react';
import { setCheer } from '@/app/actions';

export function CheerButton({ liftLogId, count, mine, name, disabled }: { liftLogId: number; count: number; mine: boolean; name: string; disabled?: boolean }) {
  const [state, setState] = useState({ count, mine });

  async function toggle() {
    const on = !state.mine;
    setState({ mine: on, count: state.count + (on ? 1 : -1) });
    const r = await setCheer(liftLogId, on);
    if (r?.error) setState((s) => ({ mine: !on, count: s.count + (on ? -1 : 1) }));
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
