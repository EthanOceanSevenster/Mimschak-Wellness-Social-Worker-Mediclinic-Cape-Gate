import { NextResponse } from "next/server";

import { isStatus, setBookingStatus, SlotTaken } from "@/lib/bookings";
import { hasAdminAccess } from "@/lib/clients-auth";

/** Admin only: confirm, decline, cancel, reinstate, or mark a session done. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const { reference } = await params;
  const body = (await request.json().catch(() => ({}))) as { status?: unknown };
  if (!isStatus(body.status)) {
    return NextResponse.json({ error: "That change is not recognised." }, { status: 400 });
  }
  try {
    const booking = await setBookingStatus(reference, body.status);
    if (!booking) return NextResponse.json({ error: "That booking was not found." }, { status: 404 });
    return NextResponse.json(booking);
  } catch (error) {
    if (error instanceof SlotTaken) {
      return NextResponse.json({ error: "Another session already holds that time." }, { status: 409 });
    }
    console.error("Booking update failed:", error);
    return NextResponse.json({ error: "That booking could not be updated." }, { status: 500 });
  }
}
