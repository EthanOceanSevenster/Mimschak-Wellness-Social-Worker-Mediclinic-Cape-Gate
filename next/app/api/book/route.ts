import { NextResponse } from "next/server";

import { API_URL, BOOKINGS, readableError } from "@/lib/api";
import { ACCESS_COOKIE } from "@/lib/api";
import { cookies } from "next/headers";

/**
 * Take a booking.
 *
 * Proxied rather than posted straight to Django so the one Django CORS origin
 * does not have to grow an entry per client site, and so a signed-in visitor's
 * booking gets attached to their account — the token is in an httpOnly cookie
 * the page script cannot read, so only the server can send it.
 */
export async function POST(request: Request) {
  const payload = await request.json();
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;

  const response = await fetch(`${API_URL}${BOOKINGS}/request/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    return NextResponse.json(
      { error: readableError(body, "That booking could not be made.") },
      { status: response.status },
    );
  }
  return NextResponse.json(body, { status: 201 });
}
