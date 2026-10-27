// One-tap tests for the gym clock: each sends a short run of remote buttons
// and says what to watch for. Results are saved so the timer runner can be built on them.
// The countdown tests send exactly what coach mode sends (built from the same code).

import { buttonsFor, CLEAR_COUNTDOWN } from './clock-plan';

export interface ClockTest {
  id: string;
  title: string;
  buttons: string[];
  look: string;
}

const countdown = (seconds: number) => buttonsFor({ type: 'countdown', label: '', seconds });

export const CLOCK_TESTS: ClockTest[] = [
  { id: 'first', title: 'First press', buttons: ['Exit', 'F2'], look: 'Does the clock change to show F2 and 20:00? That means the hub can reach it. Then tap Exit.' },
  {
    id: 'seconds',
    title: 'Set 3:30 (no start)',
    buttons: countdown(210).slice(0, -1),
    look: 'Clears to 0:00 first, then: does it show 3:30? Then tap Exit.',
  },
  { id: 'start-20s', title: 'Start a 0:20 countdown', buttons: countdown(20), look: 'Is there a 10-second lead-in, then 0:20 counting down?' },
  { id: 'pause', title: 'Pause (while it’s running)', buttons: ['Pause'], look: 'Does the countdown stop?' },
  { id: 'resume', title: 'Resume after pause', buttons: ['OK'], look: 'Does it carry on from where it stopped? (Try Pause again too.)' },
  { id: 'restart', title: 'Restart (while running or paused)', buttons: ['Restart'], look: 'Does it go back to the start? Does it start by itself, or wait for OK?' },
  { id: 'start-12m', title: 'Start a 12:00 countdown (whole minutes)', buttons: countdown(720), look: 'Lead-in, then 12:00 counting down? (Seconds are skipped when they’re zero.) Tap Exit when you’ve seen it.' },
  {
    id: 'interval',
    title: 'Intervals: 3 × 0:20 / 0:10 (old guess)',
    buttons: buttonsFor({ type: 'intervals', label: '', rounds: 3, work: 20, rest: 10 }),
    look: 'Not worked out yet: this is the first guess. Send Claude the two interval videos and this gets rebuilt like the countdowns.',
  },
  { id: 'firmware', title: 'Which firmware? (F12)', buttons: ['Exit', 'F12'], look: 'Does it flash “10 -- on” or “10 -OFF”? If so, tap this again to put it back as it was.' },
  { id: 'save-f6-v2', title: 'Save a 1:00 countdown to F6', buttons: [...CLEAR_COUNTDOWN, '1', 'F6'], look: 'Clears to 0:00, sets 1:00, then F6 instead of OK: three beeps, then back to the clock?' },
  { id: 'run-f6', title: 'Run F6', buttons: ['Exit', 'F6', 'OK'], look: 'Does the saved 1:00 countdown start (after the lead-in)?' },
  { id: 'after-unplug', title: 'After unplugging: run F6', buttons: ['Exit', 'F6', 'OK'], look: 'Unplug the clock, plug it back in, then tap. Is the 1:00 still saved?' },
];
