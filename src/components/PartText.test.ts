import { describe, expect, it } from 'vitest';
import { levelGroups } from './PartText';
import type { Part } from '@/lib/types';

const names = ['Gentle', 'Steady', 'Strong', 'Full'];
const part = (versions: string[]) => ({ kind: 'warmup', label: 'Warm-up', title: 'Warm-up', versions }) as unknown as Part;

describe('levelGroups', () => {
  it('shows identical levels once', () => {
    expect(levelGroups(part(['Jog', 'Jog', 'Jog ', 'Jog']), false, names).map((g) => g.label)).toEqual(['All levels']);
  });
  it('merges only the levels that match', () => {
    expect(levelGroups(part(['Walk', 'Jog', 'Jog', 'Jog']), false, names).map((g) => g.label)).toEqual(['Gentle', 'Steady, Strong & Full']);
    expect(levelGroups(part(['A', 'B', 'C', 'C']), false, names).map((g) => g.label)).toEqual(['Gentle', 'Steady', 'Strong & Full']);
  });
});
