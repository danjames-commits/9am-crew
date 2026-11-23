# Chat reactions: see who reacted, and react like iMessage / Instagram

Date: 2026-11-22 · Status: draft for Jake's review

## Why

Reactions shipped in migration 027 (`9695614`). Today ([`ChatRoom.tsx`](../../../src/components/ChatRoom.tsx)):

- A single tap on a message opens a row of six emoji under it.
- Each emoji someone used shows as a separate chip under the bubble.
- The only way to see who reacted is the chip's `title` tooltip, which phones never show. On a phone you can't find out who reacted.
- Because a single tap opens the picker, scrolling and tapping near links open it by accident.

**Success:** a member presses and holds a message, sees who reacted and with what, and adds or removes their own reaction in one place. Double-tapping a message adds a ❤️ quickly. Each reacted message shows one tidy pill on its corner, not a row of chips.

## Decisions (agreed with Jake)

| Question | Decision |
|---|---|
| Reactions per person | **Keep multiple.** A person can still put several different emoji on one message. No schema change. |
| Gesture | **Press and hold opens the menu; double-tap adds ❤️.** A single tap does nothing. |
| Who reacted | **Shown inside the hold menu** (iMessage style). No separate sheet. |
| Reactions on the bubble | **One pill overlapping the bubble's bottom corner; tapping it opens the hold menu** (Instagram style). |

## Non-goals

- Any database change. The table, the six emoji (`👍 ❤️ 😂 🔥 💪 🎉`), the RLS policies and realtime all stay as they are.
- Custom or extra emoji, emoji search.
- Push notifications for reactions.
- Changing PR-card cheers. `PrCard` / `CheerPop` stay as they are.
- Reply-to-message, copy or delete actions in the hold menu. The menu is for reactions only. It is built so actions could be added later, but none are in scope.
- Lifting the message in place the way iMessage does (see Approach).

## Approach

The gestures need pointer handling. Options considered:

1. **Our own small hook using pointer events. Chosen.** It covers two gestures, needs no dependency, and is easy to test with fake timers.
2. A gesture library. Rejected: it would be a heavy addition for two gestures, and the app has no runtime dependencies beyond Next, React and Supabase.

For the menu layout:

1. **A centred overlay (emoji bar, a copy of the message, the reactions list). Chosen.** It looks the same on any screen size and isn't affected by the on-screen keyboard.
2. Lifting the message in place and anchoring the picker to it. Rejected: it needs position math that fails near the top and bottom of the screen and while the keyboard is open, and small phones would clip it.

## Design

### 1. Gestures: `src/lib/useMessagePress.ts`

A hook, `useMessagePress({ onHold(id), onDoubleTap(id) })`, returns one set of props to spread on every message element (each tagged `data-id`). The timing logic lives in a pure state machine, `pressMachine`, so tests can drive it with fake timers and no DOM.

- **Hold:** `pointerdown` starts a 450 ms timer. If the pointer moves more than 10 px from where it started, or `pointerup`, `pointercancel` or `pointerleave` fires first, the timer is cancelled (so scrolling never opens the menu). When the timer fires, it calls `onHold` and gives a haptic tap (see Haptics below). The `click` that follows a successful hold is swallowed, but only within a 1 s grace window (`HOLD_GRACE_MS`) of the hold: a mouse hold ends with a `pointerup` over the overlay, so the hold state can't be cleared by `up()`, and without the window it would eat a later click or block right-click. Separately, the menu guards against the ghost click: after a touch hold, the browser sends a compatibility `click` at the lift point, so menu buttons ignore a click with no `pointerdown` inside the menu (keyboard activation is always allowed), and the backdrop closes on `click` only if the press also began on it, so that click never reaches a link or pill underneath.
- **Double-tap:** a `pointerup` within 300 ms and 30 px of the previous `pointerup` (neither one a hold) calls `onDoubleTap`.
- **Single tap:** nothing happens. Links inside the bubble still open, because `Linkify` already stops click propagation. A double-tap on a link opens the link. There is no fix for that, because the first tap already navigates.
- **Mouse:** `contextmenu` (right-click) calls `onHold` and prevents the browser menu. Holding the mouse button also works, through the same pointer path.
- **Keyboard and screen readers:** each message has a visually hidden "React to …" button (for example "React to Dan’s message") right after its pill, which opens the menu. It is shown on keyboard focus and is what screen readers use, since a screen-reader double-tap is a single click and the gestures aren't available. The bubble itself is not a tab stop and has no button role or label, so its text and links stay readable.
- **CSS:** `.reactable` gets `-webkit-touch-callout: none; user-select: none; touch-action: manipulation;`. This blocks the iOS copy popup and the double-tap zoom, and vertical scrolling still works. Text selection inside chat bubbles is lost. That is acceptable for this chat, and it is also how Instagram behaves.

