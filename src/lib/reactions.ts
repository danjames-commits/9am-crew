/** Emoji reactions on chat messages (table message_reactions, migration 027). */
export interface Reaction {
  message_id: number;
  user_id: string;
  emoji: string;
}

/** The six emoji, in display order. Must match the database check constraint. */
export const REACTIONS = ['👍', '❤️', '😂', '🔥', '💪', '🎉'] as const;

export const same = (a: Reaction, b: Reaction) => a.message_id === b.message_id && a.user_id === b.user_id && a.emoji === b.emoji;

export interface Summary {
  /** Up to three distinct emoji, most used first (ties in set order). */
  top: string[];
  total: number;
  /** One of these reactions is mine. */
  mine: boolean;
  counts: { emoji: string; n: number }[];
}

/** What the pill on a message shows. `list` is one message's reactions. */
export function summarize(list: Reaction[], meId: string): Summary {
  // Array.prototype.sort is stable, so equal counts keep the set order.
  const counts = REACTIONS.map((emoji) => ({ emoji: emoji as string, n: list.filter((r) => r.emoji === emoji).length }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n);
  return { top: counts.slice(0, 3).map((c) => c.emoji), total: list.length, mine: list.some((r) => r.user_id === meId), counts };
}

/** Who reacted, one row per person: me first, then everyone else by their first reaction. */
export function byPerson(list: Reaction[], meId: string): { userId: string; emojis: string[] }[] {
  const order: string[] = [];
  for (const r of list) if (!order.includes(r.user_id)) order.push(r.user_id);
  const ids = order.includes(meId) ? [meId, ...order.filter((id) => id !== meId)] : order;
  return ids.map((userId) => ({ userId, emojis: REACTIONS.filter((e) => list.some((r) => r.user_id === userId && r.emoji === e)) }));
}

/** Screen-reader label for the pill. */
export function pillLabel(s: Summary): string {
  const parts = s.counts.map((c) => `${c.emoji} ${c.n}`).join(', ');
  return `${s.total} ${s.total === 1 ? 'reaction' : 'reactions'}: ${parts}. Show who reacted.`;
}
