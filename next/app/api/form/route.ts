import { NextResponse } from "next/server";

import { saveEntry, StorageNotConfigured } from "@/lib/client-entries";
import { validateEntry } from "@/lib/client-form";

/** Take one client form entry. Anyone with the link may post. */
export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "That form could not be read." }, { status: 400 });
  }

  // Honeypot. The "website" field is hidden from people, so only a bot fills
  // it in. It is told the entry went through, so it has no reason to retry.
  if (raw && typeof raw === "object" && (raw as Record<string, unknown>).website) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const result = validateEntry(raw);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  let downloadToken: string;
  try {
    downloadToken = await saveEntry(result.value);
  } catch (error) {
    if (error instanceof StorageNotConfigured) {
      return NextResponse.json(
        { error: "The form is not taking entries yet. Please send a WhatsApp instead." },
        { status: 503 },
      );
    }
    // The message only, never the entry: it holds a client's personal details.
    console.error("client form: could not save entry:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Your details could not be saved. Please try again, or send a WhatsApp." },
      { status: 500 },
    );
  }

  // The client's private link to their own signed consent form.
  return NextResponse.json({ ok: true, downloadUrl: `/api/form/signed/${downloadToken}` }, { status: 201 });
}
