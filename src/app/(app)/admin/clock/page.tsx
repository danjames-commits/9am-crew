import Link from 'next/link';
import { requireMember } from '@/lib/supabase/server';
import { CLOCK_BUTTONS, listDevices, switchbotReady, type SwitchbotDevices } from '@/lib/switchbot';
import { ClockRemote } from '@/components/admin/ClockRemote';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

export default async function ClockPage() {
  await requireMember({ admin: true });
  let devices: SwitchbotDevices | null = null;
  let problem = '';
  if (!switchbotReady()) problem = 'The SwitchBot keys aren’t in Vercel yet.';
  else {
    try {
      devices = await listDevices();
    } catch (e) {
      problem = e instanceof Error ? e.message : 'Couldn’t reach SwitchBot.';
    }
  }
  const hubs = devices?.deviceList.filter((d) => /hub/i.test(d.deviceType)) ?? [];
  const clock = devices?.infraredRemoteList.find((r) => /clock/i.test(r.deviceName)) ?? null;

  return (
    <main className="screen">
      <div className="row" style={{ gap: 10 }}>
        <Link href="/admin" className="avatar" style={{ background: '#fff', color: 'var(--ink)' }} aria-label="Back to Program">
          <Icon name="back" />
        </Link>
        <h1 style={{ fontSize: 28 }}>Gym clock</h1>
      </div>

      <section className="card stack tight">
        <div className="eyebrow">Connection</div>
        {problem ? (
          <p className="small" role="alert">
            {problem}
          </p>
        ) : (
          <ul className="clock-checks small">
            <li className="ok">SwitchBot keys work</li>
            <li className={hubs.length ? 'ok' : 'todo'}>
              {hubs.length ? `Hub found: ${hubs.map((h) => h.deviceName).join(', ')}` : 'No hub found yet. Set up the Hub Mini on the gym Wi-Fi in the SwitchBot app.'}
            </li>
            <li className={clock ? 'ok' : 'todo'}>
              {clock
                ? `Remote found: ${clock.deviceName}`
                : 'No clock remote yet. In the SwitchBot app: Hub Mini → Add Remote → Others, name it “Gym clock”, and teach it the buttons.'}
            </li>
          </ul>
        )}
      </section>

      <section className="stack tight">
        <div className="eyebrow">Remote</div>
        <p className="muted small">
          Press a button here and the hub presses it on the clock. Name each button in the SwitchBot app exactly as it shows here (Star and Hash for * and #).
        </p>
        <ClockRemote rows={CLOCK_BUTTONS} ready={Boolean(clock)} />
      </section>
    </main>
  );
}
