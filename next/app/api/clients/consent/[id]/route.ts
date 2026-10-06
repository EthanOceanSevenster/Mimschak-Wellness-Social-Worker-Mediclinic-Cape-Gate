import { getSignedEntry, StorageNotConfigured } from "@/lib/client-entries";
import { hasAdminAccess } from "@/lib/clients-auth";
import { buildConsentPdf, consentFileName } from "@/lib/consent-pdf";

/** Any client's signed consent form, as a PDF, for the practice. Behind the /clients sign-in. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminAccess())) {
    return new Response("Not found", { status: 404 });
  }

  const { id } = await params;
  try {
    const entry = await getSignedEntry(id);
    if (!entry) return new Response("Not found", { status: 404 });
    const pdf = await buildConsentPdf(entry);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        // Opens in the browser's PDF viewer; it can be saved or printed from there.
        "Content-Disposition": `inline; filename="${consentFileName(entry)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (!(error instanceof StorageNotConfigured)) {
      console.error("client form: could not build signed PDF:", error instanceof Error ? error.message : error);
    }
    return new Response("The signed form could not be created just now.", { status: 503 });
  }
}
