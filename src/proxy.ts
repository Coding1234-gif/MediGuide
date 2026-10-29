import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ["/dashboard", "/scan", "/schedules", "/reminders", "/symptoms", "/settings"];
const DEMO_COOKIE = "mg_demo_session";

/**
 * Optimistic auth gate + Supabase session refresh. Authoritative checks happen in
 * pages and route handlers (getCurrentUser / requireApiUser) — this only improves UX.
 */
export async function proxy(request: NextRequest) {
  const { response, hasUser } = await updateSupabaseSession(request);
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !hasUser && !request.cookies.has(DEMO_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|samples/|icons/|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
