import { NextResponse } from "next/server";

import { API_URL } from "@/lib/api";
import { getUser, looksLikeOwner, setSession } from "@/lib/session";

/**
 * Swap an email and password for a JWT pair and keep it in httpOnly cookies.
 *
 * The tokens are never handed to page JavaScript: the form posts here, this
 * handler talks to Django, and every later authenticated call is made by the
 * Next.js server with the cookie attached.
 */
export async function POST(request: Request) {
  const { email, password } = await request.json();

  const response = await fetch(`${API_URL}/api/v1/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "That email and password do not match an account." },
      { status: 401 },
    );
  }

  const { access, refresh } = await response.json();
  await setSession(access, refresh);

  // Where to send them is only knowable once we know who they are, so the
  // form waits for this rather than guessing a destination up front.
  return NextResponse.json({ ok: true, owner: looksLikeOwner(await getUser()) });
}
