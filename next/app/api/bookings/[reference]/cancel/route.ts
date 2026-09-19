import { NextResponse } from "next/server";

import { apiPostAuthed, ApiError, BOOKINGS, readableError } from "@/lib/api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
  try {
    return NextResponse.json(await apiPostAuthed(`${BOOKINGS}/mine/${reference}/cancel/`));
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const detail = error instanceof ApiError ? error.detail : null;
    return NextResponse.json(
      { error: readableError(detail, "That booking could not be cancelled.") },
      { status },
    );
  }
}
