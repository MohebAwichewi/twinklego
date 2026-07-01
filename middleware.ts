import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase-config";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const url = getSupabaseUrl();
  const key = getSupabasePublicKey();

  if (!url || !key) return response;

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes
  const protectedPaths = ["/dashboard", "/errands", "/profile", "/wallet", "/runners"];
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p));

  if (isProtected && !user) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    return redirect;
  }

  // Admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    // Admin check done at page level via DB query
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/errands/:path*",
    "/profile/:path*",
    "/wallet/:path*",
    "/runners/:path*",
    "/admin/:path*",
  ],
};
