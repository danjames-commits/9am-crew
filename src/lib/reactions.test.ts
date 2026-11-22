import { describe, expect, it } from 'vitest';
import { byPerson, pillLabel, REACTIONS, same, summarize, type Reaction } from './reactions';

const r = (user_id: string, emoji: string, message_id = 1): Reaction => ({ message_id, user_id, emoji });

describe('REACTIONS', () => {
  it('matches the database check constraint, in order', () => {
    expect([...REACTIONS]).toEqual(['👍', '❤️', '😂', '🔥', '💪', '🎉']);
  });
});

describe('same', () => {
  it('compares message, user and emoji', () => {
    expect(same(r('a', '👍'), r('a', '👍'))).toBe(true);
    expect(same(r('a', '👍'), r('a', '❤️'))).toBe(false);
    expect(same(r('a', '👍'), r('b', '👍'))).toBe(false);
    expect(same(r('a', '👍', 1), r('a', '👍', 2))).toBe(false);
  });
});

describe('summarize', () => {
  it('is empty for no reactions', () => {
    expect(summarize([], 'me')).toEqual({ top: [], total: 0, mine: false, counts: [] });
  });

  it('puts the most used first, caps top at 3, and counts every reaction', () => {
    const list = [r('a', '👍'), r('a', '❤️'), r('b', '❤️'), r('c', '❤️'), r('b', '😂'), r('c', '😂'), r('d', '🔥'), r('e', '🔥')];
    const s = summarize(list, 'me');
    expect(s.top).toEqual(['❤️', '😂', '🔥']);
    expect(s.total).toBe(8);
    expect(s.counts).toEqual([
      { emoji: '❤️', n: 3 },
      { emoji: '😂', n: 2 },
      { emoji: '🔥', n: 2 },
      { emoji: '👍', n: 1 },
    ]);
  });

  it('breaks ties by the order of the emoji set', () => {
    expect(summarize([r('a', '🎉'), r('b', '👍')], 'me').top).toEqual(['👍', '🎉']);
  });

  it('flags when one of the reactions is mine', () => {
    expect(summarize([r('a', '👍')], 'me').mine).toBe(false);
    expect(summarize([r('a', '👍'), r('me', '🔥')], 'me').mine).toBe(true);
  });
});

describe('byPerson', () => {
  it('puts me first, then others by first reaction, emoji in set order', () => {
    const list = [r('b', '🔥'), r('a', '❤️'), r('me', '😂'), r('b', '👍')];
    expect(byPerson(list, 'me')).toEqual([
      { userId: 'me', emojis: ['😂'] },
      { userId: 'b', emojis: ['👍', '🔥'] },
      { userId: 'a', emojis: ['❤️'] },
    ]);
  });

  it('keeps arrival order when I have not reacted', () => {
    expect(byPerson([r('b', '👍'), r('a', '👍')], 'me').map((p) => p.userId)).toEqual(['b', 'a']);
  });

  it('is empty for no reactions', () => {
    expect(byPerson([], 'me')).toEqual([]);
  });
});

describe('pillLabel', () => {
  it('lists every emoji with its count', () => {
    const list = [r('a', '❤️'), r('b', '❤️'), r('c', '❤️'), r('a', '😂'), r('b', '😂'), r('c', '🔥'), r('d', '🔥')];
    expect(pillLabel(summarize(list, 'me'))).toBe('7 reactions: ❤️ 3, 😂 2, 🔥 2. Show who reacted.');
  });

  it('uses the singular for one', () => {
    expect(pillLabel(summarize([r('a', '👍')], 'me'))).toBe('1 reaction: 👍 1. Show who reacted.');
  });
});
