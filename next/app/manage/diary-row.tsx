"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Booking, BookingStatus } from "@/lib/types";
import { StatusPill, when } from "../bookings/booking-card";

/** Only the moves that make sense from where the booking already is. */
function nextMoves(booking: Booking): { status: BookingStatus; label: string }[] {
  const past = new Date(booking.starts_at) < new Date();
  switch (booking.status) {
    case "requested":
      return [
        { status: "confirmed", label: "Confirm" },
        { status: "cancelled", label: "Decline" },
      ];
    case "confirmed":
      return past
        ? [
            { status: "completed", label: "Mark done" },
            { status: "no_show", label: "No show" },
          ]
        : [{ status: "cancelled", label: "Cancel" }];
    case "cancelled":
      return past ? [] : [{ status: "confirmed", label: "Reinstate" }];
    default:
      return [];
  }
}

export function DiaryRow({ booking }: { booking: Booking }) {
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
    <article className="rounded-lg border p-6" style={{ background: "var(--surface)" }}>
      <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-3">
          <p className="text-lg font-semibold">{at.date}</p>
          <p className="text-2xl" style={{ color: "var(--brand)" }}>
            {at.time}
          </p>
          <p className="mt-1 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
            {booking.service ?? "Consultation"} &middot; {booking.mode_label}
          </p>
        </div>

        <div className="lg:col-span-4">
          <p className="text-lg font-semibold">{booking.full_name}</p>
          <p className="mt-1 text-[0.95rem]">
            <a href={`tel:${booking.phone.replace(/\s/g, "")}`} className="hover:underline">
              {booking.phone}
            </a>
          </p>
          <p className="text-[0.95rem]">
            <a href={`mailto:${booking.email}`} className="break-all hover:underline">
              {booking.email}
            </a>
          </p>
          {booking.notes && (
            <p className="mt-3 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
              “{booking.notes}”
            </p>
          )}
        </div>

        <div className="lg:col-span-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill booking={booking} />
            <span className="text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
              {booking.reference}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <a
              href={`https://wa.me/${booking.phone.replace(/\D/g, "").replace(/^0/, "27")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-4 py-2 text-[0.95rem] font-semibold"
              style={{ background: "var(--wa-btn)", color: "var(--wa-ink)" }}
            >
              WhatsApp them
            </a>
            {nextMoves(booking).map((m) => (
              <button
                key={m.status}
                type="button"
                onClick={() => move(m.status, m.label)}
                disabled={busy !== null}
                className="rounded-full border px-4 py-2 text-[0.95rem] font-semibold disabled:opacity-60"
                style={{ borderColor: "var(--line)" }}
              >
                {busy === m.label ? "…" : m.label}
              </button>
            ))}
          </div>

          {error && (
            <p role="alert" className="mt-3 text-[0.95rem]" style={{ color: "#b42318" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
