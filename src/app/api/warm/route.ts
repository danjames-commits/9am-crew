// Pinged every few minutes during the day so the app's server is already
// running when someone opens it (a cold start adds a few seconds).
export const dynamic = 'force-dynamic';

export function GET() {
  return new Response('ok', { headers: { 'cache-control': 'no-store' } });
}
