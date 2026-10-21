import { supabaseServer } from '@/lib/supabase/server';
import { cleanSvg, stillSvg } from '@/lib/svg-clean';

// Serves a personal-best drawing. Only approved members can see it (row-level security),
// it's re-checked on the way out, and the strict headers mean the browser treats it
// as a picture, never as a page that can run anything. ?still=1 for reduced motion.
export async function GET(req: Request, { params }: { params: Promise<{ user: string; movement: string }> }) {
  const { user, movement } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(user) || !/^\d{1,9}$/.test(movement)) return new Response('Not found', { status: 404 });
  const supabase = await supabaseServer();
  const { data } = await supabase.from('pr_art').select('svg').eq('user_id', user).eq('movement_id', Number(movement)).eq('status', 'ready').maybeSingle();
  const clean = data?.svg ? cleanSvg(data.svg, { animated: true }) : null;
  if (!clean) return new Response('Not found', { status: 404 });
  const still = new URL(req.url).searchParams.get('still') === '1';
  return new Response(still ? stillSvg(clean) : clean, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}
