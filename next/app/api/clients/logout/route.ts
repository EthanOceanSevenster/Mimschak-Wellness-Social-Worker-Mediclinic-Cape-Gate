import { NextResponse } from "next/server";

import { CLIENTS_COOKIE } from "@/lib/clients-auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/clients", request.url), 303);
  response.cookies.delete(CLIENTS_COOKIE);
  return response;
}
