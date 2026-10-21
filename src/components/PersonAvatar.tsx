"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ANIMALS, customVersion } from "@/lib/animals";
import { Avatar } from "./Avatar";

/**
 * Someone else's avatar. Tap it for a quick look: their spirit animal big,
 * their name, and what the animal is (or what they asked Claude to draw).
 * Hovering with a mouse still shows their name.
 */
export function PersonAvatar({
  id,
  name,
  animal,
  size = "sm",
}: {
  id: string;
  name: string;
  animal?: string | null;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        className="person"
        aria-label={`${name}: see their spirit animal`}
        onClick={(e) => {
          // It may sit inside a link (a personal-best card): open the card, don't follow the link.
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Avatar id={id} name={name} animal={animal} size={size} />
        <span className="name-tip" aria-hidden="true">
          {name}
        </span>
      </button>
      {open && (
        <PersonCard
          id={id}
          name={name}
          animal={animal ?? null}
          onClose={close}
        />
      )}
    </>
  );
}

function PersonCard({
  id,
  name,
  animal,
  onClose,
}: {
  id: string;
  name: string;
  animal: string | null;
  onClose: () => void;
}) {
  const preset = ANIMALS.find((a) => a.id === animal);
  const drawn = Boolean(customVersion(animal));
  const [prompt, setPrompt] = useState<string | null>(null);
  const supabase = useMemo(() => (drawn ? supabaseBrowser() : null), [drawn]);
  const startY = useRef<number | null>(null);
  const [drag, setDrag] = useState(0);

  // What they asked Claude to draw.
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    supabase
      .from("avatars")
      .select("prompt")
      .eq("user_id", id)
      .maybeSingle()
      .then(
        ({ data }) =>
          live && setPrompt((data?.prompt as string | undefined) ?? ""),
      );
    return () => {
      live = false;
    };
  }, [supabase, id]);

  // Escape closes; the page behind doesn't scroll while it's open.
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = before;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="person-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={name}
      // The card is portalled, but React events still bubble to the avatar's parents: stop them here.
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }}
      onPointerDown={(e) => (startY.current = e.clientY)}
      onPointerMove={(e) =>
        startY.current !== null &&
        setDrag(Math.max(0, e.clientY - startY.current))
      }
      onPointerUp={() => {
        if (drag > 70) onClose();
        startY.current = null;
        setDrag(0);
      }}
    >
      <div
        className="person-card"
        style={
          drag
            ? {
                transform: `translateY(${drag}px)`,
                opacity: Math.max(0.4, 1 - drag / 300),
              }
            : undefined
        }
      >
        <Avatar id={id} name={name} animal={animal} size="xl" />
        <div className="person-name">{name}</div>
        <div className="muted person-line">
          {drawn ? (
            prompt === null ? (
              " "
            ) : prompt ? (
              <>
                “{prompt}”<span className="small"> · drawn by Claude</span>
              </>
            ) : (
              "Drawn by Claude"
            )
          ) : preset ? (
            <>
              <b>{preset.name}</b> · {preset.vibe}
            </>
          ) : (
            "No spirit animal yet"
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
