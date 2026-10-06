import type { Metadata } from "next";

import { LIMITS } from "@/lib/client-form";

import { type FormPrefill } from "./client-form";
import { FormPageContent } from "./form-page";

export const metadata: Metadata = {
  title: "Counselling consent form | Mimshack Wellness",
  description: "Send your details to Phakama Ndamase at Mimshak Wellness.",
  // Shared by link, not found by search.
  robots: { index: false, follow: false },
};

/** A value from an older link, tidied and capped; anything odd is left out. */
function fromLink(value: string | string[] | undefined, max: number): string | undefined {
  const text = (Array.isArray(value) ? value[0] : value)?.trim();
  return text && text.length <= max ? text : undefined;
}

/**
 * The blank consent form. Links sent from the Admin page now go to
 * /f/<code> instead; the query values here only keep links sent before
 * that change working.
 */
export default async function FormPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const prefill: FormPrefill = {
    firstName: fromLink(params.first, LIMITS.name),
    surname: fromLink(params.surname, LIMITS.name),
    email: fromLink(params.email, LIMITS.email),
    phone: fromLink(params.phone, LIMITS.phone),
  };
  return <FormPageContent prefill={prefill} />;
}
