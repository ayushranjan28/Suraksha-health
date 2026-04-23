import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── Public routes that don't require authentication ──────────────────────────
const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/check-email', '/verify-email'];

// ── Routes that require authentication ───────────────────────────────────────
const PROTECTED_PREFIXES = ['/dashboard'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is public
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  
  // Check if the route requires protection
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // If route doesn't need protection, continue
  if (!isProtectedRoute || isPublicRoute) {
    return NextResponse.next();
  }

  // For protected routes: Let the request through
  // Auth is handled client-side by ProtectedRoute component
  // which checks localStorage token and redirects if needed
  //
  // Note: Middleware can't access localStorage, so we rely on
  // client-side protection. The httpOnly refresh token cookie
  // is only used for token refresh, not route protection.
  return NextResponse.next();
}

// ── Matcher config ───────────────────────────────────────────────────────────
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