### Haptics: `src/lib/haptics.ts`

The app's existing haptics (`CheerPop`, `RoundCounter`) call `navigator.vibrate`, but iPhone Safari doesn't have the Vibration API, so iPhone users feel nothing. A new shared helper, `haptic(ms = 10)`:

- calls `navigator.vibrate(ms)` where it exists (Android Chrome and most other browsers), and
- otherwise, on iPhone (Safari 18+), clicks a hidden `<label>` wrapping an `<input type="checkbox" switch>`. Toggling a native switch plays the system haptic. This is a known workaround, not a documented API, so it may stop working in a future iOS release. It does nothing where neither works.

It fires on: the hold opening the menu, a double-tap ❤️, and every reaction added or removed (in the menu or by double-tap).

**Unverified:** the hold haptic fires from a timer, not directly from a touch. WebKit may only play the switch haptic during a user gesture, so on iPhone the hold haptic might not fire while the double-tap and toggle haptics (which run inside tap handlers) do. This has to be checked on a real iPhone. If it doesn't fire, the fallback is to play the haptic on the `pointerup` that ends the hold.

Moving `CheerPop` and `RoundCounter` onto `haptic()` is out of scope here.

### 2. Hold menu: `src/components/ReactionMenu.tsx`

Props: `message` (the message node to show), `reactions` (for this message), `meId`, `people` (id → name and animal), `onToggle(emoji)`, `onClose()`.

The menu is a fixed overlay (`.react-menu`, z-index 120) with a dimmed, blurred backdrop (`backdrop-filter: blur(6px)`, with a plain dim fallback). Its column is centred and at most 360 px wide:

1. **Emoji bar.** The six emoji in a pill. The ones you've used are highlighted (`aria-pressed`). Tapping one toggles it and closes the menu.
2. **The message.** A non-interactive copy of the bubble, recap or milestone, so you can see what you're reacting to.
3. **Reactions list** (only when there are reactions). A "Reactions" heading, then one row per person: `Avatar` (not `PersonAvatar`, whose own tap-to-enlarge sheet would open underneath this menu), first name ("You" for yourself) and their emoji. You come first; everyone else is in order of their first reaction. On your own row each emoji is a button that removes it. Other people's rows aren't interactive. Past about 5 rows the list scrolls (`max-height: 40vh`).

The menu closes on a backdrop tap, Escape, or any emoji toggle. It is `role="dialog"`, `aria-modal="true"`, labelled "Reactions". Focus moves to the emoji bar when it opens. When it closes, focus returns to what opened it, or to that message's React button if the opener is gone (the pill is re-keyed or removed, or the message was deleted). Removing your own emoji in the list keeps the menu open (focus moves to the first emoji button); choosing an emoji in the bar closes it. Under `prefers-reduced-motion` the scale-in animation is turned off.

The menu renders as an overlay in the `ChatRoom` tree, the same way `.person-sheet` does. No portal is needed.

### 3. Reaction pill (replaces `.reactions` chips)

When a message has reactions, one `button.react-pill` is absolutely positioned on the bubble wrapper. It overlaps the bubble's bottom edge by about 10 px: on the left for other people's messages, on the right for yours.

