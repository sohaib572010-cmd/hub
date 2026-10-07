import type { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Refreshes the admin session cookie on console requests and reports whether
 * a valid session is present. Authorization (admin membership) is enforced
 * again inside every console page and Server Action — this is only a fast gate.
 *
 * `makeResponse` builds the response (e.g. a rewrite) after any refreshed
 * cookies have been written onto the request, so downstream code sees them.
 */
export async function refreshSession(request: NextRequest, makeResponse: () => NextResponse) {
  let response = makeResponse();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { response, signedIn: false };

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = makeResponse();
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          });
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  return { response, signedIn: Boolean(data?.claims?.sub) };
}
