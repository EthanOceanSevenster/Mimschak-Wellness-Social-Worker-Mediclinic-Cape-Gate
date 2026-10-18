"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { Booking } from "@/lib/types";

type Option = { value: string; label: string };

type Props = {
  services: Option[];
  modes: Option[];
  partners: { slug: string; name: string; short: string; referenceLabel: string; nextRef: string }[];
  /** Pre-chosen date (YYYY-MM-DD), e.g. today. */
  defaultDate: string;
};

const NEW_ON_DAY = "mw:new-session-on-day";
const EDIT = "mw:edit-session";

/** Opens the session form on an existing session, from a session's Edit button. */
export function editSession(booking: Booking) {
  window.dispatchEvent(new CustomEvent(EDIT, { detail: booking }));
}

const SA = "Africa/Johannesburg";

const STATUSES = [
  { value: "requested", label: "Awaiting confirmation" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Done" },
  { value: "no_show", label: "No show" },
  { value: "cancelled", label: "Cancelled" },
];

const TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

const FIELD =
  "w-full rounded-md border border-[#d1d1d1] bg-white px-3 py-2 text-[0.92rem] outline-none transition-colors hover:border-[#a8a8a8] focus:border-[#1a75ad] focus:ring-2 focus:ring-[#1a75ad]/20";

/** Dropdowns: the browser's arrow replaced by a neat chevron, same height and border as the text boxes. */
const SELECT = `${FIELD} h-10 cursor-pointer appearance-none pr-9 font-medium`;

/**
 * "New session": the practice adds a session itself, for a booking made by
 * phone, WhatsApp or in person, and can send the consent form with it.
 */
export function AddSession({ services, modes, partners, defaultDate }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    name: string;
    emailed: boolean;
    consent: boolean;
    email: string;
    whatsapp?: string;
    note?: string;
  } | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    service: services[0]?.value ?? "",
    mode: modes[0]?.value ?? "",
    date: defaultDate,
    time: "09:00",
    partner: "",
    partner_ref: "",
    notes: "",
    status: "confirmed",
  });
  const [sendConsent, setSendConsent] = useState(true);
  const [timeOpen, setTimeOpen] = useState(false);
  /** The session being edited, or null when adding a new one. */
  const [editing, setEditing] = useState<Booking | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setTimeOpen((popup) => {
        if (!popup) setOpen(false);
        return false;
      });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function start(date: string = defaultDate) {
    setError(null);
    setDone(null);
    setEditing(null);
    // A fresh form each time, so nothing carries over from a session just edited.
    setForm({
      full_name: "",
      phone: "",
      email: "",
      service: services[0]?.value ?? "",
      mode: modes[0]?.value ?? "",
      date,
      time: "09:00",
      partner: "",
      partner_ref: "",
      notes: "",
      status: "confirmed",
    });
    setOpen(true);
  }

  function startEdit(b: Booking) {
    const at = new Date(b.starts_at);
    setError(null);
    setDone(null);
    setEditing(b);
    setForm({
      full_name: b.full_name,
      phone: b.phone,
      email: b.email,
      service: b.service_slug ?? services[0]?.value ?? "",
      mode: b.mode,
      date: new Intl.DateTimeFormat("en-CA", { timeZone: SA }).format(at),
      time: new Intl.DateTimeFormat("en-GB", { timeZone: SA, hour: "2-digit", minute: "2-digit", hour12: false }).format(at),
      partner: b.partner ?? "",
      partner_ref: b.partner_ref ?? "",
      notes: b.notes,
      status: b.status,
    });
    setOpen(true);
  }

  // A click on a day in the calendar opens this form on that day; a
  // session's Edit button opens it on that session.
  useEffect(() => {
    const onDay = (e: Event) => start((e as CustomEvent<{ date: string }>).detail.date);
    const onEdit = (e: Event) => startEdit((e as CustomEvent<Booking>).detail);
    window.addEventListener(NEW_ON_DAY, onDay);
    window.addEventListener(EDIT, onEdit);
    return () => {
      window.removeEventListener(NEW_ON_DAY, onDay);
      window.removeEventListener(EDIT, onEdit);
    };
    // start only sets state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        const response = await fetch(`/api/manage/${editing.reference}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(body.error ?? "The changes could not be saved.");
          return;
        }
        router.refresh();
        setOpen(false);
        return;
      }
      const response = await fetch("/api/manage/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, partner_ref: partner?.nextRef ?? "", send_consent: sendConsent }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "The session could not be saved.");
        return;
      }
      router.refresh();
      setDone({
        name: form.full_name,
        emailed: Boolean(body.emailed),
        consent: sendConsent,
        email: form.email,
        whatsapp: body.consent?.whatsapp,
        note: body.consent?.error,
      });
    } catch {
      setError("There is a problem with the connection. Please try again.");
    } finally {
      setBusy(false);
    }
  }


  const partner = partners.find((p) => p.slug === form.partner);

  return (
    <>
      <button
        type="button"
        onClick={() => start()}
        className="inline-flex h-8 items-center gap-1.5 rounded px-3 text-[0.88rem] font-semibold text-white"
        style={{ background: "#1a75ad" }}
      >
        <span aria-hidden="true" className="text-lg leading-none">+</span> New session
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-6"
          style={{ background: "rgb(15 23 32 / 0.45)" }}
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={editing ? "Edit session" : "New session"}
            tabIndex={-1}
            className="max-h-[94vh] w-full overflow-y-auto rounded-t-xl bg-white outline-none sm:max-w-2xl sm:rounded-xl"
            style={{ boxShadow: "0 24px 60px -20px rgb(0 0 0 / 0.4)" }}
          >
            <div className="flex items-center justify-between border-b px-5 py-3.5" style={{ borderColor: "#e0e0e0" }}>
              <h2 className="text-[1.1rem] font-semibold">
                {done ? "Session added" : editing ? `Edit session ${editing.reference}` : "New session"}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#f0f0f0]"
              >
                &times;
              </button>
            </div>

            {done ? (
              <div className="px-6 py-8 text-center">
                <span
                  aria-hidden="true"
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl"
                  style={{ background: "#e6f4ec", color: "#177a41" }}
                >
                  &#10003;
                </span>
                <p className="mt-4 text-[1.05rem] font-semibold">{done.name}&rsquo;s session is in the calendar.</p>
                {done.emailed && (
                  <p className="mx-auto mt-2 max-w-md text-[0.92rem]" style={{ color: "#424242" }}>
                    A booking email with a calendar invite has gone to {done.email}
                    {done.consent ? ", with the consent form" : ""}.
                  </p>
                )}
                {done.note && (
                  <p className="mx-auto mt-3 max-w-md text-[0.9rem]" style={{ color: "#b42318" }}>
                    {done.note}
                  </p>
                )}
                {done.whatsapp && (
                  <div className="mt-5">
                    <a
                      href={done.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded px-5 py-2.5 text-[0.92rem] font-semibold text-white"
                      style={{ background: "#177a41" }}
                    >
                      Send the consent form on WhatsApp
                    </a>
                  </div>
                )}
                <div className="mt-7 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => start(form.date)}
                    className="rounded border px-4 py-2 text-[0.9rem] font-semibold"
                    style={{ borderColor: "#d1d1d1" }}
                  >
                    Add another
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded px-4 py-2 text-[0.9rem] font-semibold text-white"
                    style={{ background: "#1a75ad" }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={save} className="grid gap-4 px-5 py-5 sm:grid-cols-2">
                <Field label="Client's name">
                  <input required value={form.full_name} onChange={set("full_name")} className={`${FIELD} h-10`} placeholder="e.g. Thandi Mokoena" />
                </Field>
                <Field label="Cellphone">
                  <input required value={form.phone} onChange={set("phone")} className={`${FIELD} h-10`} inputMode="tel" placeholder="e.g. 082 123 4567" />
                </Field>
                <Field label="Email (optional)" wide>
                  <input type="email" value={form.email} onChange={set("email")} className={`${FIELD} h-10`} placeholder="e.g. thandi@gmail.com" />
                </Field>

                <Field label="Date">
                  <input required type="date" value={form.date} onChange={set("date")} className={`${FIELD} h-10 cursor-pointer`} />
                </Field>
                {/* Time: a field that opens a small popup of times. Not a <label>,
                    which would click the first time button inside it. */}
                <div className="relative grid content-start gap-1.5">
                  <span className="text-[0.85rem] font-semibold" style={{ color: "#424242" }}>
                    Time
                  </span>
                  <button
                    type="button"
                    onClick={() => setTimeOpen((v) => !v)}
                    aria-haspopup="listbox"
                    aria-expanded={timeOpen}
                    className={`${FIELD} flex h-10 items-center justify-between text-left font-medium`}
                  >
                    <span>
                      {form.time} &ndash; {String(Number(form.time.slice(0, 2)) + 1).padStart(2, "0")}:00
                    </span>
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#616161" strokeWidth="1.8" aria-hidden="true">
                      <circle cx="12" cy="12" r="8.5" />
                      <path d="M12 7.5V12l3 2" strokeLinecap="round" />
                    </svg>
                  </button>
                  {timeOpen && (
                    <>
                      {/* a click anywhere else closes it */}
                      <div className="fixed inset-0 z-10" onClick={() => setTimeOpen(false)} aria-hidden="true" />
                      <div
                        role="listbox"
                        aria-label="Choose a time"
                        className="absolute left-0 right-0 top-full z-20 mt-1.5 rounded-lg border bg-white p-3"
                        style={{ borderColor: "#d1d1d1", boxShadow: "0 12px 32px -12px rgb(0 0 0 / 0.3)" }}
                      >
                        <p className="mb-2 text-[0.8rem] font-semibold" style={{ color: "#616161" }}>
                          Choose a time
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {TIMES.map((t) => {
                            const on = form.time === t;
                            return (
                              <button
                                key={t}
                                type="button"
                                role="option"
                                aria-selected={on}
                                onClick={() => {
                                  setForm((f) => ({ ...f, time: t }));
                                  setTimeOpen(false);
                                }}
                                className="h-9 rounded-md border text-[0.85rem] font-medium transition-colors hover:border-[#1a75ad] hover:bg-[#eaf3fa]"
                                style={on ? { background: "#1a75ad", borderColor: "#1a75ad", color: "#ffffff" } : { borderColor: "#d1d1d1" }}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <Field label="Service">
                  <Chevron>
                    <select value={form.service} onChange={set("service")} className={SELECT}>
                    {services.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  </Chevron>
                </Field>
                <Field label="In person or online">
                  <Chevron>
                    <select value={form.mode} onChange={set("mode")} className={SELECT}>
                    {modes.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  </Chevron>
                </Field>

                <Field label="Referred by">
                  <Chevron>
                    {/* An existing session keeps its referrer and reference. */}
                    <select value={form.partner} onChange={set("partner")} className={SELECT} disabled={Boolean(editing)}>
                    <option value="">Nobody (direct)</option>
                    {partners.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  </Chevron>
                </Field>
                {partner && (
                  <Field label={partner.referenceLabel}>
                    <input
                      value={editing ? form.partner_ref : partner.nextRef}
                      readOnly
                      className={`${FIELD} h-10 cursor-default bg-[#fafafa]`}
                    />
                  </Field>
                )}
                {editing ? (
                  <Field label="Status">
                    <Chevron>
                      <select value={form.status} onChange={set("status")} className={SELECT}>
                        {STATUSES.map((st) => (
                          <option key={st.value} value={st.value}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </Chevron>
                  </Field>
                ) : partner ? null : (
                  <Field label="Status">
                    <Chevron>
                      <select value={form.status} onChange={set("status")} className={SELECT}>
                      <option value="confirmed">Confirmed</option>
                      <option value="requested">Awaiting confirmation</option>
                    </select>
                    </Chevron>
                  </Field>
                )}

                <Field label="Notes (optional)" wide>
                  <textarea value={form.notes} onChange={set("notes")} rows={2} className={FIELD} placeholder="e.g. first session, prefers a call before" />
                </Field>

                {/* the consent form toggle (new sessions only) */}
                {!editing && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded border px-4 py-3 sm:col-span-2" style={{ borderColor: "#e0e0e0", background: "#fafafa" }}>
                  <label className="flex cursor-pointer items-center gap-3">
                    <span className="relative inline-flex">
                      <input
                        type="checkbox"
                        role="switch"
                        checked={sendConsent}
                        onChange={(e) => setSendConsent(e.target.checked)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className="h-5 w-9 rounded-full transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
                        style={{ background: sendConsent ? "#1a75ad" : "#c8c8c8" }}
                      />
                      <span
                        aria-hidden="true"
                        className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                        style={{ transform: sendConsent ? "translateX(16px)" : "none" }}
                      />
                    </span>
                    <span className="text-[0.92rem] font-semibold">Send the consent form</span>
                  </label>
                  <span className="flex gap-4">
                    <a
                      href={partner ? `/consent?for=${partner.slug}` : "/consent"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[0.88rem] font-semibold hover:underline"
                      style={{ color: "#1a75ad" }}
                    >
                      Read the consent form
                    </a>
                    <a
                      href={partner ? `/consent/pdf?for=${partner.slug}` : "/consent/pdf"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[0.88rem] font-semibold hover:underline"
                      style={{ color: "#1a75ad" }}
                    >
                      Open the PDF
                    </a>
                  </span>
                  {sendConsent && (
                    <p className="w-full text-[0.82rem]" style={{ color: "#616161" }}>
                      {form.email
                        ? "Goes with the booking email: a link to sign online, and the form as a PDF."
                        : "No email given: after saving you get a WhatsApp button with the link to the form."}
                    </p>
                  )}
                </div>
                )}

                {error && (
                  <p role="alert" className="rounded border px-3 py-2 text-[0.9rem] sm:col-span-2" style={{ borderColor: "#b42318", color: "#b42318", background: "#fef3f2" }}>
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-2 border-t pt-4 sm:col-span-2" style={{ borderColor: "#e0e0e0" }}>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded border px-4 py-2 text-[0.9rem] font-semibold"
                    style={{ borderColor: "#d1d1d1" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded px-4 py-2 text-[0.9rem] font-semibold text-white disabled:opacity-60"
                    style={{ background: "#1a75ad" }}
                  >
                    {busy ? "Saving…" : editing ? "Save changes" : "Save session"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`grid content-start gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-[0.85rem] font-semibold" style={{ color: "#424242" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * A day on the Admin calendar. Clicking the day (anywhere but on a session)
 * opens New session on that date; the + button does the same from the
 * keyboard.
 */
export function DayCell({
  date,
  label,
  className,
  style,
  children,
}: {
  date: string;
  label: string;
  className: string;
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  const open = () => window.dispatchEvent(new CustomEvent(NEW_ON_DAY, { detail: { date } }));
  return (
    <div
      className={`group relative cursor-pointer transition-colors hover:bg-[#eaf3fa] ${className}`}
      style={style}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button")) return;
        open();
      }}
      title={`Add a session on ${label}`}
    >
      {children}
      <button
        type="button"
        onClick={open}
        aria-label={`Add a session on ${label}`}
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded text-[1rem] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        style={{ background: "#1a75ad" }}
      >
        +
      </button>
    </div>
  );
}

function Chevron({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative block">
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        width="16"
        height="16"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: "#616161" }}
      >
        <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
