"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { Booking } from "@/lib/types";

const TONE: Record<string, { fg: string; bg: string }> = {
  requested: { fg: "#8a5a00", bg: "#fdf3e0" },
  confirmed: { fg: "#1a5c34", bg: "#e6f4ec" },
  cancelled: { fg: "#8a2b25", bg: "#fbeceb" },
  completed: { fg: "#3a4a58", bg: "#eef2f6" },
  no_show: { fg: "#8a2b25", bg: "#fbeceb" },
};

/** What the status means, in words a person can act on. A bare "Requested"
    badge tells somebody nothing about whether they still need to do something. */
const MEANING: Record<string, string> = {
  requested:
    "Phakama has not confirmed this yet. If you have not sent it on WhatsApp, do that now — that is how she hears about it.",
  confirmed: "You are booked in. Phakama is expecting you.",
  cancelled: "This session was cancelled.",
  completed: "This session has taken place.",
  no_show: "Recorded as not attended.",
};

export function StatusPill({ booking }: { booking: Booking }) {
  const tone = TONE[booking.status] ?? TONE.completed;
  return (
    <span
      className="rounded-full px-3 py-1 text-[0.78rem] font-semibold uppercase tracking-wide"
      style={{ color: tone.fg, background: tone.bg }}
    >
      {booking.status_label}
    </span>
  );
}

export function when(booking: Booking) {
  const d = new Date(booking.starts_at);
  const e = new Date(booking.ends_at);
  return {
    date: d.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" }),
    short: d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }),
    weekday: d.toLocaleDateString("en-ZA", { weekday: "long" }),
    time: d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false }),
    until: e.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

/**
 * "in 4 days", rendered only after mount.
 *
 * The server and the browser can sit in different timezones and are certainly
 * some milliseconds apart, so computing this during render risks a hydration
 * mismatch on a string that changes by the day.
 */
function useCountdown(iso: string): string | null {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const start = new Date(iso);
    const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((midnight(start) - midnight(new Date())) / 86_400_000);
    if (days < 0) setLabel(null);
    else if (days === 0) setLabel("today");
    else if (days === 1) setLabel("tomorrow");
    else if (days < 14) setLabel(`in ${days} days`);
    else setLabel(`in ${Math.round(days / 7)} weeks`);
  }, [iso]);
  return label;
}

/** An .ics built in the browser from data the page already has — no extra
    endpoint, and it works with Outlook, Apple Calendar and Google alike. */
