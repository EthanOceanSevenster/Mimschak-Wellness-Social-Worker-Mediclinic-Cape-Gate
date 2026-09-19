import { cookies } from "next/headers";

/**
 * The browser never talks to Django directly.
 *
 * Every call here runs on the Next.js server, which means the JWT can live in
 * an httpOnly cookie that page scripts cannot read, and the Django CORS list
 * does not need to grow an entry for this client site. The site's own route
 * handlers under /api are the only thing the browser sees.
 */
export const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";
export const PRACTICE = process.env.PRACTICE_SLUG ?? "mimschak-wellness";
export const BOOKINGS = `/api/v1/bookings/${PRACTICE}`;

export const ACCESS_COOKIE = "mw_access";
export const REFRESH_COOKIE = "mw_refresh";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(`API responded ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

async function safeBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return await response.text();
  }
}

/** Public endpoints — no token. */
export async function apiGet<T>(path: string, revalidate = 0): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: "application/json" },
    ...(revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" }),
  });
  if (!response.ok) throw new ApiError(response.status, await safeBody(response));
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new ApiError(response.status, await safeBody(response));
  return response.json() as Promise<T>;
}

async function authHeader(): Promise<Record<string, string>> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) throw new ApiError(401, "Not signed in.");
  return { Authorization: `Bearer ${token}` };
}

export async function apiGetAuthed<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: "application/json", ...(await authHeader()) },
    cache: "no-store",
  });
  if (!response.ok) throw new ApiError(response.status, await safeBody(response));
  return response.json() as Promise<T>;
}

export async function apiPostAuthed<T>(path: string, body: unknown = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new ApiError(response.status, await safeBody(response));
  return response.json() as Promise<T>;
}

/** Turns a DRF error body into one line a person can act on. */
export function readableError(detail: unknown, fallback = "Something went wrong."): string {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const record = detail as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      const value = record[key];
      if (Array.isArray(value) && value.length) return String(value[0]);
      if (typeof value === "string") return value;
    }
  }
  return fallback;
}
