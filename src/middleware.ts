import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Short-link domain for public booking pages (e.g. zmed.bio) — patients
// see `zmed.bio/<slug>` instead of `med.zentrolabs.com/agendar/<slug>`.
// The domain itself still points at this same app/container (configured
// in Easypanel + DNS); this just rewrites the pretty path internally to
// the real route so `/agendar/[slug]` doesn't need a second copy.
// Hardcoded (not env-driven) because it's a routing rule, not a secret —
// same reasoning as any other host-based rewrite.
const BOOKING_SHORT_HOSTS = new Set(["zmed.bio", "www.zmed.bio"]);

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0] ?? "";
  if (BOOKING_SHORT_HOSTS.has(hostname) && !request.nextUrl.pathname.startsWith("/api/")) {
    const segments = request.nextUrl.pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      // Bare domain, no slug — nothing to show here, send visitors to the main site.
      return NextResponse.redirect("https://med.zentrolabs.com");
    }
    if (segments.length === 1) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = `/agendar/${segments[0]}`;
      return NextResponse.rewrite(rewriteUrl);
    }
    if (segments.length === 2 && segments[1] === "confirmacion") {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = `/agendar/${segments[0]}/confirmacion`;
      return NextResponse.rewrite(rewriteUrl);
    }
    // Anything else on this domain (unknown shape) falls through to a
    // natural 404 below rather than being rewritten.
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // getUser() transparently refreshes an expired access token, which
  // ROTATES the refresh token and writes the new cookies onto
  // `supabaseResponse` via setAll() above. Any response we return in
  // place of `supabaseResponse` (every redirect / JSON branch below)
  // is a fresh object that does NOT carry those Set-Cookie headers, so
  // the rotated token never reaches the browser. The next request then
  // replays the old, now-consumed refresh token, the refresh fails, and
  // the session wedges — the user gets a broken reload after idling and
  // can only recover by manually clearing cookies (issue #288). Copy the
  // refreshed cookies onto whatever response we hand back to fix that.
  const withRefreshedCookies = <T extends NextResponse>(response: T): T => {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })
    return response
  }

  // Auth pages - redirect to dashboard if already logged in.
  // Exception: when an invite token is in the query string we
  // send the already-signed-in user to /join/<token> instead so
  // they can accept the invitation in one click. Without this,
  // a forwarded invite link to someone who's already signed in
  // would silently drop them on /dashboard.
  if (user && (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/signup' ||
    request.nextUrl.pathname === '/forgot-password'
  )) {
    const url = request.nextUrl.clone()
    const inviteToken = request.nextUrl.searchParams.get('invite')
    if (
      inviteToken &&
      (request.nextUrl.pathname === '/login' ||
        request.nextUrl.pathname === '/signup')
    ) {
      url.pathname = `/join/${encodeURIComponent(inviteToken)}`
      url.search = ''
    } else {
      url.pathname = '/dashboard'
      url.search = ''
    }
    return withRefreshedCookies(NextResponse.redirect(url))
  }

  // Protected pages - redirect to login if not authenticated.
  // Matched by path SEGMENT, not raw string prefix — '/agenda'.startsWith
  // would otherwise also swallow the unrelated public booking route
  // '/agendar/[slug]' (bug: an external patient sharing their booking
  // link got bounced to /login). Same trap could recur with any future
  // protected path that's a prefix of a public one, so this checks for
  // an exact match or a '/' right after.
  const protectedPaths = ['/dashboard', '/inbox', '/contacts', '/pipelines', '/broadcasts', '/automations', '/settings', '/agenda', '/billing', '/admin']
  const isProtectedPath = protectedPaths.some(
    (path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`)
  )
  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return withRefreshedCookies(NextResponse.redirect(url))
  }

  // API routes that need auth (not webhooks)
  if (!user && request.nextUrl.pathname.startsWith('/api/whatsapp/') &&
      !request.nextUrl.pathname.includes('/webhook')) {
    return withRefreshedCookies(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
