import { createServerClient } from '@supabase/ssr';
import { SUPABASE_JWKS } from './lib/supabase/jwks';
import { NextResponse, type NextRequest } from 'next/server';

const WARM_TABS = new Set(['/', '/chat', '/lifts', '/workouts', '/me']);

// Keeps the login session fresh and sends signed-out visitors to /login.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // The keep-warm ping: wakes the server, no sign-in needed.
  if (request.nextUrl.pathname === '/api/warm') return response;
  // The morning timer job: checked by its one-time ticket, not a sign-in.
  if (request.nextUrl.pathname === '/api/clock-job') return response;
  // The MCP connector and its OAuth metadata: the route checks its own bearer token.
  if (request.nextUrl.pathname === '/api/mcp' || request.nextUrl.pathname.startsWith('/.well-known/')) return response;
  // Warming a tab itself (?warm=1): let it reach the page, which loads its code and
  // then sends the signed-out ping to /login. Pages check sign-in on their own.
  if (request.nextUrl.searchParams.has('warm') && WARM_TABS.has(request.nextUrl.pathname) && !request.cookies.getAll().length) {
    return response;
  }

  const { data } = await supabase.auth.getClaims(undefined, { jwks: SUPABASE_JWKS });
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  if (!signedIn && path !== '/login' && !path.startsWith('/auth/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  if (signedIn && path === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|animals/|favicon.ico|icon.png|apple-icon.png|icon-maskable-512.png|icon-192.png|icon-512.png|manifest.webmanifest).*)'],
};