function downloadCalendar(booking: Booking) {
  const stamp = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mimshak Wellness//Bookings//EN",
    "BEGIN:VEVENT",
    `UID:${booking.reference}@mimschakwellness.com`,
    `DTSTAMP:${stamp(booking.created_at)}`,
    `DTSTART:${stamp(booking.starts_at)}`,
    `DTEND:${stamp(booking.ends_at)}`,
    `SUMMARY:${booking.service ?? "Consultation"} - Mimshak Wellness`,
    `LOCATION:${
      booking.mode === "online"
        ? "Online video call"
        : "Letada Medical Centre, Windsor Park, Kraaifontein, Cape Town, 7530"
    }`,
    `DESCRIPTION:Reference ${booking.reference}. Phakama Ndamase, registered social worker. 064 153 3469.`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mimschak-${booking.reference}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function useCancel(booking: Booking) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const at = when(booking);

  async function cancel() {
    if (!confirm(`Cancel your ${at.date} session at ${at.time}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${booking.reference}/cancel`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "That could not be cancelled.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return { cancel, busy, error };
}

const WA_BUTTON = "rounded-full px-5 py-2.5 text-[0.95rem] font-semibold";
const PLAIN_BUTTON =
  "rounded-full border px-5 py-2.5 text-[0.95rem] font-semibold disabled:opacity-60";

/* ------------------------------------------------------------------ hero */
/** The next session, given the room it deserves — it is the one thing
    somebody opens this page to find out. */
export function NextSession({ booking }: { booking: Booking }) {
  const at = when(booking);
  const countdown = useCountdown(booking.starts_at);
  const { cancel, busy, error } = useCancel(booking);
  const tone = TONE[booking.status] ?? TONE.completed;

  return (
    <article className="overflow-hidden rounded-lg border" style={{ background: "var(--surface)" }}>
      <div className="border-b px-8 py-7" style={{ background: "var(--bg-soft)" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <p
            className="text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--text-soft)" }}
          >
            Your next session
          </p>
          {countdown && (
            <p className="text-[0.95rem] font-semibold" style={{ color: "var(--brand-dark)" }}>
              {countdown}
            </p>
          )}
        </div>

        <p className="mt-3 text-2xl font-bold sm:text-3xl">{at.date}</p>
        <p className="mt-1 text-2xl sm:text-3xl" style={{ color: "var(--brand-dark)" }}>
          {at.time} &ndash; {at.until}
        </p>
        <p className="mt-3 text-lg">
          {booking.service ?? "Consultation"} &middot; {booking.mode_label}
        </p>
      </div>

      <div className="px-8 py-7">
        {/* Says what the status means for you, not just what it is called. */}
        <div className="rounded px-5 py-4" style={{ background: tone.bg, color: tone.fg }}>
          <p className="text-[0.78rem] font-semibold uppercase tracking-wide">
            {booking.status_label}
          </p>
          <p className="mt-1.5 text-[0.95rem]">{MEANING[booking.status]}</p>
        </div>

        <dl className="mt-7 grid gap-6 sm:grid-cols-2">
          <div>
            <dt
              className="text-xs font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--text-soft)" }}
            >
              Where
            </dt>
            <dd className="mt-2">
              {booking.mode === "online" ? (
                "Online. Phakama will send you a video call link before the session."
              ) : (
                <>
                  Letada Medical Centre
                  <br />
                  Windsor Park, Kraaifontein, 7530
                  <br />
                  <a
                    href="https://maps.google.com/?q=Letada+Medical+Centre+Windsor+Park+Kraaifontein"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: "var(--brand-dark)" }}
                  >
                    Open in Maps
                  </a>
                </>
              )}
            </dd>
          </div>
          <div>
            <dt
              className="text-xs font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--text-soft)" }}
            >
              Reference
            </dt>
            <dd className="mt-2 text-lg font-semibold">{booking.reference}</dd>
            <dd className="mt-1 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
              Quote this if you call or message.
            </dd>
          </div>
        </dl>

        {booking.notes && (
          <p className="mt-6 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
            You added: &ldquo;{booking.notes}&rdquo;
          </p>
        )}

        {error && (
          <p role="alert" className="mt-5 text-[0.95rem]" style={{ color: "#b42318" }}>
            {error}
          </p>
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href={booking.whatsapp_url}
            target="_blank"
            rel="noopener noreferrer"
            className={WA_BUTTON}
            style={{ background: "var(--wa-btn)", color: "var(--wa-ink)" }}
          >
            {booking.status === "requested" ? "Send on WhatsApp" : "Message Phakama"}
          </a>
          <button
            type="button"
            onClick={() => downloadCalendar(booking)}
            className={PLAIN_BUTTON}
            style={{ borderColor: "var(--line)" }}
          >
            Add to calendar
          </button>
          {booking.can_cancel && (
            <button
              type="button"
              onClick={cancel}
              disabled={busy}
              className={PLAIN_BUTTON}
              style={{ borderColor: "var(--line)", color: "var(--text-soft)" }}
            >
              {busy ? "Cancelling…" : "Cancel"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ rows */
/** Everything after the next one: compact, scannable, still actionable. */
export function BookingRow({ booking, muted = false }: { booking: Booking; muted?: boolean }) {
  const at = when(booking);
  const { cancel, busy, error } = useCancel(booking);

  return (
    <article
      className="rounded-lg border p-5"
      style={{ background: "var(--surface)", opacity: muted ? 0.9 : 1 }}
    >
      <div className="grid gap-4 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-3">
          <p className="font-semibold">{at.weekday}</p>
          <p style={{ color: "var(--text-soft)" }}>
            {at.short} &middot; {at.time}
          </p>
        </div>

        <div className="lg:col-span-4">
          <p className="font-semibold">{booking.service ?? "Consultation"}</p>
          <p className="text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
            {booking.mode_label} &middot; {booking.reference}
          </p>
        </div>

        <div className="lg:col-span-5">
          <div className="flex flex-wrap items-center gap-4">
            <StatusPill booking={booking} />
            <a
              href={booking.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.95rem] font-semibold underline"
              style={{ color: "var(--brand-dark)" }}
            >
              Message
            </a>
            {booking.can_cancel && (
              <button
                type="button"
                onClick={cancel}
                disabled={busy}
                className="text-[0.95rem] font-semibold underline disabled:opacity-60"
                style={{ color: "var(--text-soft)" }}
              >
                {busy ? "Cancelling…" : "Cancel"}
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="mt-2 text-[0.95rem]" style={{ color: "#b42318" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
