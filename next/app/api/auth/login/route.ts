import { NextResponse } from "next/server";

import { API_URL } from "@/lib/api";
import { credentialsMatch, practiceCookie } from "@/lib/clients-auth";
import { getUser, looksLikeOwner, setSession } from "@/lib/session";

const NO_MATCH = "That email or username and password do not match an account.";

/**
 * The one sign-in. The first field takes an email or the practice username.
 *
 * The practice username and password are checked here first, by this site,
 * so the practice can always sign in: they set the practice cookie and the
 * form goes on to the admin page. Anything else is an email and password for
 * the booking backend, swapped for a JWT pair kept in httpOnly cookies; the
 * tokens are never handed to page JavaScript.
 */
export async function POST(request: Request) {
  const { email, password } = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  const login = String(email ?? "");
  const secret = String(password ?? "");

  if (credentialsMatch(login, secret)) {
    const response = NextResponse.json({ ok: true, owner: true });
    const cookie = practiceCookie();
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  }

  let backend: Response | null = null;
  try {
    backend = await fetch(`${API_URL}/api/v1/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: login, password: secret }),
      cache: "no-store",
    });
  } catch {
    // The booking backend is not reachable; that is a failed sign-in, not a crash.
    backend = null;
  }

  if (!backend || !backend.ok) {
    // A short pause makes guessing slow without bothering a person.
    await new Promise((resolve) => setTimeout(resolve, 800));
    return NextResponse.json({ error: NO_MATCH }, { status: 401 });
  }

  const { access, refresh } = await backend.json();
  await setSession(access, refresh);

  // Where to send them is only knowable once we know who they are, so the
  // form waits for this rather than guessing a destination up front.
  return NextResponse.json({ ok: true, owner: looksLikeOwner(await getUser()) });
}
