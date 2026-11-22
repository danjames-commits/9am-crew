// Standing rules every agent sees when it reads or writes programming through the connector:
// in the server instructions, in the read/write tool descriptions, and at the top of every preview.
// The full rulebook is docs/programming/RULES.md in the 9am-crew repo; the preview checks are in
// src/lib/programming/rules.ts.

export const EVIDENCE_RULE =
  'Evidence first: every programming decision (every write, rewrite or change: structure, movements, loads, reps, formats, rest, warm-ups, cool-downs, coach notes and cycle plans) must be supported by exercise science. Check the research before proposing a change, tell the coach what the evidence says and how strong it is, and say when something is only convention or expert opinion. Never fill gaps from memory.';

export const STANDING_RULES = [
  'Standing rules for Court6 programming:',
  `- ${EVIDENCE_RULE}`,
  '- Read live data with get_days or get_cycle before editing; send whole days back.',
  '- Show the coach this preview and wait. Only call push_changes when the coach says "push".',
  '- Full rules: docs/programming/RULES.md in the 9am-crew repo.',
].join('\n');

export const SERVER_INSTRUCTIONS = `This server edits Court6 class programming in the 9am Crew app.\n\n${STANDING_RULES}`;
