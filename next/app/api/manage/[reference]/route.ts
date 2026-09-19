import { NextResponse } from "next/server";

import { apiPostAuthed, ApiError, BOOKINGS, readableError } from "@/lib/api";

/** Owner-only. Django re-checks ownership; this handler never assumes it. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
  const body = await request.json();
  try {
    return NextResponse.json(await apiPostAuthed(`${BOOKINGS}/manage/${reference}/`, body));
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const detail = error instanceof ApiError ? error.detail : null;
    return NextResponse.json(
      { error: readableError(detail, "That booking could not be updated.") },
      { status },
    );
  }
}