- The pill shows up to 3 distinct emoji, most used first (ties go to the order of the six-emoji set), then the total number of reactions when it's more than 1. Example: `❤️😂🔥 7`.
- It gets the `.mine` styling (teal border and soft fill, like today's chips) when one of the reactions is yours.
- Tapping it opens the hold menu.
- Accessible label: "7 reactions: ❤️ 3, 😂 2, 🔥 2. Show who reacted."
- Rows with a pill get `margin-bottom: 14px` so the pill never covers the next message.
- When a new reaction arrives on a message (yours or by realtime), the pill gets a 200 ms scale pop, except under reduced motion.

This applies to text bubbles, Friday recaps and milestone cards. Recaps and milestones are full width, so their pill sits bottom-left.

### 4. Helpers: `src/lib/reactions.ts`

These are pure functions with no React or Supabase, so they can be unit tested:

- `summarize(reactions, meId) → { top: string[] /* ≤3 */, total: number, mine: boolean, counts: { emoji, n }[] }`
- `byPerson(reactions, meId) → { userId, emojis: string[] }[]`. You come first; everyone else is in order of their first reaction in the array; each person's emoji are in the order of the six-emoji set.

`Reaction` and `REACTIONS` move here from `ChatRoom.tsx` and are re-exported from `ChatRoom` so existing imports keep working.

### 5. `ChatRoom.tsx` changes

- `picking: number | null` is replaced by `menuFor: number | null`, and the old outside-pointerdown effect goes away (the menu has its own backdrop).
- `reactionsFor()` renders the pill. Bubbles, recaps and milestones spread `useMessagePress` props in place of `onClick={openPicker}`. Hooks can't be called in a loop, so a single `useMessagePress` instance returns one shared set of handlers, and each element passes its message through `data-id`. The hook reads `data-id` from `currentTarget`, so `onHold(id)` and `onDoubleTap(id)` receive the message id.
- `doubleTapHeart(id)` adds ❤️ only if you haven't already used it on that message.
- **Names fix:** the missing-profiles effect collects ids from reactions as well as messages, so someone who has reacted but never posted shows their name and animal in the list.
- `toggleReaction` keeps its optimistic update and rollback. It now also rolls back if a delete fails, which today it doesn't.

### 6. CSS (`globals.css`)

- Remove `.reactions`, `.react-chip` and `.react-pick`.
- Add `.react-pill`, `.react-menu`, `.react-menu-bar`, `.react-menu-list` and `.react-menu-row`, using the existing tokens (`--card`, `--line`, `--teal`, `--teal-soft`, `--ink-2`). They also need checking in dark mode (`:root[data-dark]`).

## Error handling

- If an insert or delete fails, the optimistic change is rolled back and nothing else happens (same as today). A reaction is low-stakes, so no error banner.
- If the message is deleted while its menu is open (realtime `DELETE`), the menu closes.
- Realtime echoes of our own changes are already de-duplicated by `same()`.

## Testing

**Vitest**
- `src/lib/reactions.test.ts`: `summarize` (ordering, cap at 3, totals, the `mine` flag, ties) and `byPerson` (you first, order of first reaction, emoji order).
- `src/lib/useMessagePress.test.ts`, run against `pressMachine` with fake timers:
  - a hold fires at 450 ms
  - moving more than 10 px cancels it
  - releasing early cancels it
  - a double-tap within 300 ms fires, and one at 301 ms doesn't
  - a hold followed by a tap isn't a double-tap
  - the click after a hold is swallowed

**By hand** (preview browser, phone emulation and desktop, light and dark)
- Hold to open the menu; toggling adds and removes and closes the menu.
- The who-reacted list shows real names, including someone who has reacted but never posted.
- Double-tap adds ❤️.
- Haptics: on an Android phone and a real iPhone, hold, double-tap and toggle each give a tap.
- Scrolling doesn't open the menu, and links still open.
- Right-click and Enter open the menu; Escape closes it.
- A reaction from a second browser shows up live with the pop.

## Files

- New: `src/lib/haptics.ts`, `src/lib/haptics.test.ts`, `src/lib/reactions.ts`, `src/lib/reactions.test.ts`, `src/lib/useMessagePress.ts`, `src/lib/useMessagePress.test.ts`, `src/components/ReactionMenu.tsx`
- Changed: `src/components/ChatRoom.tsx`, `src/app/globals.css`
- Unchanged: `src/app/(app)/chat/page.tsx` (it already loads reactions), the database
