'use client';
import { useState } from 'react';
import { setCheer } from '@/app/actions';
import { CheerPop } from './CheerPop';

/** Cheer button for Today's personal bests, saved with a server action. */
export function CheerButton({ liftLogId, count, mine, name, disabled }: { liftLogId: number; count: number; mine: boolean; name: string; disabled?: boolean }) {
  const [state, setState] = useState({ count, mine });

  async function toggle() {
    const on = !state.mine;
    setState({ mine: on, count: state.count + (on ? 1 : -1) });
    const r = await setCheer(liftLogId, on);
    if (r?.error) setState((s) => ({ mine: !on, count: s.count + (on ? -1 : 1) }));
  }

  return <CheerPop count={state.count} cheered={state.mine} disabled={disabled} name={name} onToggle={toggle} />;
}
