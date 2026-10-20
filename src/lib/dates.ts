// All dates are plain 'YYYY-MM-DD' strings in the gym's time zone.
export const TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE || 'America/Halifax';
/** Class starts at 9; it counts as "the next class" until 10. */
export const CLASS_END_HOUR = 10;

function localParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

export function todayLocal(now = new Date()) {
  return localParts(now).date;
}

/** The last day whose class is over: today once it's past 10, otherwise yesterday. */
export function lastClassDone(now = new Date()) {
  const { date, hour } = localParts(now);
  return hour >= CLASS_END_HOUR ? date : addDays(date, -1);
}

const toUTC = (d: string) => new Date(d + 'T12:00:00Z');
const fromUTC = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(d: string, n: number) {
  const x = toUTC(d);
  x.setUTCDate(x.getUTCDate() + n);
  return fromUTC(x);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(d: string) {
  return toUTC(d).getUTCDay();
}

export const isWeekday = (d: string) => weekday(d) >= 1 && weekday(d) <= 5;

export function daysBetween(a: string, b: string) {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86400000);
}

export function nextWeekday(d: string) {
  let x = addDays(d, 1);
  while (!isWeekday(x)) x = addDays(x, 1);
  return x;
}

/** Today if it's a weekday before class ends, otherwise the next weekday. */
export function nextClassDate(now = new Date()) {
  const { date, hour } = localParts(now);
  if (isWeekday(date) && hour < CLASS_END_HOUR) return date;
  return nextWeekday(date);
}

/** The next `count` class days starting at `from` (inclusive if a weekday). */
export function classDays(from: string, count: number) {
  const out: string[] = [];
  let d = isWeekday(from) ? from : nextWeekday(from);
  while (out.length < count) {
    out.push(d);
    d = nextWeekday(d);
  }
  return out;
}

/** Monday of the week containing d. */
export function mondayOf(d: string) {
  const wd = weekday(d);
  return addDays(d, wd === 0 ? -6 : 1 - wd);
}

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Fri · Oct 16" */
export function shortDate(d: string) {
  const x = toUTC(d);
  return `${DAY[x.getUTCDay()]} · ${MON[x.getUTCMonth()]} ${x.getUTCDate()}`;
}

/** "Friday, Oct 16" */
export function longDate(d: string) {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const x = toUTC(d);
  return `${names[x.getUTCDay()]}, ${MON[x.getUTCMonth()]} ${x.getUTCDate()}`;
}

/** "Today", "Tomorrow" or "Friday" relative to today. */
export function relativeDay(d: string, now = new Date()) {
  const today = todayLocal(now);
  const diff = daysBetween(today, d);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return longDate(d).split(',')[0];
}

export function timeAgo(iso: string, now = new Date()) {
  const s = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return shortDate(new Date(iso).toISOString().slice(0, 10)).split(' · ')[1];
}
