'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { Avatar } from './Avatar';
import { firstName } from '@/lib/ui';
import { byPerson, REACTIONS, type Reaction } from '@/lib/reactions';

/**
 * Hold a message (or tap its reactions): pick an emoji, and see who reacted with what.
 * Uses plain Avatar, not PersonAvatar: PersonAvatar's own sheet would open underneath this one.
 */
export function ReactionMenu({
  preview,
  reactions,
  meId,
  people,
  onToggle,
  onClose,
}: {
  /** A non-interactive copy of the message. */
  preview: ReactNode;
  /** This message's reactions. */
  reactions: Reaction[];
  meId: string;
  people: Record<string, { name: string; animal?: string | null }>;
  onToggle: (emoji: string) => void;
  /** Must be stable (useCallback). */
  onClose: () => void;
}) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    bar.current?.querySelector('button')?.focus();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      back?.focus?.();
    };
  }, [onClose]);

  const rows = byPerson(reactions, meId);
  return (
    <div
      className="react-menu"
      // pointerdown, not click: the hold that opened this menu ends with a pointerup over it.
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="react-menu-col" role="dialog" aria-modal="true" aria-label="Reactions">
        <div className="react-menu-bar" ref={bar} role="group" aria-label="React">
          {REACTIONS.map((e) => {
            const on = reactions.some((r) => r.emoji === e && r.user_id === meId);
            return (
              <button
                key={e}
                type="button"
                aria-pressed={on}
                aria-label={on ? `Remove your ${e}` : `React ${e}`}
                onClick={() => {
                  onToggle(e);
                  onClose();
                }}
              >
                {e}
              </button>
            );
          })}
        </div>
        <div className="react-menu-preview" aria-hidden="true">
          {preview}
        </div>
        {rows.length > 0 && (
          <div className="react-menu-list">
            <div className="eyebrow">Reactions</div>
            {rows.map(({ userId, emojis }) => {
              const me = userId === meId;
              const who = people[userId];
              const full = who?.name ?? 'Member';
              return (
                <div key={userId} className="react-menu-row">
                  <Avatar id={userId} name={full} animal={who?.animal} size="sm" />
                  <span className="grow">{me ? 'You' : firstName(full)}</span>
                  <span className="react-menu-emojis">
                    {emojis.map((e) =>
                      me ? (
                        <button key={e} type="button" aria-label={`Remove your ${e}`} onClick={() => onToggle(e)}>
                          {e}
                        </button>
                      ) : (
                        <span key={e}>{e}</span>
                      ),
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
