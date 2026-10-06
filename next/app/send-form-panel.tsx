"use client";

import { useRef, useState } from "react";

import { inviteText, inviteWhatsApp, isEmail } from "@/lib/consent-invite";

const FIELD =
  "w-full rounded border px-4 py-2.5 text-base outline-none transition-colors focus:border-[var(--brand)]";

const BUTTON =
  "inline-flex items-center rounded-full px-4 py-2 text-[0.9rem] font-semibold transition-colors disabled:opacity-60";

/** 082 123 4567 → 27821234567, the form wa.me expects. */
function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
}

type Status =
  | { kind: "idle" }
  | { kind: "busy"; what: string }
  | { kind: "sent"; to: string }
  | { kind: "copied"; what: string }
  | { kind: "copy-by-hand"; text: string }
  | { kind: "error"; message: string };

/**
 * Sends the consent form to one person, for the Admin page and the client list.
 *
 * Every button uses a short private link from /api/admin/invite: /f/<code>,
 * which fills in what is typed here on the form without the client's email or
 * phone ever appearing in the link. "Send email" sends from the website itself
 * (see /api/admin/send-form), from the practice's address.
 */
export function SendFormPanel({ emailReady }: { emailReady: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // One short link per set of details, so pressing several buttons for the
  // same client does not create several codes.
  const cache = useRef<{ key: string; link: string } | null>(null);

  const who = { name, email, phone };
  const busy = status.kind === "busy";

  function change(set: (value: string) => void) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      set(event.target.value);
      if (!busy) setStatus({ kind: "idle" });
    };
  }

  async function shortLink(): Promise<string> {
    const key = JSON.stringify([name.trim(), email.trim(), phone.trim()]);
    if (cache.current?.key === key) return cache.current.link;
    const response = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(who),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || typeof body.link !== "string") {
      throw new Error(body.error ?? "The link could not be made just now. Please try again.");
    }
    cache.current = { key, link: body.link };
    return body.link;
  }

  /** Opens a tab straight away, inside the click, so pop-up blockers allow it. */
  async function openWith(what: string, build: (link: string) => string) {
    const tab = window.open("about:blank", "_blank");
    setStatus({ kind: "busy", what });
    try {
      const target = build(await shortLink());
      if (tab) tab.location.href = target;
      else window.location.href = target;
      setStatus({ kind: "idle" });
    } catch (error) {
      tab?.close();
      setStatus({ kind: "error", message: (error as Error).message });
    }
  }

  async function copy(what: string, build: (link: string) => string) {
    setStatus({ kind: "busy", what });
    let text = "";
    try {
      text = build(await shortLink());
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStatus({ kind: "copied", what });
    } catch {
      // Some browsers refuse the clipboard after a pause: show it to copy instead.
      setStatus({ kind: "copy-by-hand", text });
    }
  }

  async function sendEmail() {
    if (!isEmail(email)) {
      setStatus({ kind: "error", message: "Please enter the client's email address, for example name@gmail.com." });
      return;
    }
    setStatus({ kind: "busy", what: "email" });
    try {
      const response = await fetch("/api/admin/send-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(who),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({ kind: "error", message: body.error ?? "The email could not be sent. Please try again." });
        return;
      }
      setStatus({ kind: "sent", to: email.trim() });
    } catch {
      setStatus({ kind: "error", message: "Could not reach the website. Check your connection and try again." });
    }
  }

  const waDigits = whatsappNumber(phone);
  const whatsappTo = (link: string) =>
    `https://wa.me/${waDigits.length >= 9 ? waDigits : ""}?text=${encodeURIComponent(inviteWhatsApp(link, who))}`;

  return (
    <div className="rounded-lg border p-6 sm:p-7" style={{ background: "var(--surface)" }}>
      <h2 className="text-xl">Send the consent form</h2>
      <p className="mt-1 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
        Fill in who it is for, then send it. Each client gets a short private link, and their details
        are filled in on the form for them.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1.5">
          <span className="text-[0.9rem] font-medium">Client&rsquo;s name</span>
          <input
            value={name}
            onChange={change(setName)}
            maxLength={120}
            placeholder="e.g. Thandi Mokoena"
            autoComplete="off"
            className={FIELD}
            style={{ background: "var(--surface)" }}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[0.9rem] font-medium">Email address</span>
          <input
            type="email"
            value={email}
            onChange={change(setEmail)}
            maxLength={200}
            placeholder="e.g. thandi@gmail.com"
            autoComplete="off"
            className={FIELD}
            style={{ background: "var(--surface)" }}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[0.9rem] font-medium">Cellphone number</span>
          <input
            value={phone}
            onChange={change(setPhone)}
            maxLength={30}
            inputMode="tel"
            placeholder="e.g. 082 123 4567"
            autoComplete="off"
            className={FIELD}
            style={{ background: "var(--surface)" }}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={sendEmail}
          disabled={busy}
          className={BUTTON}
          style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
        >
          {status.kind === "busy" && status.what === "email" ? "Sending…" : "Send email"}
        </button>
        <button
          type="button"
          onClick={() => openWith("whatsapp", whatsappTo)}
          disabled={busy}
          className={BUTTON}
          style={{ background: "var(--wa-btn)", color: "var(--wa-ink)" }}
        >
          Send on WhatsApp
        </button>
        <button
          type="button"
          onClick={() => copy("link", (link) => link)}
          disabled={busy}
          className={`${BUTTON} border hover:border-[var(--brand)]`}
        >
          {status.kind === "copied" && status.what === "link" ? "Copied" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={() => copy("email text", (link) => inviteText(link, who))}
          disabled={busy}
          className={`${BUTTON} border hover:border-[var(--brand)]`}
        >
          {status.kind === "copied" && status.what === "email text" ? "Copied" : "Copy email text"}
        </button>
        <button
          type="button"
          onClick={() => openWith("form", (link) => link)}
          disabled={busy}
          className={`${BUTTON} border hover:border-[var(--brand)]`}
        >
          Open form
        </button>
      </div>

      <div aria-live="polite">
        {status.kind === "sent" && (
          <p
            className="mt-4 rounded border px-4 py-3 text-[0.95rem] font-medium"
            style={{ borderColor: "var(--green-dark)", color: "var(--green-dark)" }}
          >
            {"✓"} Sent to {status.to}. Their replies come to the practice inbox.
          </p>
        )}
        {status.kind === "copy-by-hand" && (
          <div className="mt-4 rounded border px-4 py-3 text-[0.95rem]">
            <p style={{ color: "var(--text-soft)" }}>Your browser would not copy it. Select it here and copy:</p>
            <textarea
              readOnly
              value={status.text}
              rows={status.text.includes("\n") ? 6 : 1}
              onFocus={(e) => e.currentTarget.select()}
              className={`${FIELD} mt-2`}
              aria-label="Text to copy"
            />
          </div>
        )}
        {status.kind === "error" && (
          <p
            role="alert"
            className="mt-4 rounded border px-4 py-3 text-[0.95rem]"
            style={{ borderColor: "#b42318", color: "#b42318" }}
          >
            {status.message}
          </p>
        )}
      </div>

      {!emailReady && (
        <p className="mt-4 text-[0.88rem]" style={{ color: "#b54708" }}>
          Sending email from the website is not switched on yet. Until it is, use Copy email text and
          paste it into a new email in Zoho Mail.
        </p>
      )}
    </div>
  );
}

