import { describe, expect, it } from 'vitest';
import { loadBar, plateChange, planLoads } from './plates';

describe('loading the bar', () => {
  it('picks the fewest plates per side', () => {
    expect(loadBar(60)?.side).toEqual([5, 2.5]);
    expect(loadBar(85)?.side).toEqual([15, 5]);
    expect(loadBar(115)?.side).toEqual([35]);
    expect(loadBar(145)?.side).toEqual([45, 5]);
    expect(loadBar(225)?.side).toEqual([45, 45]);
    expect(loadBar(47)?.side).toEqual([1]);
    expect(loadBar(45)?.side).toEqual([]);
  });
  it('handles other bars and light weights', () => {
    expect(loadBar(65, 35)?.side).toEqual([15]);
    expect(loadBar(30)).toBeNull();
  });
  it('says what comes off and goes on between sets', () => {
    expect(plateChange([45], [45, 5])).toEqual({ off: [], on: [5] });
    expect(plateChange([15, 5], [35])).toEqual({ off: [15, 5], on: [35] });
    expect(plateChange([], [5, 2.5])).toEqual({ off: [], on: [5, 2.5] });
  });
  it('builds up by adding on top when that is simpler', () => {
    expect(planLoads([null, 60, 85, 115, 145]).map((l) => l?.side)).toEqual([[], [5, 2.5], [15, 5], [35], [35, 15]]);
    expect(planLoads([135, 155]).map((l) => l?.side)).toEqual([[45], [45, 10]]);
  });
});
