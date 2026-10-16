import { describe, expect, it } from 'vitest';
import { decide, combineHours, type ClassHourWeather } from './weather-rules';
import { CONDITIONING } from './programming/library';

const mild: ClassHourWeather = { tempC: 9, feelsC: 6, windKmh: 12, gustKmh: 25, precipProb: 10, precipMm: 0, code: 2 };

describe('inside or outside', () => {
  it('a mild October morning is an outside day', () => {
    const w = decide(mild);
    expect(w.outside).toBe(true);
    expect(w.detail).toBe('9°, feels 6° · light wind · 10% chance of rain');
  });
  it('rain, snow, storms, ice, cold, heat and gales send us inside', () => {
    expect(decide({ ...mild, precipProb: 70, precipMm: 1.2, code: 63 }).headline).toMatch(/rain likely/);
    expect(decide({ ...mild, code: 73 }).headline).toMatch(/snow/);
    expect(decide({ ...mild, code: 95 }).headline).toMatch(/thunder/);
    expect(decide({ ...mild, code: 66 }).headline).toMatch(/freezing/);
    expect(decide({ ...mild, feelsC: -15 }).outside).toBe(false);
    expect(decide({ ...mild, feelsC: 31 }).outside).toBe(false);
    expect(decide({ ...mild, gustKmh: 70 }).outside).toBe(false);
  });
  it('a small chance of a shower is still fine', () => {
    expect(decide({ ...mild, precipProb: 30, precipMm: 0.1, code: 61 }).outside).toBe(true);
  });
  it('cold but dry says dress warm', () => {
    expect(decide({ ...mild, tempC: 1, feelsC: -4 }).headline).toMatch(/dress warm/);
  });
  it('uses the worse of the two class hours', () => {
    const c = combineHours(mild, { ...mild, precipProb: 80, precipMm: 2, code: 63 });
    expect(decide(c).outside).toBe(false);
  });
});

describe('workout library', () => {
  it('has no partner workouts', () => {
    const all = JSON.stringify(CONDITIONING).toLowerCase();
    expect(all).not.toMatch(/partner|\bpair\b|take turns/);
  });
  it('every outside version has all four levels', () => {
    for (const list of Object.values(CONDITIONING))
      for (const c of list) {
        expect(c.versions).toHaveLength(4);
        if (c.outdoor) expect(c.outdoor.versions).toHaveLength(4);
      }
  });
});
