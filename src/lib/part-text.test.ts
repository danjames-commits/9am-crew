import { describe, expect, it } from 'vitest';
import { splitPartText } from './part-text';

describe('splitPartText', () => {
  it('turns a "·" line with a lead-in into a labeled list', () => {
    expect(splitPartText('2 rounds: 200 m easy row · 10 air squats')).toEqual([
      { kind: 'list', label: '2 rounds', items: ['200 m easy row', '10 air squats'] },
    ]);
  });
  it('makes an unlabeled list and capitalizes items', () => {
    expect(splitPartText("3 min easy bike · couch stretch 1 min each side · child's pose 1 min")).toEqual([
      { kind: 'list', label: null, items: ['3 min easy bike', 'Couch stretch 1 min each side', "Child's pose 1 min"] },
    ]);
  });
  it('leaves lines without "·" as text', () => {
    expect(splitPartText('6 rounds: 0:30 hard, 1:30 easy\nWrite down your total calories.')).toEqual([
      { kind: 'text', text: '6 rounds: 0:30 hard, 1:30 easy' },
      { kind: 'text', text: 'Write down your total calories.' },
    ]);
  });
  it('does not treat a time as a label', () => {
    expect(splitPartText('0:30 hard · 1:30 easy')).toEqual([
      { kind: 'list', label: null, items: ['0:30 hard', '1:30 easy'] },
    ]);
  });
  it('keeps mixed lines in order', () => {
    const blocks = splitPartText('2 rounds: a · b\nLeave 3 reps in the tank.');
    expect(blocks.map((b) => b.kind)).toEqual(['list', 'text']);
  });
});
