import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { getUser, looksLikeOwner } from "./session";

/**
 * Two ways into the client form entries. Server only.
 *
 * The practice owner's own email and password (the site's Django sign-in,
 * used for the booking diary too) is the first and the one meant for daily
 * use: hasAdminAccess() accepts it, so one sign-in covers both the diary and
 * the client list, the moment the booking backend is back online.
 *
 * The username and password below are the fallback: the client form has to
 * take entries, and the practice has to be able to read them, whether or not
 * that separate backend is up. Set CLIENTS_USERNAME and CLIENTS_PASSWORD in
 * the environment to turn it on. The username is matched ignoring case and
 * surrounding spaces, so "Phakama " still works; the password must match
 * exactly.
 *
 * The cookie holds an HMAC keyed by the password, never the password itself.
 * Changing either value therefore signs everyone out of the fallback.
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

/** The fallback cookie alone, regardless of any Django session. */
async function hasClientsCookie(): Promise<boolean> {
  if (!passwordConfigured()) return false;
  const value = (await cookies()).get(CLIENTS_COOKIE)?.value ?? "";
  const expected = sessionToken();
  return (
    value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected))
  );
}

/**
 * Whether this view of the client form entries may be shown: either the
 * practice owner is signed in on the booking system, or they hold the
 * fallback cookie. Used by /clients, /clients/[id] and the signature and
 * signed-PDF routes, so all of them open under either sign-in.
 */
export async function hasAdminAccess(): Promise<boolean> {
  if (await hasClientsCookie()) return true;
  return looksLikeOwner(await getUser());
}
