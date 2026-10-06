import nodemailer from "nodemailer";

/**
 * Sends email from the website. Server only.
 *
 * Plain SMTP, configured entirely by environment variables, so the provider
 * can change without a code change:
 *
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS   the mail server
 *   MAIL_FROM        the sending address, on the practice's domain
 *   MAIL_FROM_NAME   shown as the sender (default "Phakama Ndamase, Mimshack Wellness")
 *   MAIL_REPLY_TO    where replies go (default MAIL_FROM)
 *
 * For Zoho ZeptoMail (the practice's free Zoho plan cannot send for a
 * website itself): SMTP_HOST=smtp.zeptomail.com, SMTP_PORT=587,
 * SMTP_USER=emailapikey, SMTP_PASS=<the Mail Agent's SMTP password>.
 * For a paid Zoho Mail plan: SMTP_HOST=smtp.zoho.com, SMTP_PORT=465,
 * SMTP_USER=<mailbox address>, SMTP_PASS=<an app-specific password>.
 */

export class MailNotConfigured extends Error {
  constructor() {
    super("Email sending is not set up: SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM are needed.");
  }
}

function settings() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM?.trim();
  if (!host || !user || !pass || !from) return null;
  const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10) || 587;
  return {
    host,
    port,
    user,
    pass,
    from,
    fromName: process.env.MAIL_FROM_NAME?.trim() || "Phakama Ndamase, Mimshack Wellness",
    replyTo: process.env.MAIL_REPLY_TO?.trim() || from,
  };
}

export function mailConfigured(): boolean {
  return settings() !== null;
}

export async function sendMail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const s = settings();
  if (!s) throw new MailNotConfigured();
  const transport = nodemailer.createTransport({
    host: s.host,
    port: s.port,
    // 465 is TLS from the first byte; 587 starts plain and upgrades.
    secure: s.port === 465,
    requireTLS: s.port !== 465,
    auth: { user: s.user, pass: s.pass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
  await transport.sendMail({
    from: { name: s.fromName, address: s.from },
    replyTo: s.replyTo,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
