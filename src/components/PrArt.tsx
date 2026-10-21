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
  const [drawing, start] = useTransition();
  const [note, setNote] = useState('');
  const router = useRouter();
  const close = useCallback(() => setOpen(false), []);

  // The card closes straight away; Claude keeps drawing and the medal shows it's working.
  const draw = useCallback(() => {
    if (!target) return;
    setNote('');
    setOpen(false);
    start(async () => {
      const r = await redrawPrArt(target.userId, target.movementId);
      if (r && 'error' in r && r.error) setNote(r.error);
      else router.refresh();
    });
  }, [target, router]);
  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)');
    setStill(q.matches);
    const on = () => setStill(q.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  const src = art ? (still ? `${art}&still=1` : art) : null;
  const tappable = !drawing && (Boolean(src) || (canRedraw && target));

  const medal = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={58} height={58} />
  ) : (
    <span aria-hidden="true">🏆</span>
  );

  if (drawing) {
    return (
      <div className="pr-medal drawing" role="status" aria-label="Claude is drawing it">
        <span aria-hidden="true">✏️</span>
      </div>
    );
  }
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
      {note && (
        <span className="sr-only" role="alert">
          {note}
        </span>
      )}
      {open && <ArtSheet src={src} caption={caption} canDraw={Boolean(canRedraw && target)} note={note} onDraw={draw} onClose={close} />}
    </>
  );
}

function ArtSheet({
  src,
  caption,
  canDraw,
  note,
  onDraw,
  onClose,
}: {
  src: string | null;
  caption: string;
  canDraw: boolean;
  note: string;
  onDraw: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', key);
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = before;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="person-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={caption}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClose();
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
        {canDraw && (
          <button
            type="button"
            className="btn small ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDraw();
            }}
          >
            {src ? 'Redraw' : 'Draw it'}
          </button>
        )}
        {canDraw && <p className="muted small">Takes about half a minute. You can carry on; it appears when it’s ready.</p>}
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
