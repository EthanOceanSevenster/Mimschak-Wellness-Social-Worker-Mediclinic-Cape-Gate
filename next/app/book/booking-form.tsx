"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Booking, DiaryDay, Practice } from "@/lib/types";

type Props = { practice: Practice; days: DiaryDay[]; signedIn: boolean; knownEmail: string | null };

const FIELD =
  "w-full rounded border px-4 py-3 text-base outline-none transition-colors focus:border-[var(--brand)]";

function formatDay(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return {
    weekday: d.toLocaleDateString("en-ZA", { weekday: "short" }),
    day: d.toLocaleDateString("en-ZA", { day: "numeric" }),
    month: d.toLocaleDateString("en-ZA", { month: "short" }),
    full: d.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" }),
  };
}

export function BookingForm({ practice, days, signedIn, knownEmail }: Props) {
  const router = useRouter();
  const bookable = useMemo(() => days.filter((d) => d.slots.length > 0), [days]);

  const [service, setService] = useState(practice.services[0]?.slug ?? "");
  const [mode, setMode] = useState(practice.modes[0]?.value ?? "in_person");
  const [date, setDate] = useState(bookable[0]?.date ?? "");
  const [time, setTime] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(knownEmail ?? "");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<Booking | null>(null);

  const slots = bookable.find((d) => d.date === date)?.slots ?? [];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!date || !time) {
      setError("Please choose a day and a time.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service,
          mode,
          date,
          time,
          full_name: fullName,
          email,
          phone,
          notes,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "That booking could not be made.");
        // The slot may have gone while the form was open; pull fresh times.
        router.refresh();
        return;
      }
      setBooked(body as Booking);
    } catch {
      setError("Could not reach the booking system. Please send a WhatsApp instead.");
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------ confirmed */
  if (booked) {
    const when = new Date(booked.starts_at);
    return (
      <div className="rounded-lg border p-8" style={{ background: "var(--surface)" }}>
        <p
          className="text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ color: "var(--green-dark)" }}
        >
          Requested
        </p>
        <h2 className="mt-3 text-2xl">Your session is held</h2>
        <p className="mt-3" style={{ color: "var(--text-soft)" }}>
          Reference <strong style={{ color: "var(--text)" }}>{booked.reference}</strong> —{" "}
          {booked.service ?? "Consultation"} on{" "}
          {when.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })} at{" "}
          {when.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false })}.
        </p>

        {/* The one action that matters: the practice does not know yet until
            this message is sent. Said plainly rather than left to be guessed. */}
        <p className="mt-5">Send it through on WhatsApp so Phakama can confirm:</p>
        <a
          href={booked.whatsapp_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-3 rounded-full px-7 py-4 font-semibold"
          style={{ background: "var(--wa-btn)", color: "var(--wa-ink)" }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
          </svg>
          Send on WhatsApp
        </a>

        <p className="mt-6 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
          {signedIn ? (
            <>
              It is saved to your account —{" "}
              <a href="/bookings" className="underline">
                see your bookings
              </a>
              .
            </>
          ) : (
            <>
              <a href="/login?tab=register" className="underline">
                Create an account
              </a>{" "}
              with {email} to check this booking later.
            </>
          )}
        </p>
      </div>
    );
  }

  /* ----------------------------------------------------------------- form */
  if (bookable.length === 0) {
    return (
      <div className="rounded-lg border p-8" style={{ background: "var(--surface)" }}>
        <h2 className="text-xl">No times open just now</h2>
        <p className="mt-3" style={{ color: "var(--text-soft)" }}>
          The diary has nothing free in the next two weeks. Send a message and Phakama will find
          you a time.
        </p>
        <a
          href={practice.whatsapp_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block rounded-full px-7 py-3.5 font-semibold"
          style={{ background: "var(--wa-btn)", color: "var(--wa-ink)" }}
        >
          Ask on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-9">
      {/* ------------------------------------------------------- 1. service */}
      <fieldset className="grid gap-4">
        <legend className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-soft)" }}>
          1 — What do you need
        </legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {practice.services.map((s) => (
            <label
              key={s.slug}
              className="cursor-pointer rounded-lg border p-5 transition-colors"
              style={
                service === s.slug
                  ? { borderColor: "var(--brand)", background: "var(--tint)" }
                  : { background: "var(--surface)" }
              }
            >
              <input
                type="radio"
                name="service"
                value={s.slug}
                checked={service === s.slug}
                onChange={() => setService(s.slug)}
                className="sr-only"
              />
              <span className="block font-semibold">{s.name}</span>
              <span className="mt-1 block text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
                {s.description}
              </span>
              <span className="mt-2 block text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
                {s.duration_minutes} minutes
              </span>
            </label>
          ))}
        </div>

        <div className="mt-1 flex flex-wrap gap-3">
          {practice.modes.map((m) => (
            <label
              key={m.value}
              className="cursor-pointer rounded-full border px-5 py-2.5 text-[0.95rem] font-medium"
              style={
                mode === m.value
                  ? { borderColor: "var(--brand)", background: "var(--tint)" }
                  : undefined
              }
            >
              <input
                type="radio"
                name="mode"
                value={m.value}
                checked={mode === m.value}
                onChange={() => setMode(m.value)}
                className="sr-only"
              />
              {m.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* ---------------------------------------------------------- 2. when */}
      <fieldset className="grid gap-4">
        <legend className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-soft)" }}>
          2 — When suits you
        </legend>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {bookable.map((d) => {
            const label = formatDay(d.date);
            const on = date === d.date;
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => {
                  setDate(d.date);
                  setTime("");
                }}
                aria-pressed={on}
                className="shrink-0 rounded-lg border px-5 py-3 text-center"
                style={on ? { borderColor: "var(--brand)", background: "var(--tint)" } : undefined}
              >
                <span className="block text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
                  {label.weekday}
                </span>
                <span className="block text-lg font-semibold">{label.day}</span>
                <span className="block text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
                  {label.month}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3">
          {slots.map((s) => {
            const on = time === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setTime(s)}
                aria-pressed={on}
                className="rounded-full border px-5 py-2.5 text-[0.95rem] font-medium"
                style={on ? { borderColor: "var(--brand)", background: "var(--tint)" } : undefined}
              >
                {s}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* ---------------------------------------------------------- 3. you */}
      <fieldset className="grid gap-4">
        <legend className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-soft)" }}>
          3 — How to reach you
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-[0.95rem] font-medium">Your name</span>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={FIELD}
              style={{ background: "var(--surface)" }}
              autoComplete="name"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-[0.95rem] font-medium">Phone / WhatsApp</span>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={FIELD}
              style={{ background: "var(--surface)" }}
              autoComplete="tel"
              inputMode="tel"
              placeholder="082 123 4567"
            />
          </label>
        </div>
        <label className="grid gap-2">
          <span className="text-[0.95rem] font-medium">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD}
            style={{ background: "var(--surface)" }}
            autoComplete="email"
          />
          <span className="text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
            Used to find this booking again if you make an account.
          </span>
        </label>
        <label className="grid gap-2">
          <span className="text-[0.95rem] font-medium">
            Anything Phakama should know{" "}
            <span style={{ color: "var(--text-soft)" }}>(optional)</span>
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={FIELD}
            style={{ background: "var(--surface)" }}
          />
        </label>
      </fieldset>

      {error && (
        <p
          role="alert"
          className="rounded border px-4 py-3"
          style={{ borderColor: "#b42318", color: "#b42318" }}
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-5">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full px-8 py-4 font-semibold disabled:opacity-60"
          style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
        >
          {busy ? "Holding your slot…" : "Request this session"}
        </button>
        <p className="text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
          You will send it on WhatsApp on the next screen.
        </p>
      </div>
    </form>
  );
}
