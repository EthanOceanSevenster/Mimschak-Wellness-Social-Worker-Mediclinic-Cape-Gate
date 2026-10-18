import { NextResponse } from "next/server";

import { createBooking, isStatus, readBookingInput, SlotTaken } from "@/lib/bookings";
import { createInvite, StorageNotConfigured } from "@/lib/client-entries";
import { hasAdminAccess } from "@/lib/clients-auth";
import { formLinkFor, INVITE_SUBJECT, inviteHtml, inviteText, inviteWhatsApp, isEmail, prefillFor } from "@/lib/consent-invite";
import { mailConfigured, sendMail } from "@/lib/mailer";

/**
 * Admin only: the practice adds a session itself (a booking made by phone,
 * WhatsApp or in person), and can send the client the consent form with it.
 *
 * The consent form goes by email when the client has an address and email is
 * set up; otherwise the response carries a WhatsApp link with the form link
 * in it, for the Admin page to offer.
 */
export async function POST(request: Request) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const read = readBookingInput(body, { admin: true });
  if (!read.ok) return NextResponse.json({ error: read.error }, { status: 400 });
  const status = isStatus(body.status) ? body.status : "confirmed";

  let booking;
  try {
    booking = await createBooking(read.value, { admin: true, status });
  } catch (error) {
    if (error instanceof SlotTaken) {
      return NextResponse.json({ error: "Another session is already booked at that time." }, { status: 409 });
    }
    if (error instanceof StorageNotConfigured) {
      return NextResponse.json({ error: "No database is connected for bookings." }, { status: 503 });
    }
    console.error("admin add session failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "The session could not be saved. Please try again." }, { status: 500 });
  }

  // ------------------------------------------------- the consent form
  let consent: { emailed: boolean; whatsapp?: string; error?: string } | null = null;
  if (body.send_consent === true) {
    const who = { name: booking.full_name, email: booking.email, phone: booking.phone };
    const site = new URL("/", request.url).toString();
    try {
      const link = formLinkFor(site, await createInvite(prefillFor(who)));
      const digits = who.phone.replace(/\D/g, "").replace(/^0/, "27");
      const whatsapp = `https://wa.me/${digits}?text=${encodeURIComponent(inviteWhatsApp(link, who))}`;
      if (isEmail(who.email) && mailConfigured()) {
        try {
          await sendMail({ to: who.email, subject: INVITE_SUBJECT, text: inviteText(link, who), html: inviteHtml(link, who, site) });
          consent = { emailed: true, whatsapp };
        } catch (error) {
          console.error("admin add session: consent email failed:", error instanceof Error ? error.message : error);
          consent = { emailed: false, whatsapp, error: "The consent form email could not be sent. Send it on WhatsApp instead." };
        }
      } else {
        consent = { emailed: false, whatsapp };
      }
    } catch {
      consent = { emailed: false, error: "The consent form link could not be made just now." };
    }
  }

  return NextResponse.json({ booking, consent }, { status: 201 });
}
