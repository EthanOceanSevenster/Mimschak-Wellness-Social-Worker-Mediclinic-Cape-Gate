import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

/**
 * One username and password for the /clients page. Server only.
 *
 * Deliberately separate from the site's Django sign-in: the client form has
 * to work whether or not the booking API is up, and so does the page that
 * reads its entries.
 *
 * Set CLIENTS_USERNAME and CLIENTS_PASSWORD in the environment. The username
 * is matched ignoring case and surrounding spaces, so "Phakama " still works;
 * the password must match exactly.
 *
 * The cookie holds an HMAC keyed by the password, never the password itself.
 * Changing either value therefore signs everyone out.
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

export async function hasClientsAccess(): Promise<boolean> {
  if (!passwordConfigured()) return false;
  const value = (await cookies()).get(CLIENTS_COOKIE)?.value ?? "";
  const expected = sessionToken();
  return (
    value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected))
  );
}
