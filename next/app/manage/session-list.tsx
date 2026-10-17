"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Booking, BookingStatus } from "@/lib/types";
import { when } from "../bookings/booking-card";

/** Only the moves that make sense from where the booking already is. */
function nextMoves(booking: Booking): { status: BookingStatus; label: string; primary?: boolean }[] {
  const past = new Date(booking.starts_at) < new Date();
  switch (booking.status) {
    case "requested":
      return [
        { status: "confirmed", label: "Confirm", primary: true },
        { status: "cancelled", label: "Decline" },
      ];
    case "confirmed":
      return past
        ? [
            { status: "completed", label: "Mark done", primary: true },
            { status: "no_show", label: "No show" },
          ]
        : [{ status: "cancelled", label: "Cancel" }];
    case "cancelled":
      return past ? [] : [{ status: "confirmed", label: "Reinstate" }];
    default:
      return [];
  }
}

function whatsapp(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, "").replace(/^0/, "27")}`;
}

/**
 * Sessions as a dense list, one row each, in the manner of an Outlook or
 * Microsoft 365 list: when, who, what, source, status, and the actions on
 * the right. On a phone each row stacks.
 */
export function SessionList({ bookings, empty }: { bookings: Booking[]; empty: string }) {
  if (bookings.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
        {empty}
      </p>
    );
  }
  return (
    <div role="table" aria-label="Sessions" className="@container text-[0.9rem]">
      <div
        role="row"
        className="hidden grid-cols-[9rem_minmax(0,1.3fr)_minmax(0,1fr)_7rem_9.5rem_minmax(13rem,auto)] gap-4 border-b px-4 py-2 text-[0.78rem] font-semibold @[56rem]:grid"
        style={{ color: "var(--text-soft)", background: "#fafafa" }}
      >
        <span role="columnheader">When</span>
        <span role="columnheader">Client</span>
        <span role="columnheader">Service</span>
        <span role="columnheader">Source</span>
        <span role="columnheader">Status</span>
        <span role="columnheader" className="text-right">
          Actions
        </span>
      </div>
      {bookings.map((b) => (
        <SessionRow key={b.reference} booking={b} />
      ))}
    </div>
  );
}

function SessionRow({ booking }: { booking: Booking }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const at = when(booking);

  async function move(status: BookingStatus, label: string) {
    setBusy(label);
    setError(null);
    try {
      const response = await fetch(`/api/manage/${booking.reference}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "That could not be changed.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      role="row"
      id={`booking-${booking.reference}`}
      className="grid scroll-mt-24 gap-x-4 gap-y-2 border-b px-4 py-3 transition-colors hover:bg-[#fafafa] @[56rem]:grid-cols-[9rem_minmax(0,1.3fr)_minmax(0,1fr)_7rem_9.5rem_minmax(13rem,auto)] @[56rem]:items-center"
    >
      <span role="cell">
        <span className="block font-semibold">{at.short}, {at.time}</span>
        <span className="block text-[0.82rem]" style={{ color: "var(--text-soft)" }}>
          {at.weekday}
        </span>
      </span>

      <span role="cell" className="min-w-0">
        <span className="block truncate font-semibold">{booking.full_name}</span>
        <span className="block truncate text-[0.82rem]" style={{ color: "var(--text-soft)" }}>
          <a href={`tel:${booking.phone.replace(/\s/g, "")}`} className="hover:underline">
            {booking.phone}
          </a>
          {booking.email && <> &middot; {booking.email}</>}
        </span>
      </span>

      <span role="cell" className="min-w-0">
        <span className="block truncate">{booking.service ?? "Consultation"}</span>
        <span className="block truncate text-[0.82rem]" style={{ color: "var(--text-soft)" }}>
          {booking.mode_label}
          {booking.notes && <> &middot; &ldquo;{booking.notes}&rdquo;</>}
        </span>
      </span>

      <span role="cell">
        {booking.partner_short ? (
          <span
            className="inline-block rounded px-2 py-0.5 text-[0.78rem] font-semibold"
            style={{ background: "#fdecec", color: "#9b1c1c" }}
            title={`Referred by ${booking.partner_name}${booking.partner_ref ? `, reference ${booking.partner_ref}` : ""}`}
          >
            {booking.partner_short}
            {booking.partner_ref && <span className="font-normal"> &middot; {booking.partner_ref}</span>}
          </span>
        ) : (
          <span className="text-[0.82rem]" style={{ color: "var(--text-soft)" }}>
            Direct
          </span>
        )}
      </span>

      <span role="cell">
        <Status booking={booking} />
      </span>

      <span role="cell" className="flex flex-wrap items-center gap-1.5 @[56rem]:justify-end">
        {nextMoves(booking).map((m) => (
          <button
            key={m.status}
            type="button"
            onClick={() => move(m.status, m.label)}
            disabled={busy !== null}
            className="rounded px-3 py-1.5 text-[0.82rem] font-semibold disabled:opacity-60"
            style={
              m.primary
                ? { background: "var(--btn-bg)", color: "var(--btn-ink)" }
                : { border: "1px solid #d1d1d1", background: "#ffffff" }
            }
          >
            {busy === m.label ? "…" : m.label}
          </button>
        ))}
        <a
          href={whatsapp(booking.phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded px-3 py-1.5 text-[0.82rem] font-semibold"
          style={{ border: "1px solid #d1d1d1", color: "#177a41", background: "#ffffff" }}
        >
          WhatsApp
        </a>
      </span>

      {error && (
        <p role="alert" className="text-[0.85rem] @[56rem]:col-span-6" style={{ color: "#b42318" }}>
          {error}
        </p>
      )}
    </div>
  );
}

const STATUS: Record<string, { label: string; dot: string }> = {
  requested: { label: "Awaiting you", dot: "#c19c00" },
  confirmed: { label: "Confirmed", dot: "#107c10" },
  completed: { label: "Done", dot: "#616161" },
  cancelled: { label: "Cancelled", dot: "#c4314b" },
  no_show: { label: "No show", dot: "#c4314b" },
};

function Status({ booking }: { booking: Booking }) {
  const s = STATUS[booking.status] ?? { label: booking.status_label, dot: "#616161" };
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}
