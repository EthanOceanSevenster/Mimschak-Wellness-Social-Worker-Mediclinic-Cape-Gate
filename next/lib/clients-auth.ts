import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { getUser, looksLikeOwner } from "./session";

/**
 * The practice's sign-in. Server only.
 *
 * There is one sign-in page, /login. It accepts either of two things:
 *
 *  - The practice username and password (CLIENTS_USERNAME and
 *    CLIENTS_PASSWORD in the environment). These are checked here, by this
 *    site, so they work whether or not the separate booking backend is up.
 *  - An email and password for an account on that booking backend, which an
 *    owner account also passes, once that backend is online.
 *
 * Either one makes hasAdminAccess() true, which opens the admin page
 * (/manage) with sessions and clients together, the client pages, and the
 * signature and signed-PDF routes. /api/auth/logout ends both.
 *
 * The username is matched ignoring case and surrounding spaces, so
 * "Phakama " still works; the password must match exactly. The cookie holds
 * an HMAC keyed by the password, never the password itself, so changing
 * either value signs everyone out.
 */

export const CLIENTS_COOKIE = "mw_clients";
export const CLIENTS_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function username(): string {
  return (process.env.CLIENTS_USERNAME ?? "phakama").trim().toLowerCase();
}

function password(): string {
  return process.env.CLIENTS_PASSWORD ?? "";
}

export function passwordConfigured(): boolean {
  return username().length > 0 && password().length >= 8;
}

function digest(key: string, message: string): Buffer {
  return createHmac("sha256", key).update(message).digest();
}

/** Constant-time: both sides are hashed to the same length first. */
function same(a: string, b: string): boolean {
  return timingSafeEqual(digest("compare", a), digest("compare", b));
}

export function sessionToken(): string {
  return digest(password(), `mimshak-clients-v2:${username()}`).toString("hex");
}

export function credentialsMatch(attemptUser: string, attemptPassword: string): boolean {
  if (!passwordConfigured()) return false;
  // Both are always compared, so a wrong username takes as long as a wrong password.
  const userOk = same(attemptUser.trim().toLowerCase(), username());
  const passwordOk = same(attemptPassword, password());
  return userOk && passwordOk;
}

/** The practice cookie alone, regardless of any booking-backend session. */
export async function hasPracticeCookie(): Promise<boolean> {
  if (!passwordConfigured()) return false;
  const value = (await cookies()).get(CLIENTS_COOKIE)?.value ?? "";
  const expected = sessionToken();
  return (
    value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected))
  );
}

/** Whether the admin pages may be shown: either sign-in described above. */
export async function hasAdminAccess(): Promise<boolean> {
  if (await hasPracticeCookie()) return true;
  return looksLikeOwner(await getUser());
}

/** The cookie that records a practice sign-in, for a route to set. */
export function practiceCookie() {
  return {
    name: CLIENTS_COOKIE,
    value: sessionToken(),
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CLIENTS_COOKIE_MAX_AGE,
    },
  };
}
