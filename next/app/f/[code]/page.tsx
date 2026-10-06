import type { Metadata } from "next";

import { getInvite } from "@/lib/client-entries";

import { FormPageContent } from "../../form/form-page";

export const metadata: Metadata = {
  title: "Counselling consent form | Mimshack Wellness",
  description: "Send your details to Phakama Ndamase at Mimshack Wellness.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * A short link sent to one client from the Admin page: the consent form with
 * their name, email and phone already filled in. The details sit in the
 * database under the code, so they never appear in the link itself. An
 * unknown code, or one the database cannot look up, just opens the form blank.
 */
export default async function InvitedFormPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invite = await getInvite(code).catch(() => null);
  return (
    <FormPageContent
      prefill={
        invite
          ? {
              firstName: invite.firstName || undefined,
              surname: invite.surname || undefined,
              email: invite.email || undefined,
              phone: invite.phone || undefined,
            }
          : {}
      }
    />
  );
}
