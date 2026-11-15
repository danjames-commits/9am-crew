import { describe, expect, it } from 'vitest';
import type { Part } from '../types';
import { checkDayRules, checkRepeats, type RuleDay } from './rules';

const three = (s: string) => [s, s, s] as Part['versions'];
const warmup: Part = { kind: 'warmup', label: 'Warm-up', title: 'Warm-up', versions: three('2 min easy row · couch stretch 30 s each side · pigeon stretch 30 s each side') };
const cooldown: Part = { kind: 'cooldown', label: 'Cool-down', title: 'Cool-down', versions: three('3 min easy bike · couch stretch 1 min · child\'s pose 1 min') };
const conditioning = (inside: string, outside?: string, title = 'Rounds'): Part => ({
  kind: 'conditioning',
  label: 'Conditioning',
  title,
  versions: three(inside),
  ...(outside ? { outdoor: { title: `${title} outside`, versions: three(outside) } } : {}),
});
const dayWith = (...parts: Part[]): RuleDay => ({ title: 'Squat + Rounds', focus: 'Squat', why: 'Heavy squats, then rounds.', parts: [warmup, ...parts, cooldown] });
const good = conditioning('4 rounds for time:\n8/10 cal air bike · 15 wall balls (10/14 lb)', '4 rounds for time:\n200 m run · 15 wall balls (10/14 lb)');

const problemsOf = (d: RuleDay, date = '2026-11-16') => checkDayRules(date, d).problems;

describe('checkDayRules', () => {
  it('passes a day that follows the rules', () => {
    const r = checkDayRules('2026-11-16', dayWith(good));
    expect(r.problems).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('blocks banned equipment and HYROX in member text', () => {
    expect(problemsOf(dayWith(conditioning('25 m sled push · 10 burpees', '25 m sled push · 10 burpees')))).toEqual(expect.arrayContaining([expect.stringMatching(/sled/)]));
    expect(problemsOf(dayWith(conditioning('20/15 cal SkiErg', '200 m run')))).toEqual(expect.arrayContaining([expect.stringMatching(/SkiErg/)]));
    expect(problemsOf({ ...dayWith(good), why: 'HYROX prep' })).toEqual(expect.arrayContaining([expect.stringMatching(/HYROX/)]));
    expect(problemsOf(dayWith(conditioning('With a partner: 500 m row', 'With a partner: 400 m run')))).toEqual(expect.arrayContaining([expect.stringMatching(/partner/)]));
  });

  it('blocks cues in member text but lets warm-ups and cool-downs say easy', () => {
    expect(problemsOf(dayWith(good))).toEqual([]);
    const cued = conditioning('Easy pace. 500 m row · 10 burpees\nNo rower free? 50 jumping jacks.', '400 m run · 10 burpees');
    const p = problemsOf(dayWith(cued));
    expect(p.join(' ')).toMatch(/"easy"/);
    expect(p.join(' ')).toMatch(/No machine free/);
  });

  it('blocks runs that are short, off the 200 m steps, or set by time', () => {
    expect(problemsOf(dayWith(conditioning('300 m row', '250 m run')))).toEqual(expect.arrayContaining([expect.stringMatching(/steps of 200 m/)]));
    expect(problemsOf(dayWith(conditioning('150 m row', '100 m run')))).toEqual(expect.arrayContaining([expect.stringMatching(/at least 200 m/)]));
    expect(problemsOf(dayWith(conditioning('2 min row', '2 min run')))).toEqual(expect.arrayContaining([expect.stringMatching(/by distance/)]));
    expect(problemsOf(dayWith(conditioning('1,000 m row', '1 km run')))).toEqual([]);
  });

  it('blocks percentages off the 5% steps and heavier-first loads', () => {
    const press: Part = { kind: 'strength', label: 'Strength', title: 'Press', versions: three('Strict press: 5 × 3 @ 77.5%'), lift: { movement: 'Strict press', pct: [77.5, 77.5, 77.5] } };
    const p = problemsOf(dayWith(press, conditioning('15 wall balls (14/10 lb) · 500 m row', '15 wall balls (14/10 lb) · 400 m run')));
    expect(p.join(' ')).toMatch(/steps of 5 \(found 77.5%\)/);
    expect(p.join(' ')).toMatch(/lighter load first/);
  });

  it('blocks side planks and hollow holds in conditioning, but not in accessories', () => {
    expect(problemsOf(dayWith(conditioning('500 m row · 20 s side plank', '400 m run · 20 s side plank')))).toEqual(expect.arrayContaining([expect.stringMatching(/side planks/)]));
    const acc: Part = { kind: 'skill', label: 'Accessory', title: 'Abs', versions: three('3 rounds: 30 s hollow hold') };
    expect(problemsOf(dayWith(good, acc))).toEqual([]);
  });

  it('keeps named workouts official at Full', () => {
    const helen = conditioning(
      '3 rounds for time:\n500 m row · 21 kettlebell swings (35/53 lb) · 12 pull-ups',
      '3 rounds for time:\n400 m run · 21 kettlebell swings (35/53 lb) · 12 pull-ups',
      'Helen',
    );
    expect(problemsOf(dayWith(helen))).toEqual([]);
    const changed = { ...helen, outdoor: { title: 'Helen outside', versions: three('3 rounds for time:\n400 m run · 15 kettlebell swings (35/53 lb) · 12 pull-ups') } };
    expect(problemsOf(dayWith(changed)).join(' ')).toMatch(/official named workout.*21 kettlebell swings/);
    const murph = conditioning('For time: 1 mile run · 100 pull-ups · 200 push-ups · 300 air squats · 1 mile run', undefined, 'Murph');
    expect(problemsOf(dayWith(murph))).toEqual([]);
  });

  it('warns about a missing outside version, few stretches and Thursday order', () => {
    const acc: Part = { kind: 'skill', label: 'Accessory', title: 'Arms', versions: three('3 rounds: 12 dumbbell curls') };
    const thin: Part = { ...warmup, versions: three('2 min easy row') };
    const thu: RuleDay = { title: 'Thursday', focus: 'Aerobic', why: 'Intervals.', parts: [thin, acc, conditioning('500 m row · 10 sit-ups'), cooldown] };
    const w = checkDayRules('2026-11-19', thu).warnings.join(' ');
    expect(w).toMatch(/no outside version/);
    expect(w).toMatch(/Warm-up has 0 stretches/);
    expect(w).toMatch(/Thursday: conditioning comes before accessories/);
  });
});

describe('checkRepeats', () => {
  it('warns when a movement repeats within 2 class days, counting Friday to Monday as 1', () => {
    const wb = [conditioning('15 wall balls (10/14 lb) · 500 m row')];
    const swings = [conditioning('15 kettlebell swings (26/35 lb) · 500 m row')];
    const w = checkRepeats(['2026-11-23'], { '2026-11-20': wb, '2026-11-23': wb, '2026-11-25': wb, '2026-11-26': swings });
    expect(w).toEqual(['2026-11-23: wall balls also on 2026-11-20 (within 2 class days).', '2026-11-23: wall balls also on 2026-11-25 (within 2 class days).']);
    expect(checkRepeats(['2026-11-23'], { '2026-11-23': wb, '2026-11-26': wb })).toEqual([]);
  });
});
