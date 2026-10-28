import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { VAPID_PUBLIC_KEY } from '@/lib/push-key';

// Called by the database (push_kick) when there's something to tell people: a chat message
// or a new sign-up. The one-time ticket proves it came from there. The database decides who
// gets told (grouping chat so it's one notification per unread batch); this sends them.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Job {
  title: string;
  body: string;
  url: string;
  tag: string;
  key: string | null;
  subs: { endpoint: string; p256dh: string; auth: string }[];
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const ticket = q.get('ticket') ?? '';
  const kind = q.get('kind') ?? '';
  const ref = q.get('ref') ?? '';
  if (!/^[0-9a-f]{64}$/.test(ticket) || !['chat', 'signup'].includes(kind) || !/^[0-9a-f-]{1,40}$/i.test(ref)) return new Response('skip');
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

  const { data } = await db.rpc('push_job', { ticket, kind, ref });
  const job = data as Job | null;
  if (!job || !job.key) return new Response('nothing to send');

  webpush.setVapidDetails('mailto:hello@9amcrew.ca', VAPID_PUBLIC_KEY, job.key);
  const payload = JSON.stringify({ title: job.title, body: job.body, url: job.url, tag: job.tag });
  const gone: string[] = [];
  await Promise.all(
    job.subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 6, urgency: 'normal' });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) gone.push(s.endpoint);
      }
    }),
  );
  await db.rpc('push_done', { ticket, gone });
  return new Response(`sent ${job.subs.length - gone.length}`);
}
