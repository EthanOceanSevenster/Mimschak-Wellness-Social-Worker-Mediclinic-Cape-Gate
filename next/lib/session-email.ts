import { buildBlankConsentPdf } from "./consent-pdf";
import { getPartner } from "./partners";
import { SITE_URL } from "./site";
import type { Booking } from "./types";

/**
 * The email a client gets when a session is booked: when and where, an
 * "Add to Google Calendar" button, a calendar invite (.ics) for Outlook and
 * Apple Calendar, and, when asked for, the consent form (a link to sign it
 * online and the PDF). Server only.
 */

const SA = "Africa/Johannesburg";
const PHONE = "064 153 3469";
const ADDRESS = "Letada Medical Centre, Windsor Park, Kraaifontein, 7530";

const DAY = new Intl.DateTimeFormat("en-ZA", { timeZone: SA, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const SHORT_DAY = new Intl.DateTimeFormat("en-ZA", { timeZone: SA, weekday: "long", day: "numeric", month: "long" });
const CLOCK = new Intl.DateTimeFormat("en-ZA", { timeZone: SA, hour: "2-digit", minute: "2-digit", hour12: false });

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** 2026-10-20T07:00:00.000Z → 20261020T070000Z, as calendars want it. */
function stamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function where(b: Booking): string {
  return b.mode === "online" ? "Online (video call)" : ADDRESS;
}

function title(b: Booking): string {
  return `${b.service ?? "Session"} with Phakama Ndamase (Mimshack Wellness)`;
}

function details(b: Booking): string {
  return [
    `Reference ${b.reference}${b.partner_ref ? ` · ${b.partner_short} reference ${b.partner_ref}` : ""}`,
    `To change or cancel, WhatsApp or call ${PHONE} at least 24 hours before.`,
  ].join("\n");
}

export function googleCalendarLink(b: Booking): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title(b),
    dates: `${stamp(b.starts_at)}/${stamp(b.ends_at)}`,
    details: details(b),
    location: where(b),
    ctz: SA,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** A calendar invite for Outlook, Apple Calendar and the rest. */
export function calendarInvite(b: Booking): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mimshack Wellness//Sessions//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${b.reference}@mimschakwellness.com`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(b.starts_at)}`,
    `DTEND:${stamp(b.ends_at)}`,
    `SUMMARY:${esc(title(b))}`,
    `LOCATION:${esc(where(b))}`,
    `DESCRIPTION:${esc(details(b))}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Your session with Mimshack Wellness",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export type SessionEmailOptions = {
  /** A link to sign the consent form online; adds that section. */
  consentLink?: string;
  /** Attach the consent form PDF (with the link, or as a copy of what was agreed online). */
  attachConsent?: boolean;
};

export async function sessionEmail(b: Booking, options: SessionEmailOptions = {}) {
  const start = new Date(b.starts_at);
  const end = new Date(b.ends_at);
  const first = b.full_name.trim().split(/\s+/)[0] ?? "";
  const when = `${DAY.format(start)}, ${CLOCK.format(start)} – ${CLOCK.format(end)}`;
  const partner = getPartner(b.partner);
  const gcal = googleCalendarLink(b);
  const subject = `Your session is booked: ${SHORT_DAY.format(start)} at ${CLOCK.format(start)}`;

  const rows: [string, string][] = [
    ["When", when],
    ["Service", b.service ?? "Session"],
    ["Where", where(b)],
    ["Reference", b.reference],
    ...(b.partner_ref ? ([[`${b.partner_short} reference`, b.partner_ref]] as [string, string][]) : []),
  ];

  const text = [
    first ? `Dear ${first},` : "Hello,",
    "",
    "Your session with Mimshack Wellness is booked.",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    `Add it to your Google Calendar: ${gcal}`,
    "A calendar invite is also attached for Outlook and Apple Calendar.",
    ...(options.consentLink
      ? ["", "Before your first session, please complete and sign the consent form online:", options.consentLink]
      : []),
    ...(options.attachConsent ? ["", "The consent form is attached as a PDF."] : []),
    "",
    `To change or cancel, reply to this email or WhatsApp ${PHONE} at least 24 hours before.`,
    "",
    "Kind regards,",
    "Phakama Ndamase",
    "Mimshack Wellness",
  ].join("\n");

  const p = 'style="margin:0 0 16px 0;font-size:15px;line-height:23px;color:#2b3440;"';
  const button = (href: string, label: string, colour: string) =>
    `<td style="background:${colour};border-radius:999px;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">${label}</a></td>`;
  const logo = escapeHtml(new URL("/email/mimshack-wellness-logo.png", SITE_URL).toString());

  const html = `<!doctype html>
<html lang="en-ZA"><body style="margin:0;padding:0;background:#eef3f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef3f7;">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
      <tr><td style="height:5px;line-height:5px;font-size:0;background:#1a75ad;background-image:linear-gradient(90deg,#1f86c7,#1a75ad 45%,#8bc34a);">&nbsp;</td></tr>
      <tr><td align="center" style="padding:26px 32px 4px 32px;">
        <img src="${logo}" width="190" alt="Mimshack Wellness" style="display:block;width:190px;max-width:70%;height:auto;border:0;">
      </td></tr>
      <tr><td style="padding:20px 32px 0 32px;">
        <p ${p}>${first ? `Dear ${escapeHtml(first)},` : "Hello,"}</p>
        <p style="margin:0 0 18px 0;font-size:20px;line-height:28px;font-weight:bold;color:#0e3a57;">Your session is booked</p>
      </td></tr>
      <tr><td style="padding:0 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f8ea;border-radius:10px;">
          ${rows
            .map(
              ([k, v], i) => `<tr><td style="padding:${i === 0 ? "16px" : "6px"} 18px ${i === rows.length - 1 ? "16px" : "6px"} 18px;font-size:13px;line-height:20px;color:#3d6b1f;font-weight:bold;width:34%;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:${i === 0 ? "16px" : "6px"} 18px ${i === rows.length - 1 ? "16px" : "6px"} 0;font-size:14px;line-height:20px;color:#2b3440;">${escapeHtml(v)}</td></tr>`,
            )
            .join("")}
        </table>
      </td></tr>
      <tr><td style="padding:20px 32px 6px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${button(gcal, "Add to Google Calendar", "#1a75ad")}</tr></table>
        <p style="margin:10px 0 0 0;font-size:12px;line-height:18px;color:#5a6672;">A calendar invite is also attached for Outlook and Apple Calendar.</p>
      </td></tr>
      ${
        options.consentLink
          ? `<tr><td style="padding:22px 32px 0 32px;">
        <p style="margin:0 0 8px 0;font-size:15px;line-height:23px;font-weight:bold;color:#0e3a57;">Before your first session</p>
        <p ${p}>Please complete and sign the consent form online. It takes about ten minutes.${options.attachConsent ? " The consent form is also attached as a PDF." : ""}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${button(options.consentLink, "Complete the consent form", "#177a41")}</tr></table>
      </td></tr>`
          : options.attachConsent
            ? `<tr><td style="padding:18px 32px 0 32px;"><p style="margin:0;font-size:13px;line-height:20px;color:#5a6672;">A copy of the consent form is attached as a PDF.</p></td></tr>`
            : ""
      }
      <tr><td style="padding:22px 32px 26px 32px;">
        <p ${p}>To change or cancel, reply to this email or WhatsApp ${PHONE} at least 24 hours before.</p>
        <p style="margin:0 0 12px 0;font-size:15px;line-height:22px;color:#2b3440;">Kind regards,</p>
        <div style="border-top:2px solid #8bc34a;padding-top:12px;">
          <div style="font-size:16px;line-height:22px;font-weight:bold;color:#0e3a57;">Phakama Ndamase</div>
          <div style="font-size:13px;line-height:20px;color:#5a6672;">Social Worker, Mimshack Wellness</div>
          <div style="font-size:13px;line-height:20px;color:#5a6672;">${PHONE} &middot; <a href="https://www.mimschakwellness.com" style="color:#1a75ad;text-decoration:none;">www.mimschakwellness.com</a></div>
        </div>
      </td></tr>
    </table>
    <p style="max-width:580px;margin:14px auto 0 auto;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:#7b8794;text-align:center;">This email is confidential and meant only for the person it is addressed to. Mimshack Wellness does not provide an emergency service: in an emergency, contact your local emergency services.</p>
  </td></tr>
</table>
</body></html>`;

  const attachments: { filename: string; content: Buffer | Uint8Array | string; contentType: string }[] = [
    { filename: "session.ics", content: calendarInvite(b), contentType: "text/calendar; charset=utf-8; method=PUBLISH" },
  ];
  if (options.attachConsent) {
    attachments.push({
      filename: "Mimshack-Wellness-Consent-Form.pdf",
      content: await buildBlankConsentPdf({ withFees: !partner }),
      contentType: "application/pdf",
    });
  }

  return { subject, text, html, attachments };
}

/** The consent form PDF's public address, for WhatsApp messages. */
export function consentPdfLink(partnerSlug?: string): string {
  return new URL(partnerSlug ? `/consent/pdf?for=${partnerSlug}` : "/consent/pdf", SITE_URL).toString();
}
