import Link from 'next/link';
import { requireMember } from '@/lib/supabase/server';
import { ALL_CLOCK_BUTTONS, CLOCK_BUTTONS, learnedName, listDevices, switchbotReady, type SwitchbotDevices } from '@/lib/switchbot';
import { CLOCK_TESTS } from '@/lib/clock-tests';
import { ClockRemote } from '@/components/admin/ClockRemote';
import { ClockTests } from '@/components/admin/ClockTests';
import { LearnedButton } from '@/components/admin/LearnedButton';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

const SHOW_NAME: Record<string, string> = { Star: 'Star (*)', Hash: 'Hash (#)' };

/** Admins: a walk-through for setting up the gym clock with the SwitchBot hub, with the tools to test each step. */
export default async function ClockPage() {
  const { supabase } = await requireMember({ admin: true });
  const { data: prog } = await supabase.from('program').select('clock_findings').eq('id', 1).maybeSingle();
  const findings = (prog?.clock_findings ?? {}) as Record<string, { result: 'yes' | 'no'; note: string; by?: string; at?: string }>;

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

  // SwitchBot can't tell us which buttons a remote has learned, so step 3 is done when you say so.
  const learned = Boolean(clock) && findings.learned?.result === 'yes';
  const auto = [!problem, hubs.length > 0, learned];
  const tested = CLOCK_TESTS.filter((t) => findings[t.id]).length;
  const done = auto.filter(Boolean).length + tested;
  const total = auto.length + CLOCK_TESTS.length;

  return (
    <main className="screen">
      <div className="row" style={{ gap: 10 }}>
        <Link href="/admin" className="avatar" style={{ background: '#fff', color: 'var(--ink)' }} aria-label="Back to Program">
          <Icon name="back" />
        </Link>
        <div className="grow">
          <h1 style={{ fontSize: 28 }}>Gym clock setup</h1>
          <p className="muted small">
            {done} of {total} done
          </p>
        </div>
      </div>
      <div className="setup-bar" aria-hidden="true">
        <span style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <p className="muted">
        The SwitchBot Hub Mini presses the clock remote’s buttons for the app. Work down the steps at the gym. Each one says what to do and what to look for. The app ticks the first two
        itself; for the rest, watch the clock and mark ✓ or ✗.
      </p>

      <Step n={1} title="SwitchBot keys" ok={!problem} status={problem || 'Your keys work.'}>
        <p className="small muted">Already done from home. If this ever fails, re-enter SWITCHBOT_TOKEN and SWITCHBOT_SECRET in Vercel → Settings → Environment Variables.</p>
      </Step>

      <Step n={2} title="Hub on the gym Wi-Fi" ok={hubs.length > 0} status={hubs.length ? `Found: ${hubs.map((h) => h.deviceName).join(', ')}` : 'No hub found yet.'}>
        <ol className="small setup-list">
          <li>Plug the Hub Mini in where it can “see” the clock (same wall or facing it, within about 8 m).</li>
          <li>
            In the SwitchBot app: <b>new hub</b> → Add device → Hub Mini. <b>Already set up at home?</b> Open the hub → ⚙︎ → Wi-Fi settings.
          </li>
          <li>Hold the hub’s button about 2 seconds until the light flashes, then pick the gym network.</li>
          <li>
            The Hub Mini only sees <b>2.4 GHz</b> Wi-Fi. If the gym network isn’t listed, that’s usually why.
          </li>
          <li>Reload this page.</li>
        </ol>
      </Step>

      <Step
        n={3}
        title="Teach it the remote"
        ok={learned}
        status={
          learned
            ? `${clock!.deviceName}: buttons taught.`
            : clock
              ? `Remote “${clock.deviceName}” added. Now teach it the buttons.`
              : 'No remote with “clock” in its name yet.'
        }
      >
        <ol className="small setup-list">
          <li>
            SwitchBot app → the Hub Mini → <b>Add remote</b> → <b>Others</b> (DIY). Name it <b>Gym clock</b>.
          </li>
          <li>Add each button: point the real remote at the hub, press the button, and name it exactly as below.</li>
          <li>Tap <b>All buttons taught</b> below when you’re done. (You can do this part anywhere, even at home.)</li>
        </ol>
        <div className="learn-grid">
          {ALL_CLOCK_BUTTONS.map((b) => (
            <span key={b}>{SHOW_NAME[b] ?? learnedName(b)}</span>
          ))}
        </div>
        <p className="small muted">{ALL_CLOCK_BUTTONS.length} buttons. Names must match exactly, including capitals and the space in “F One”. Numbers are spelled out because the SwitchBot app won’t take digits in a name.</p>
        {clock && <LearnedButton />}
      </Step>

      <section className="stack tight">
        <div className="row between">
          <h2 style={{ fontSize: 20 }}>4. Try it</h2>
          <span className="muted small">
            {tested} of {CLOCK_TESTS.length} marked
          </span>
        </div>
        <p className="muted small">
          Stand where you can see the clock. Tap <b>Send</b>, watch, then mark ✓ or ✗. Add a note if it did something different. Your answers decide how the app will run timers.
        </p>
        <ClockTests tests={CLOCK_TESTS} findings={findings} ready={Boolean(clock)} />
      </section>

      <section className="stack tight">
        <h2 style={{ fontSize: 20 }}>Spare remote</h2>
        <p className="muted small">Every button, if you want to try something not on the list.</p>
        <ClockRemote rows={CLOCK_BUTTONS} ready={Boolean(clock)} />
      </section>

      {done === total && (
        <div className="card gold">
          <b>All set.</b> Tell Claude the clock checks are done, and the timer runner gets built on what you found.
        </div>
      )}
    </main>
  );
}

function Step({ n, title, ok, status, children }: { n: number; title: string; ok: boolean; status: string; children: React.ReactNode }) {
  return (
    <section className={`card stack tight setup-step ${ok ? 'ok' : ''}`}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <h2 style={{ fontSize: 20 }}>
          {n}. {title}
        </h2>
        <span className={`setup-dot ${ok ? 'ok' : ''}`} aria-label={ok ? 'Done' : 'To do'}>
          {ok ? '✓' : ''}
        </span>
      </div>
      <p className="small" style={{ color: ok ? 'var(--teal)' : 'var(--ink-2)', fontWeight: 700 }}>
        {status}
      </p>
      {!ok && children}
    </section>
  );
}
