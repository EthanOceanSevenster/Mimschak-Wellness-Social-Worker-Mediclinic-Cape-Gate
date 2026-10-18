import { buildBlankConsentPdf } from "@/lib/consent-pdf";
import { getPartner } from "@/lib/partners";

/**
 * The consent form as a PDF to read or print: /consent/pdf, or
 * /consent/pdf?for=<partner> for a partner's clients (no fees section).
 * Linked from WhatsApp messages; the same file is attached to session emails.
 */
export async function GET(request: Request) {
  const partner = getPartner(new URL(request.url).searchParams.get("for"));
  const pdf = await buildBlankConsentPdf({ withFees: !partner });
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="Mimshack-Wellness-Consent-Form.pdf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
