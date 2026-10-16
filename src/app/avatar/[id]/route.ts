import { supabaseServer } from '@/lib/supabase/server';
import { cleanSvg } from '@/lib/svg-clean';

// Serves a member's drawn spirit animal. Only signed-in, approved members can see it (row-level security),
// and the strict headers mean the browser treats it as a picture, never as a page that can run anything.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Not found', { status: 404 });
  const supabase = await supabaseServer();
  const { data } = await supabase.from('avatars').select('svg').eq('user_id', id).maybeSingle();
  const svg = data ? cleanSvg(data.svg) : null;
  if (!svg) return new Response('Not found', { status: 404 });
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
      // The URL carries a version, so a phone can keep it a long time.
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}
