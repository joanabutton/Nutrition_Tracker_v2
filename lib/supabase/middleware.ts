import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { getMissingSupabaseClientEnv, getSupabaseClientEnv } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  const missingEnv = getMissingSupabaseClientEnv();

  if (missingEnv.length > 0) {
    if (isAuthRoute) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("message", `Missing Supabase environment variables: ${missingEnv.join(", ")}`);
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const { supabaseUrl, supabaseAnonKey } = getSupabaseClientEnv();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers
          }
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers
          }
        });
        response.cookies.set({ name, value: "", ...options });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/today";
    return NextResponse.redirect(url);
  }

  return response;
}
