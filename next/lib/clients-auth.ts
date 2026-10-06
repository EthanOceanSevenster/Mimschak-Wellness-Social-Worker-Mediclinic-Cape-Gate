import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { getUser, looksLikeOwner } from "./session";

/**
 * The practice's sign-in. Server only.
 *
 * There is one sign-in page, /login. It accepts either of two things:
 *
 *  - A practice username and password (CLIENTS_USERNAME and
 *    CLIENTS_PASSWORD, plus any in CLIENTS_EXTRA_USERS). These are checked
 *    here, by this site, so they work whether or not the booking backend is up.
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

type Account = { username: string; password: string };

/**
 * Everyone who may sign in to the admin pages.
 *
 * CLIENTS_USERNAME / CLIENTS_PASSWORD is the practice's main account.
 * CLIENTS_EXTRA_USERS adds more, as "username:password", comma-separated,
 * e.g. "tabitha:abcd-EFGH-jk23". Each has its own password; changing one
 * signs out only that person.
 */
function accounts(): Account[] {
  const list: Account[] = [];
  const main = (process.env.CLIENTS_USERNAME ?? "phakama").trim().toLowerCase();
  if (main && (process.env.CLIENTS_PASSWORD ?? "").length >= 8) {
    list.push({ username: main, password: process.env.CLIENTS_PASSWORD as string });
  }
  for (const pair of (process.env.CLIENTS_EXTRA_USERS ?? "").split(",")) {
    const at = pair.indexOf(":");
    if (at < 1) continue;
    const username = pair.slice(0, at).trim().toLowerCase();
    const password = pair.slice(at + 1).trim();
    if (username && password.length >= 8 && !list.some((a) => a.username === username)) {
      list.push({ username, password });
    }
  }
  return list;
}

export function passwordConfigured(): boolean {
  return accounts().length > 0;
}

function digest(key: string, message: string): Buffer {
  return createHmac("sha256", key).update(message).digest();
}

/** Constant-time: both sides are hashed to the same length first. */
function same(a: string, b: string): boolean {
  return timingSafeEqual(digest("compare", a), digest("compare", b));
}

/** Unchanged from the single-account version, so existing sign-ins stay valid. */
function tokenFor(account: Account): string {
  return digest(account.password, `mimshak-clients-v2:${account.username}`).toString("hex");
}

/** The account a username and password belong to, or null. */
export function credentialsMatch(attemptUser: string, attemptPassword: string): string | null {
  const user = attemptUser.trim().toLowerCase();
  let found: string | null = null;
  // Every account is checked, so a wrong username takes as long as a wrong password.
  for (const account of accounts()) {
    const ok = same(user, account.username) && same(attemptPassword, account.password);
    if (ok) found = account.username;
  }
  return found;
}

/** Who holds a valid practice cookie, or null. */
export async function practiceUser(): Promise<string | null> {
  const value = (await cookies()).get(CLIENTS_COOKIE)?.value ?? "";
  if (!value) return null;
  let found: string | null = null;
  for (const account of accounts()) {
    const expected = tokenFor(account);
    if (value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected))) {
      found = account.username;
    }
  }
  return found;
}

/** The practice cookie alone, regardless of any booking-backend session. */
export async function hasPracticeCookie(): Promise<boolean> {
  return (await practiceUser()) !== null;
}

/** Whether the admin pages may be shown: either sign-in described above. */
export async function hasAdminAccess(): Promise<boolean> {
  if (await hasPracticeCookie()) return true;
  return looksLikeOwner(await getUser());
}

/** The cookie that records a practice sign-in, for a route to set. */
export function practiceCookie(username: string) {
  const account = accounts().find((a) => a.username === username);
  if (!account) throw new Error("No such account.");
  return {
    name: CLIENTS_COOKIE,
    value: tokenFor(account),
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CLIENTS_COOKIE_MAX_AGE,
    },
  };
}
