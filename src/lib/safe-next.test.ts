import { describe, expect, it } from 'vitest';
import { safeNext } from './safe-next';

const origin = 'https://9amcrew.ca';

describe('safeNext', () => {
  it('keeps paths on this site', () => {
    expect(safeNext('/oauth/consent?authorization_id=a', origin)).toBe('/oauth/consent?authorization_id=a');
    expect(safeNext('/workouts', origin)).toBe('/workouts');
  });
  it.each(['//evil.com', '/\\evil.com', '/\t/evil.com', 'https://evil.com', 'javascript:alert(1)', '', null, undefined])('rejects %j', (raw) => {
    expect(safeNext(raw, origin)).toBe('/');
  });
});
