import { getSignature, StorageNotConfigured } from "@/lib/client-entries";
import { hasClientsAccess } from "@/lib/clients-auth";

/**
 * One client's signature as a PNG, for the /clients page.
 *
 * Behind the same password as the page itself: a signature is personal data,
 * and a guessable URL must not be enough to see it.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasClientsAccess())) {
    return new Response("Not found", { status: 404 });
  }

  const { id } = await params;
  let dataUrl: string | null = null;
  try {
    dataUrl = await getSignature(id);
  } catch (error) {
    if (!(error instanceof StorageNotConfigured)) {
      console.error("client form: could not load signature:", error instanceof Error ? error.message : error);
    }
    return new Response("Unavailable", { status: 503 });
  }

  const base64 = dataUrl?.match(/^data:image\/png;base64,(.+)$/)?.[1];
  if (!base64) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(base64, "base64"), {
    headers: {
      "Content-Type": "image/png",
      // Personal data: never kept by a shared cache, only briefly by this browser.
      "Cache-Control": "private, max-age=300",
    },
  });
}
