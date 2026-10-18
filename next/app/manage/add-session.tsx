"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Option = { value: string; label: string };

type Props = {
  services: Option[];
  modes: Option[];
  partners: { slug: string; name: string; short: string; referenceLabel: string }[];
  /** Pre-chosen date (YYYY-MM-DD), e.g. today. */
  defaultDate: string;
};

const NEW_ON_DAY = "mw:new-session-on-day";

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
  const [done, setDone] = useState<{ name: string; emailed: boolean; whatsapp?: string; note?: string } | null>(null);

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
  const panel = useRef<HTMLDivElement>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function start(date: string = defaultDate) {
    setError(null);
    setDone(null);
    setForm((f) => ({ ...f, full_name: "", phone: "", email: "", partner: "", partner_ref: "", notes: "", date }));
    setOpen(true);
  }

  // A click on a day in the calendar opens this form on that day.
  useEffect(() => {
    const onDay = (e: Event) => start((e as CustomEvent<{ date: string }>).detail.date);
    window.addEventListener(NEW_ON_DAY, onDay);
    return () => window.removeEventListener(NEW_ON_DAY, onDay);
    // start only sets state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/manage/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, send_consent: sendConsent }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "The session could not be saved.");
        return;
      }
      router.refresh();
      setDone({
        name: form.full_name,
        emailed: Boolean(body.consent?.emailed),
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
            aria-label="New session"
            tabIndex={-1}
            className="max-h-[94vh] w-full overflow-y-auto rounded-t-xl bg-white outline-none sm:max-w-2xl sm:rounded-xl"
            style={{ boxShadow: "0 24px 60px -20px rgb(0 0 0 / 0.4)" }}
          >
            <div className="flex items-center justify-between border-b px-5 py-3.5" style={{ borderColor: "#e0e0e0" }}>
              <h2 className="text-[1.1rem] font-semibold">{done ? "Session added" : "New session"}</h2>
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
              <div className="px-5 py-6">
                <p className="text-[0.95rem]">
                  {done.name}&rsquo;s session is in the calendar.
                  {done.emailed && " The consent form has been emailed to them."}
                </p>
                {done.note && (
                  <p className="mt-3 text-[0.9rem]" style={{ color: "#b42318" }}>
                    {done.note}
                  </p>
                )}
                {done.whatsapp && !done.emailed && (
                  <a
                    href={done.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block rounded px-4 py-2 text-[0.9rem] font-semibold text-white"
                    style={{ background: "#177a41" }}
                  >
                    Send the consent form on WhatsApp
                  </a>
                )}
                <div className="mt-6 flex gap-2">
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
                <Field label="Time">
                  <Chevron>
                    <select value={form.time} onChange={set("time")} className={SELECT}>
                    {TIMES.map((t) => (
                      <option key={t} value={t}>
                        {t} – {String(Number(t.slice(0, 2)) + 1).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                  </Chevron>
                </Field>

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
                    <select value={form.partner} onChange={set("partner")} className={SELECT}>
                    <option value="">Nobody (direct)</option>
                    {partners.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  </Chevron>
                </Field>
                {partner ? (
                  <Field label={`${partner.referenceLabel} (optional)`}>
                    <input value={form.partner_ref} onChange={set("partner_ref")} className={`${FIELD} h-10`} placeholder={`e.g. the number ${partner.short} gave`} />
                  </Field>
                ) : (
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

                {/* the consent form toggle */}
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
                  <a
                    href="/consent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[0.88rem] font-semibold hover:underline"
                    style={{ color: "#1a75ad" }}
                  >
                    Read the consent form
                  </a>
                  {sendConsent && (
                    <p className="w-full text-[0.82rem]" style={{ color: "#616161" }}>
                      {form.email ? "Emailed to the client when you save." : "No email given: you get a WhatsApp button to send it after saving."}
                    </p>
                  )}
                </div>

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
                    {busy ? "Saving…" : "Save session"}
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
    <label className={`grid gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
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
