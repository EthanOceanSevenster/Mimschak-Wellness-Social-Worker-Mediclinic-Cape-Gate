import { NextResponse } from "next/server";

import { isStatus, readBookingInput, setBookingStatus, SlotTaken, updateBooking } from "@/lib/bookings";
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

/** Admin only: edit a session's details (who, when, what, status). */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const { reference } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const read = readBookingInput(body, { admin: true });
  if (!read.ok) return NextResponse.json({ error: read.error }, { status: 400 });
  if (!isStatus(body.status)) {
    return NextResponse.json({ error: "Please choose a status." }, { status: 400 });
  }
  try {
    const booking = await updateBooking(reference, read.value, body.status);
    if (!booking) return NextResponse.json({ error: "That session was not found." }, { status: 404 });
    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof SlotTaken) {
      return NextResponse.json({ error: "Another session is already booked at that time." }, { status: 409 });
    }
    console.error("Session edit failed:", error);
    return NextResponse.json({ error: "The changes could not be saved." }, { status: 500 });
  }
}
