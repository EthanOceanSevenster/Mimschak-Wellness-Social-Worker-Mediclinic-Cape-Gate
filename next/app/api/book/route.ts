import { after, NextResponse } from "next/server";

import { createBooking, readBookingInput, SlotTaken } from "@/lib/bookings";
import { StorageNotConfigured } from "@/lib/client-entries";
import { mailConfigured, sendMail } from "@/lib/mailer";

/**
 * Take a booking, into this site's own database (lib/bookings.ts).
 *
 * The practice is emailed about it after the response has gone, so a slow
 * mail server never holds up the person booking. The client still sends it
 * on WhatsApp from the next screen; the email is so it is never missed.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const read = readBookingInput(body ?? {});
  if (!read.ok) return NextResponse.json({ error: read.error }, { status: 400 });

  try {
    const booking = await createBooking(read.value);

    if (mailConfigured() && process.env.MAIL_FROM) {
      const to = process.env.MAIL_FROM;
      after(async () => {
        const when = new Date(booking.starts_at).toLocaleString("en-ZA", {
          timeZone: "Africa/Johannesburg",
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        const lines = [
          `New session request ${booking.reference}`,
          ``,
          `${booking.full_name}`,
          ...(booking.partner_name
            ? [`Referred by ${booking.partner_name}${booking.partner_ref ? ` (reference ${booking.partner_ref})` : ""}`]
            : []),
          `${booking.service}, ${booking.mode_label}`,
          `${when}`,
          `Phone: ${booking.phone}`,
          `Email: ${booking.email}`,
          booking.notes ? `Notes: ${booking.notes}` : "",
          ``,
          `Confirm or decline it on the Admin page: https://www.mimschakwellness.com/manage`,
        ].filter((line, i, all) => line !== "" || all[i - 1] !== "");
        const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        await sendMail({
          to,
          subject: `${booking.partner_short ? `[${booking.partner_short}] ` : ""}New session request: ${booking.full_name}, ${when}`,
          text: lines.join("\n"),
          html: lines.map((l) => (l ? `<p style="margin:0 0 6px 0">${escape(l)}</p>` : "<br>")).join(""),
        }).catch((error) => console.error("Booking email failed:", error));
      });
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof SlotTaken) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof StorageNotConfigured) {
      return NextResponse.json(
        { error: "Online booking is not available just now. Please send a WhatsApp instead." },
        { status: 503 },
      );
    }
    console.error("Booking failed:", error);
    return NextResponse.json(
      { error: "That booking could not be made. Please try again, or send a WhatsApp." },
      { status: 500 },
    );
  }
}
