import { describe, expect, it } from 'vitest';
import { loadBar, plateChange, planLoads } from './plates';

describe('loading the bar', () => {
  it('uses big plates, with at most one small one on the outside', () => {
    expect(loadBar(85)).toEqual({ side: [15, 5], total: 85 });
    expect(loadBar(115)).toEqual({ side: [35], total: 115 });
    expect(loadBar(145)).toEqual({ side: [45, 5], total: 145 });
    expect(loadBar(225)).toEqual({ side: [45, 45], total: 225 });
    expect(loadBar(150)).toEqual({ side: [35, 15, 2.5], total: 150 }); // not 45 + 5 + 2.5
    expect(loadBar(140)).toEqual({ side: [45, 2.5], total: 140 });
    expect(loadBar(45)).toEqual({ side: [], total: 45 });
  });
  it('never puts two small plates together or a small one on its own', () => {
    expect(loadBar(60)).toEqual({ side: [10], total: 65 }); // not 5 + 2.5
    expect(loadBar(47)).toEqual({ side: [], total: 45 }); // not a lone 1
    expect(loadBar(152.5)?.side.filter((p) => p <= 5).length).toBeLessThanOrEqual(1);
    for (let w = 45; w <= 400; w += 2.5) {
      const side = loadBar(w)!.side;
      const small = side.filter((p) => p <= 5);
      expect(small.length).toBeLessThanOrEqual(1);
      if (small.length) expect(side.indexOf(small[0])).toBe(side.length - 1);
      if (small.length) expect(side.length).toBeGreaterThan(1);
      expect([...side].sort((a, b) => b - a)).toEqual(side);
    }
  });
  it('handles other bars and light weights', () => {
    expect(loadBar(65, 35)?.side).toEqual([15]);
    expect(loadBar(30)).toBeNull();
  });
  it('says what comes off and goes on between sets', () => {
    expect(plateChange([45], [45, 5])).toEqual({ off: [], on: [5] });
    expect(plateChange([15, 5], [35])).toEqual({ off: [15, 5], on: [35] });
  });
  it('builds up by adding on top when that is simpler', () => {
    expect(planLoads([null, 60, 85, 115, 145]).map((l) => l && [l.side, l.total])).toEqual([
      [[], 45],
      [[10], 65],
      [[10, 10], 85],
      [[35], 115],
      [[35, 15], 145],
    ]);
    expect(planLoads([135, 155]).map((l) => l?.side)).toEqual([[45], [45, 10]]);
  });
});
