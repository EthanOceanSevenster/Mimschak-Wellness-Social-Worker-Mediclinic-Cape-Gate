import { NextResponse } from "next/server";

import { SITE_URL } from "@/lib/site";

import { createBooking, isStatus, readBookingInput, SlotTaken } from "@/lib/bookings";
import { createInvite, StorageNotConfigured } from "@/lib/client-entries";
import { hasAdminAccess } from "@/lib/clients-auth";
import { formLinkFor, inviteWhatsApp, isEmail, prefillFor } from "@/lib/consent-invite";
import { mailConfigured, sendMail } from "@/lib/mailer";
import { sessionEmail } from "@/lib/session-email";

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

  // ------------------------------------- the client's email, and the consent form
  // One email to the client: the session booked, with a calendar invite, and
  // (when the switch is on) the consent form to sign online plus its PDF.
  // Without an email address, or if it cannot be sent, the consent form goes
  // on WhatsApp instead: the message has the signing link and the PDF link.
  const sendConsent = body.send_consent === true;
  const who = { name: booking.full_name, email: booking.email, phone: booking.phone };
  let consentLink: string | undefined;
  let consent: { emailed: boolean; whatsapp?: string; error?: string } | null = null;
  let emailed = false;

  if (sendConsent) {
    try {
      consentLink = formLinkFor(SITE_URL, await createInvite(prefillFor(who)));
    } catch {
      consent = { emailed: false, error: "The consent form link could not be made just now." };
    }
  }

  if (isEmail(who.email) && mailConfigured()) {
    try {
      const mail = await sessionEmail(booking, { consentLink, attachConsent: sendConsent });
      await sendMail({ to: who.email, ...mail });
      emailed = true;
    } catch (error) {
      console.error("admin add session: client email failed:", error instanceof Error ? error.message : error);
    }
  }

  if (sendConsent && consentLink) {
    const digits = who.phone.replace(/\D/g, "").replace(/^0/, "27");
    // WhatsApp links carry text only, so the message has the link to the form.
    const whatsapp = `https://wa.me/${digits}?text=${encodeURIComponent(inviteWhatsApp(consentLink, who))}`;
    consent = emailed
      ? { emailed: true, whatsapp }
      : {
          emailed: false,
          whatsapp,
          error: !who.email
            ? undefined
            : mailConfigured()
              ? "The email could not be sent. Send the consent form on WhatsApp instead."
              : "Email sending is not set up here. Send the consent form on WhatsApp instead.",
        };
  }

  return NextResponse.json({ booking, consent, emailed }, { status: 201 });
}
