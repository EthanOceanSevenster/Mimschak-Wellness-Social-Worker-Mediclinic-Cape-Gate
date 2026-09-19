import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_COOKIE, apiGetAuthed, REFRESH_COOKIE } from "./api";
import type { SessionUser } from "./types";

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function setSession(access: string, refresh: string) {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, access, { ...COOKIE_BASE, maxAge: 60 * 30 });
  jar.set(REFRESH_COOKIE, refresh, { ...COOKIE_BASE, maxAge: 60 * 60 * 24 * 14 });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

/** The signed-in person, or null. Never throws — used to vary the nav. */
export async function getUser(): Promise<SessionUser | null> {
  try {
    return await apiGetAuthed<SessionUser>("/api/v1/auth/me/");
  } catch {
    return null;
  }
}

export async function requireUser(returnTo: string): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/**
 * Whether this person manages the practice.
 *
 * Deliberately only a hint for what to show in the nav. The real check is
 * Practice.is_owned_by on the Django side, which every /manage/ call goes
 * through — nothing here is load-bearing for access.
 */
export function looksLikeOwner(user: SessionUser | null): boolean {
  return Boolean(user && (user.is_staff || user.organisation));
}
