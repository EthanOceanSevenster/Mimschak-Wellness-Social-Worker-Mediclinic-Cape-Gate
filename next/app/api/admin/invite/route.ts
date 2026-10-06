import { NextResponse } from "next/server";

import { createInvite, StorageNotConfigured } from "@/lib/client-entries";
import { hasAdminAccess } from "@/lib/clients-auth";
import { formLinkFor, hasPrefill, prefillFor } from "@/lib/consent-invite";

/**
 * A short link to the consent form for one client, for the Admin page's
 * Copy link, WhatsApp and Open form buttons.
 *
 * Signed-in practice only. With no details filled in the link is plain /form;
 * otherwise /f/<code>, which fills them in on the form without putting the
 * client's email or phone in the link itself.
 */
export async function POST(request: Request) {
  if (!(await hasAdminAccess())) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const who = {
    name: typeof body.name === "string" ? body.name.slice(0, 120) : "",
    email: typeof body.email === "string" ? body.email : "",
    phone: typeof body.phone === "string" ? body.phone.slice(0, 30) : "",
  };
  const site = new URL("/", request.url).toString();

  if (!hasPrefill(who)) return NextResponse.json({ link: formLinkFor(site) });

  try {
    const code = await createInvite(prefillFor(who));
    return NextResponse.json({ link: formLinkFor(site, code) });
  } catch (error) {
    if (!(error instanceof StorageNotConfigured)) {
      console.error("invite: could not create link:", error instanceof Error ? error.message : error);
    }
    return NextResponse.json({ error: "The link could not be made just now. Please try again." }, { status: 503 });
  }
}
