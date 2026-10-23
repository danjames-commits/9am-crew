// One-tap tests for the gym clock: each sends a short run of remote buttons
// and says what to watch for. Results are saved so the timer runner can be built on them.

export interface ClockTest {
  id: string;
  title: string;
  buttons: string[];
  look: string;
}

export const CLOCK_TESTS: ClockTest[] = [
  { id: 'first', title: 'First press', buttons: ['Exit', 'F2'], look: 'Does the clock change to show F2 and 20:00? That means the hub can reach it. Then tap Exit.' },
  { id: 'min-single', title: 'Minutes, one digit', buttons: ['Exit', 'Down', 'Left', '3'], look: 'Does the clock show 3:00 (or 03:00)? Then tap Exit below.' },
  { id: 'min-zero', title: 'Minutes, with a leading zero', buttons: ['Exit', 'Down', 'Left', '0', '3'], look: 'Does it show 3:00? Then tap Exit.' },
  { id: 'seconds', title: 'Seconds', buttons: ['Exit', 'Exit', 'Down', '3', 'Right', '3', '0'], look: 'Does it show 3:30? Then tap Exit.' },
  { id: 'arrows-plus', title: 'Arrows as + and −', buttons: ['Exit', 'Down', 'Left', 'Up', 'Up'], look: 'Do the blinking minutes go up by 2? Then tap Exit.' },
  { id: 'start-20s', title: 'Start a 0:20 countdown', buttons: ['Exit', 'Exit', 'Down', '0', 'Right', '2', '0', 'OK'], look: 'Is there a 10-second lead-in, then 0:20 counting down?' },
  { id: 'pause', title: 'Pause (while it’s running)', buttons: ['Pause'], look: 'Does the countdown stop?' },
  { id: 'resume', title: 'Resume after pause', buttons: ['OK'], look: 'Does it carry on from where it stopped? (Try Pause again too.)' },
  { id: 'restart', title: 'Restart (while running or paused)', buttons: ['Restart'], look: 'Does it go back to 0:20? Does it start by itself, or wait for OK?' },
  { id: 'interval', title: 'Intervals: 3 × 0:20 work / 0:10 rest', buttons: ['Exit', 'Select', '3', 'Select', 'Left', '0', '0', 'Right', '2', '0', 'Select', 'Left', '0', '0', 'Right', '1', '0', 'OK'], look: 'Blue round number, 0:20 work (1 beep), 0:10 rest (2 beeps), 3 rounds?' },
  { id: 'firmware', title: 'Which firmware? (F12)', buttons: ['Exit', 'F12'], look: 'Does it flash “10 -- on” or “10 -OFF”? If so, tap this again to put it back as it was.' },
  { id: 'save-f6', title: 'Save a 1:00 countdown to F6', buttons: ['Exit', 'Down', 'Left', '0', '1', 'Right', '0', '0', 'F6'], look: 'Three beeps, then back to the clock?' },
  { id: 'run-f6', title: 'Run F6', buttons: ['Exit', 'F6', 'OK'], look: 'Does the saved 1:00 countdown start (after the lead-in)?' },
  { id: 'after-unplug', title: 'After unplugging: run F6', buttons: ['Exit', 'F6', 'OK'], look: 'Unplug the clock, plug it back in, then tap. Is the 1:00 still saved?' },
];
