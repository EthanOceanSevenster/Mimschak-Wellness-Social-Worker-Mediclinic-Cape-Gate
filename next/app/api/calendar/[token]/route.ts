import { HORIZON_DAYS, listBookings } from "@/lib/bookings";
import { calendarFeedTokenMatches } from "@/lib/clients-auth";

/**
 * The practice's sessions as a calendar feed (iCalendar), for Zoho Calendar
 * to subscribe to: Zoho Calendar → Subscribe → By URL. Zoho fetches it again
 * every few hours, so sessions added or changed here appear there on their
 * own. One way only: changes made in Zoho do not come back to the site.
 *
 * Shows sessions from 90 days back to the end of the booking window, except
 * cancelled ones. The address is secret (see calendarFeedToken).
 */
export const dynamic = "force-dynamic";

function stamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets are folded, as the iCalendar standard asks. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    out.push(rest.slice(0, 73));
    rest = " " + rest.slice(73);
  }
  out.push(rest);
  return out.join("\r\n");
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!calendarFeedTokenMatches(token.replace(/\.ics$/, ""))) {
    return new Response("Not found", { status: 404 });
  }

  const now = Date.now();
  const diary = await listBookings({
    from: new Date(now - 90 * 86_400_000),
    to: new Date(now + HORIZON_DAYS * 86_400_000),
  });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mimshack Wellness//Sessions feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Mimshack Wellness sessions",
    "X-WR-TIMEZONE:Africa/Johannesburg",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const b of diary.bookings) {
    if (b.status === "cancelled") continue;
    const tag = b.status === "requested" ? " (awaiting confirmation)" : b.status === "no_show" ? " (no show)" : "";
    const description = [
      `Status: ${b.status_label}`,
      `Phone: ${b.phone}`,
      b.email ? `Email: ${b.email}` : "",
      b.partner_name ? `Referred by ${b.partner_name}${b.partner_ref ? ` (${b.partner_ref})` : ""}` : "",
      b.notes ? `Notes: ${b.notes}` : "",
      `Reference: ${b.reference}`,
    ]
      .filter(Boolean)
      .join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${b.reference}@mimschakwellness.com`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(b.starts_at)}`,
      `DTEND:${stamp(b.ends_at)}`,
      `SUMMARY:${esc(`${b.full_name}: ${b.service ?? "Session"}${b.partner_short ? ` · ${b.partner_short}` : ""}${tag}`)}`,
      `LOCATION:${esc(b.mode === "online" ? "Online (video call)" : "Letada Medical Centre, Windsor Park, Kraaifontein")}`,
      `DESCRIPTION:${esc(description)}`,
      `STATUS:${b.status === "requested" ? "TENTATIVE" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="mimshack-sessions.ics"',
      "Cache-Control": "no-store",
    },
  });
}
