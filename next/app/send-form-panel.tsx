"use client";

import { useState } from "react";

import { inviteLink, inviteText, inviteWhatsApp, isEmail } from "@/lib/consent-invite";

import { CopyButton } from "./copy-button";

const FIELD =
  "w-full rounded border px-4 py-2.5 text-base outline-none transition-colors focus:border-[var(--brand)]";

const BUTTON =
  "inline-flex items-center rounded-full px-4 py-2 text-[0.9rem] font-semibold transition-colors";

/** 082 123 4567 → 27821234567, the form wa.me expects. */
function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
}

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; to: string } | { kind: "error"; message: string };

/**
 * Sends the consent form to one person, for the Admin page and the client list.
 *
 * "Send email" sends it from the website itself (see /api/admin/send-form and
 * lib/mailer.ts), from the practice's address with replies to its inbox.
 * WhatsApp, Copy link and Copy email text use the same personal link: it
 * carries what is filled in here, so the form opens with it already entered.
 */
export function SendFormPanel({ formUrl, emailReady }: { formUrl: string; emailReady: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const who = { name, email, phone };
  const link = inviteLink(formUrl, who);
  const waDigits = whatsappNumber(phone);
  const whatsapp = `https://wa.me/${waDigits.length >= 9 ? waDigits : ""}?text=${encodeURIComponent(inviteWhatsApp(link, who))}`;

  function change(set: (value: string) => void) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      set(event.target.value);
      // A new recipient makes an old "Sent" or error message misleading.
      if (status.kind !== "sending") setStatus({ kind: "idle" });
    };
  }

  async function sendEmail() {
    if (!isEmail(email)) {
      setStatus({ kind: "error", message: "Please enter the client's email address, for example name@gmail.com." });
      return;
    }
    setStatus({ kind: "sending" });
    try {
      const response = await fetch("/api/admin/send-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
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

  return (
    <div className="rounded-lg border p-6 sm:p-7" style={{ background: "var(--surface)" }}>
      <h2 className="text-xl">Send the consent form</h2>
      <p className="mt-1 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
        Fill in who it is for, then send it. Their details are filled in on the form for them.
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
          disabled={status.kind === "sending"}
          className={`${BUTTON} disabled:opacity-60`}
          style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
        >
          {status.kind === "sending" ? "Sending…" : "Send email"}
        </button>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={BUTTON}
          style={{ background: "var(--wa-btn)", color: "var(--wa-ink)" }}
        >
          Send on WhatsApp
        </a>
        <CopyButton value={link} label="Copy link" />
        <CopyButton value={inviteText(link, who)} label="Copy email text" />
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BUTTON} border hover:border-[var(--brand)]`}
        >
          Open form
        </a>
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
