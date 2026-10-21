'use client';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { redrawPrArt } from '@/app/actions';

/**
 * The medal on a personal-best card: their spirit animal doing the lift, looping
 * (a still frame if they've asked their phone to reduce motion), or the 🏆 until
 * Claude has drawn it. Tap for a big view. Admins can (re)draw it from there.
 */
export function PrArt({
  art,
  caption,
  target,
  canRedraw = false,
}: {
  art?: string;
  caption: string;
  target?: { userId: string; movementId: number };
  canRedraw?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [still, setStill] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)');
    setStill(q.matches);
    const on = () => setStill(q.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  const src = art ? (still ? `${art}&still=1` : art) : null;
  const tappable = Boolean(src) || (canRedraw && target);

  const medal = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={58} height={58} />
  ) : (
    <span aria-hidden="true">🏆</span>
  );

  if (!tappable) return <div className={`pr-medal ${src ? 'art' : ''}`}>{medal}</div>;
  return (
    <>
      <button
        type="button"
        className={`pr-medal ${src ? 'art' : ''}`}
        aria-label={src ? `See ${caption} big` : `Draw ${caption}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {medal}
      </button>
      {open && <ArtSheet src={src} caption={caption} target={target} canRedraw={canRedraw} onClose={close} />}
    </>
  );
}

function ArtSheet({
  src,
  caption,
  target,
  canRedraw,
  onClose,
}: {
  src: string | null;
  caption: string;
  target?: { userId: string; movementId: number };
  canRedraw: boolean;
  onClose: () => void;
}) {
  const [drawing, start] = useTransition();
  const [note, setNote] = useState('');
  const router = useRouter();

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && !drawing && onClose();
    document.addEventListener('keydown', key);
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = before;
    };
  }, [onClose, drawing]);

  function redraw() {
    if (!target) return;
    setNote('');
    start(async () => {
      const r = await redrawPrArt(target.userId, target.movementId);
      if (r && 'error' in r && r.error) setNote(r.error);
      else {
        router.refresh();
        onClose();
      }
    });
  }

  return createPortal(
    <div
      className="person-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={caption}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!drawing) onClose();
      }}
    >
      <div className="person-card">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={caption} className="pr-art-big" width={220} height={220} />
        ) : (
          <div className="pr-art-big pr-art-empty" aria-hidden="true">
            🏆
          </div>
        )}
        <div className="person-line">
          <b>{caption}</b>
        </div>
        {canRedraw && target && (
          <button
            type="button"
            className="btn small ghost"
            disabled={drawing}
            onClick={(e) => {
              e.stopPropagation();
              redraw();
            }}
          >
            {drawing ? 'Claude is drawing… (about 30 seconds)' : src ? 'Redraw' : 'Draw it'}
          </button>
        )}
        {note && (
          <p className="small" role="alert">
            {note}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
