import { describe, expect, it } from 'vitest';
import { equipmentIn } from './equipment';

describe('equipmentIn', () => {
  it('finds the kit, in pick-up order', () => {
    expect(equipmentIn(['Back squat 5×5', '500 m row · 21 kettlebell swings · 12 box jumps'])).toEqual(['Barbell', 'Kettlebell', 'Box', 'Rower']);
    expect(equipmentIn(['500 m row'], { barbellLift: true })).toEqual(['Barbell', 'Rower']);
  });
  it('a ring row is rings, not a rower', () => {
    expect(equipmentIn(['10 ring rows · 10 push-ups'])).toEqual(['Rings']);
  });
  it('a lift done with dumbbells is not a barbell lift', () => {
    expect(equipmentIn(['8 Romanian deadlifts, light dumbbells · goblet squats'])).toEqual(['Dumbbells', 'Kettlebell']);
  });
  it('bar work on the rig is the pull-up bar', () => {
    expect(equipmentIn(['toes-to-bar practice · 3 hanging knee raises'])).toEqual(['Pull-up bar']);
  });
  it('a plain or single-leg deadlift is not a barbell', () => {
    expect(equipmentIn(['5 light single-leg Romanian deadlifts each side · 10 band pull-aparts'])).toEqual(['Bands']);
    expect(equipmentIn(['Deadlift test: build to a heavy 3'], { barbellLift: true })).toEqual(['Barbell']);
  });
  it('nothing for bodyweight days', () => {
    expect(equipmentIn(['10 air squats · 10 push-ups · 200 m jog'])).toEqual([]);
  });
});
