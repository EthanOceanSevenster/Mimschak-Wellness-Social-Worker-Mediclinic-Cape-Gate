/**
 * The invitation to complete the consent form: its personal link and the
 * email that carries it.
 *
 * Used by the Admin page's send panel in the browser (to build the link and
 * the "Copy email text" version) and by /api/admin/send-form on the server
 * (to send it), so what Phakama copies and what a client receives are always
 * the same words. Must stay free of Node-only imports.
 */

export type InviteFor = { name?: string; email?: string; phone?: string };

export const INVITE_SUBJECT = "Mimshack Wellness counselling consent form";

const PRACTICE_PHONE = "064 153 3469";

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.trim().length <= 200;
}

function splitName(name = ""): { first?: string; surname?: string } {
  const [first, ...rest] = name.trim().split(/\s+/).filter(Boolean);
  return { first, surname: rest.length ? rest.join(" ") : undefined };
}

/** Splits "Thandi Mokoena" into what the form's two name fields take. */
export function prefillFor(who: InviteFor): {
  firstName: string;
  surname: string;
  email: string;
  phone: string;
} {
  const { first, surname } = splitName(who.name);
  return {
    firstName: (first ?? "").slice(0, 80),
    surname: (surname ?? "").slice(0, 80),
    email: who.email && isEmail(who.email) ? who.email.trim() : "",
    phone: (who.phone ?? "").trim().slice(0, 30),
  };
}

export function hasPrefill(who: InviteFor): boolean {
  const p = prefillFor(who);
  return Boolean(p.firstName || p.surname || p.email || p.phone);
}

/**
 * The link to send: /f/<code> when there are details to fill in, so no email
 * or phone ever appears in it, or plain /form when there are none.
 */
export function formLinkFor(siteUrl: string, code?: string): string {
  return new URL(code ? `/f/${code}` : "/form", siteUrl).toString();
}

/** A link as a person reads it: no https://, no trailing slash. */
export function displayLink(link: string): string {
  return link.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function inviteText(link: string, who: InviteFor): string {
  const { first } = splitName(who.name);
  return [
    first ? `Dear ${first},` : "Hello,",
    "",
    "Thank you for contacting Mimshack Wellness. Before your first session, please complete and sign our counselling consent form online:",
    "",
    link,
    "",
    "It takes about ten minutes. Once you have signed, you can download a copy for your records, and the banking details for payment are shown.",
    "",
    `If you have any questions, reply to this email or WhatsApp ${PRACTICE_PHONE}.`,
    "",
    "Kind regards,",
    "Phakama Ndamase",
    "Mimshack Wellness",
  ].join("\n");
}

export function inviteWhatsApp(link: string, who: InviteFor): string {
  const { first } = splitName(who.name);
  return `${first ? `Hi ${first}, ` : "Hello, "}please complete the Mimshack Wellness counselling consent form before your first session: ${link}`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/**
 * The same message as an HTML email, with a button and the practice's
 * signature. Tables and inline styles only: email apps strip <style> blocks
 * and most CSS layout. siteUrl is where the signature logo is served from.
 */
export function inviteHtml(link: string, who: InviteFor, siteUrl: string): string {
  const { first } = splitName(who.name);
  const greeting = first ? `Dear ${escapeHtml(first)},` : "Hello,";
  const href = escapeHtml(link);
  const logo = escapeHtml(new URL("/email/mimshack-wellness-logo.png", siteUrl).toString());
  const p = 'style="margin:0 0 16px 0;font-size:15px;line-height:23px;color:#2b3440;"';
  return `<!doctype html>
<html lang="en-ZA"><body style="margin:0;padding:0;background:#f5f8fa;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f8fa;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e3e9ef;border-radius:8px;font-family:Arial,Helvetica,sans-serif;">
      <tr><td style="padding:28px 28px 8px 28px;">
        <p ${p}>${greeting}</p>
        <p ${p}>Thank you for contacting Mimshack Wellness. Before your first session, please complete and sign our counselling consent form online.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px 0;"><tr>
          <td style="background:#1a75ad;border-radius:999px;">
            <a href="${href}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">Complete the consent form</a>
          </td>
        </tr></table>
        <p ${p}>It takes about ten minutes. Once you have signed, you can download a copy for your records, and the banking details for payment are shown.</p>
        <p ${p}>If the button does not work, go to <a href="${href}" style="color:#1a75ad;">${escapeHtml(displayLink(link))}</a></p>
        <p ${p}>If you have any questions, reply to this email or WhatsApp ${PRACTICE_PHONE}.</p>
        <p style="margin:0 0 4px 0;font-size:15px;line-height:23px;color:#2b3440;">Kind regards,</p>
      </td></tr>
      <tr><td style="padding:0 28px 24px 28px;">
        <div style="font-size:16px;line-height:22px;font-weight:bold;color:#15608f;">Phakama Ndamase</div>
        <div style="font-size:13px;line-height:19px;color:#5a6672;">Social Worker, Mimshack Wellness</div>
        <img src="${logo}" width="200" alt="Mimshack Wellness" style="display:block;width:200px;max-width:100%;height:auto;border:0;margin:12px 0;">
        <div style="border-top:2px solid #8bc34a;padding-top:10px;font-size:13px;line-height:20px;color:#5a6672;">
          ${PRACTICE_PHONE} &middot; www.mimschakwellness.com<br>Letada Medical Centre, Windsor Park, Kraaifontein, 7530
        </div>
      </td></tr>
    </table>
    <p style="max-width:560px;margin:14px auto 0 auto;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:15px;color:#7b8794;">This email and any attachments are confidential and intended only for the person they are addressed to. If you received it in error, please tell us and delete it.</p>
  </td></tr>
</table>
</body></html>`;
}
