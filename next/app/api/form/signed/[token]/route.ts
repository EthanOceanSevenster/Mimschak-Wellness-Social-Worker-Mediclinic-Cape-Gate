import { getSignedEntryByToken, StorageNotConfigured } from "@/lib/client-entries";
import { buildConsentPdf, consentFileName } from "@/lib/consent-pdf";

/**
 * The client's own signed consent form, as a PDF.
 *
 * The token in the URL is the only key: it is random, given only to the
 * person who just signed, and expires (see TOKEN_DAYS), so no sign-in is
 * needed. An unknown or expired token gets the same plain 404 as a wrong one.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const entry = await getSignedEntryByToken(token);
    if (!entry) {
      return new Response(
        "This download link has expired or is not valid. Please ask Mimshack Wellness for a copy of your signed form.",
        { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    }
    const pdf = await buildConsentPdf(entry);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${consentFileName(entry)}"`,
        // Personal data: never kept by a shared cache.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (!(error instanceof StorageNotConfigured)) {
      console.error("client form: could not build signed PDF:", error instanceof Error ? error.message : error);
    }
    return new Response("The signed form could not be created just now. Please try again.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
