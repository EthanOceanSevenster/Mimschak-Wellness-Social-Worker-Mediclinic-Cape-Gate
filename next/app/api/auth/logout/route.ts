import { NextResponse } from "next/server";

import { CLIENTS_COOKIE } from "@/lib/clients-auth";
import { clearSession } from "@/lib/session";

/**
 * Ends every sign-in at once: the booking backend session and the practice
 * cookie. The Sign out buttons are plain HTML forms, so this answers with a
 * redirect home rather than JSON, which a browser would show as a page.
 */
export async function POST(request: Request) {
  await clearSession();
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.delete(CLIENTS_COOKIE);
  return response;
}
