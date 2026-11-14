// Links in chat messages: web addresses become tappable and open in the phone's browser.

const URL_RE = /\b((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)\]'"’”])/gi;

export function Linkify({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    const raw = m[1];
    const href = raw.startsWith('www.') ? `https://${raw}` : raw;
    out.push(
      <a
        key={i}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="chat-link"
        // A tap on a link opens it, not the reactions picker.
        onClick={(e) => e.stopPropagation()}
      >
        {raw}
      </a>,
    );
    last = i + raw.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
