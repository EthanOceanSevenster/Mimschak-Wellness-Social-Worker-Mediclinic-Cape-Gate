import { NextResponse } from "next/server";

import {
  CLIENTS_COOKIE,
  CLIENTS_COOKIE_MAX_AGE,
  credentialsMatch,
  sessionToken,
} from "@/lib/clients-auth";

/** A plain HTML form posts here, so this works with JavaScript switched off. */
export async function POST(request: Request) {
  const form = await request.formData();
  const user = String(form.get("username") ?? "");
  const attempt = String(form.get("password") ?? "");

  if (!credentialsMatch(user, attempt)) {
    // A short pause makes guessing slow without bothering a person.
    await new Promise((resolve) => setTimeout(resolve, 800));
    return NextResponse.redirect(new URL("/clients?error=1", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/clients", request.url), 303);
  response.cookies.set(CLIENTS_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CLIENTS_COOKIE_MAX_AGE,
  });
  return response;
}
