import { NextResponse } from "next/server";

import { createInvite } from "@/lib/client-entries";
import { hasAdminAccess } from "@/lib/clients-auth";
import { formLinkFor, INVITE_SUBJECT, inviteHtml, inviteText, isEmail, prefillFor } from "@/lib/consent-invite";
import { MailNotConfigured, sendMail } from "@/lib/mailer";

/**
 * Emails the consent form to one client, from the Admin page's send panel.
 *
 * Signed-in practice only: otherwise anyone could make the site send email.
 * The link is a short /f/<code> one, made here on the address this request
 * came in on, so it points at the live site and never shows the client's
 * email or phone.
 */
export async function POST(request: Request) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const who = {
    name: typeof body.name === "string" ? body.name.slice(0, 120) : "",
    email: typeof body.email === "string" ? body.email.trim() : "",
    phone: typeof body.phone === "string" ? body.phone.slice(0, 30) : "",
  };
  if (!isEmail(who.email)) {
    return NextResponse.json(
      { error: "Please enter the client's email address, for example name@gmail.com." },
      { status: 400 },
    );
  }

  const site = new URL("/", request.url).toString();

  try {
    const link = formLinkFor(site, await createInvite(prefillFor(who)));
    await sendMail({
      to: who.email,
      subject: INVITE_SUBJECT,
      text: inviteText(link, who),
      html: inviteHtml(link, who, site),
    });
  } catch (error) {
    if (error instanceof MailNotConfigured) {
      return NextResponse.json(
        { error: "Email sending is not set up yet. Use Copy email text for now." },
        { status: 503 },
      );
    }
    // The reason only, never the address: it is a client's personal detail.
    console.error("send form: email failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "The email could not be sent just now. Please try again, or use Copy email text." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
