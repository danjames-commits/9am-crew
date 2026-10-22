import 'server-only';
import { createHmac, randomUUID } from 'node:crypto';

// SwitchBot's cloud API (v1.1). The Hub Mini in the gym "presses" the clock
// remote's buttons over infrared. Keys live in Vercel: SWITCHBOT_TOKEN, SWITCHBOT_SECRET.
const API = 'https://api.switch-bot.com/v1.1';

export const switchbotReady = () => Boolean(process.env.SWITCHBOT_TOKEN && process.env.SWITCHBOT_SECRET);

function headers() {
  const token = process.env.SWITCHBOT_TOKEN ?? '';
  const secret = process.env.SWITCHBOT_SECRET ?? '';
  const t = String(Date.now());
  const nonce = randomUUID();
  const sign = createHmac('sha256', secret).update(token + t + nonce).digest('base64');
  return { Authorization: token, sign, nonce, t, 'Content-Type': 'application/json; charset=utf8' };
}

interface Reply<T> {
  statusCode: number;
  message: string;
  body: T;
}

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  if (!switchbotReady()) throw new Error('SwitchBot keys aren’t set up yet.');
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? 'GET',
    headers: headers(),
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  if (res.status === 401) throw new Error('SwitchBot didn’t accept the keys. Check the token and secret in Vercel.');
  const data = (await res.json().catch(() => null)) as Reply<T> | null;
  if (!res.ok || !data) throw new Error(`SwitchBot didn’t answer (${res.status}).`);
  if (data.statusCode !== 100) throw new Error(`SwitchBot said: ${data.message || data.statusCode}`);
  return data.body;
}

export interface SwitchbotDevices {
  deviceList: { deviceId: string; deviceName: string; deviceType: string; hubDeviceId?: string }[];
  infraredRemoteList: { deviceId: string; deviceName: string; remoteType: string; hubDeviceId: string }[];
}

export function listDevices() {
  return call<SwitchbotDevices>('/devices');
}

/** The learned clock remote: the infrared remote with "clock" in its name. */
export async function findClock() {
  const { infraredRemoteList } = await listDevices();
  return infraredRemoteList.find((r) => /clock/i.test(r.deviceName)) ?? null;
}

/** Press one learned button on a custom ("Others") remote, by the name it was given in the SwitchBot app. */
export function pressButton(remoteId: string, button: string) {
  return call<unknown>(`/devices/${encodeURIComponent(remoteId)}/commands`, {
    method: 'POST',
    body: { command: learnedName(button), parameter: 'default', commandType: 'customize' },
  });
}

/** The clock remote's buttons, laid out like the real one, named as they should be learned. */
export const CLOCK_BUTTONS: string[][] = [
  ['Power', 'Set'],
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['Star', '0', 'Hash'],
  ['Up'],
  ['Left', 'OK', 'Right'],
  ['Down'],
  ['Exit', 'Pause', 'Restart', 'Select'],
  ['F1', 'F2', 'F3'],
  ['F4', 'F5', 'F6'],
  ['F7', 'F8', 'F9'],
  ['F10', 'F11', 'F12'],
];
export const ALL_CLOCK_BUTTONS = CLOCK_BUTTONS.flat();

// The SwitchBot app won't accept button names containing the numbers 1–100,
// so digits and F-keys are taught spelled out ("One", "F Six").
const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

/** The name a button is taught under in the SwitchBot app. */
export function learnedName(button: string): string {
  if (/^\d$/.test(button)) return WORDS[Number(button)];
  const f = /^F(\d{1,2})$/.exec(button);
  if (f) return `F ${WORDS[Number(f[1])]}`;
  return button;
}
