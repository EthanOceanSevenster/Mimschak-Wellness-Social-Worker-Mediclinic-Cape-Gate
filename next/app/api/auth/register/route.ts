import { NextResponse } from "next/server";

import { API_URL, BOOKINGS, readableError } from "@/lib/api";
import { setSession } from "@/lib/session";

/**
 * Create an account for someone booking sessions.
 *
 * Posts to the bookings app rather than accounts/register, because that one
 * demands a company name — right for a Meridian business client, wrong for a
 * person booking counselling. The account it makes has no organisation, so it
 * can never satisfy the owner check.
 */
export async function POST(request: Request) {
  const { email, password, full_name } = await request.json();

  const response = await fetch(`${API_URL}${BOOKINGS}/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name }),
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    return NextResponse.json(
      { error: readableError(body, "That account could not be created.") },
      { status: response.status },
    );
  }

  await setSession(body.access, body.refresh);
  // A patient account has no organisation, so it never owns a diary.
  return NextResponse.json({ ok: true, owner: false });
}
