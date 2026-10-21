import { avatarColor, initials } from "@/lib/ui";
import { animalName, customVersion, isAnimal } from "@/lib/animals";

const SIZES = { sm: 34, md: 40, lg: 72, xl: 168 } as const;

/** A person's spirit animal with their initials on a little badge, or just their initials. */
export function Avatar({
  id,
  name,
  animal,
  size = "md",
  ring,
  hidden,
  picture,
}: {
  id: string;
  name: string;
  animal?: string | null;
  size?: keyof typeof SIZES;
  /** Border colour, for overlapping stacks of avatars. */
  ring?: string;
  /** Keeps the space but hides it (for runs of chat messages). */
  hidden?: boolean;
  /** Show this picture instead (an unsaved drawing on the Me page). */
  picture?: string;
}) {
  const px = SIZES[size];
  const label =
    animal && isAnimal(animal) ? `${name} (${animalName(animal)})` : name;
  const base: React.CSSProperties = {
    width: px,
    height: px,
    background: avatarColor(id),
    position: "relative",
    visibility: hidden ? "hidden" : undefined,
    border: ring ? `2px solid ${ring}` : undefined,
    fontSize: size === "xl" ? 54 : size === "lg" ? 24 : size === "sm" ? 12 : 14,
  };

  const custom = customVersion(animal);
  const src = picture
    ? picture
    : custom
      ? `/avatar/${id}?v=${custom}`
      : animal && isAnimal(animal)
        ? `/animals/${animal}.svg`
        : null;
  if (!src) {
    return (
      <span
        className="avatar"
        style={base}
        title={name}
        aria-label={name}
        role="img"
      >
        {initials(name)}
      </span>
    );
  }

  const badge = Math.round(px * 0.48);
  return (
    <span
      className="avatar"
      style={{ ...base, overflow: "visible" }}
      title={label}
      aria-label={label}
      role="img"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={Math.round(px * (custom || picture ? 0.84 : 0.68))}
        height={Math.round(px * (custom || picture ? 0.84 : 0.68))}
        style={{ display: "block" }}
      />
      {/* The big one (tap-to-see card) has the full name right under it, so no initials. */}
      {size !== "xl" && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: -Math.round(px * 0.1),
            bottom: -Math.round(px * 0.1),
            minWidth: badge,
            height: badge,
            padding: "0 3px",
            borderRadius: badge / 2,
            background: "var(--ink)",
            color: "#fff",
            fontSize: Math.max(9, Math.round(px * 0.24)),
            fontWeight: 800,
            lineHeight: `${badge}px`,
            textAlign: "center",
            boxShadow: "0 0 0 2px #fff",
            letterSpacing: "0.02em",
          }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}
