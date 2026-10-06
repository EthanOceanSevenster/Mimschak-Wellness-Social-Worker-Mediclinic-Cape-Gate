"use client";

import { useState } from "react";

import { CopyButton } from "./copy-button";

const FIELD =
  "w-full rounded border px-4 py-2.5 text-base outline-none transition-colors focus:border-[var(--brand)]";

const BUTTON =
  "inline-flex items-center rounded-full px-4 py-2 text-[0.9rem] font-semibold transition-colors";

const SUBJECT = "Mimshack Wellness counselling consent form";

/** 082 123 4567 → 27821234567, the form wa.me expects. */
function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
}

/**
 * Sends the consent form to one person, for the Admin page and the client list.
 *
 * Whoever it is for is optional. What is filled in goes into the link, so the
 * form opens with their name, email and phone already entered.
 *
 * "Send by email" opens the practice's email app with the message written and
 * addressed; it is sent from that app, so from the Zoho mailbox when Zoho Mail
 * is the email app. "Copy email text" is the same message to paste into Zoho
 * Mail in a browser. Nothing is sent by the website itself: the free Zoho plan
 * does not let another system send through it.
 */
export function SendFormPanel({ formUrl }: { formUrl: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [first, ...rest] = name.trim().split(/\s+/).filter(Boolean);
  const cleanEmail = email.trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  const waDigits = whatsappNumber(phone);

  const url = new URL(formUrl);
  if (first) url.searchParams.set("first", first);
  if (rest.length) url.searchParams.set("surname", rest.join(" "));
  if (emailOk) url.searchParams.set("email", cleanEmail);
  if (phone.trim()) url.searchParams.set("phone", phone.trim());
  const link = url.toString();

  const greeting = first ? `Dear ${first},` : "Hello,";

  const emailText = [
    greeting,
    "",
    "Thank you for contacting Mimshack Wellness. Before your first session, please complete and sign our counselling consent form online:",
    "",
    link,
    "",
    "It takes about ten minutes. Once you have signed, you can download a copy for your records, and the banking details for payment are shown.",
    "",
    "If you have any questions, reply to this email or WhatsApp 064 153 3469.",
    "",
    "Kind regards,",
    "Phakama Ndamase",
    "Mimshack Wellness",
  ].join("\n");

  const whatsappText = `${first ? `Hi ${first}, ` : "Hello, "}please complete the Mimshack Wellness counselling consent form before your first session: ${link}`;

  const mailto = `mailto:${emailOk ? cleanEmail : ""}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(emailText)}`;
  const whatsapp = `https://wa.me/${waDigits.length >= 9 ? waDigits : ""}?text=${encodeURIComponent(whatsappText)}`;

  return (
    <div className="rounded-lg border p-6 sm:p-7" style={{ background: "var(--surface)" }}>
      <h2 className="text-xl">Send the consent form</h2>
      <p className="mt-1 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
        Fill in who it is for, then send it by email or WhatsApp, or copy the link. Their details
        are filled in on the form for them. All three fields are optional.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1.5">
          <span className="text-[0.9rem] font-medium">Client&rsquo;s name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            onChange={(e) => setEmail(e.target.value)}
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
            onChange={(e) => setPhone(e.target.value)}
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
        <a
          href={mailto}
          className={BUTTON}
          style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
        >
          Send by email
        </a>
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
        <CopyButton value={emailText} label="Copy email text" />
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BUTTON} border hover:border-[var(--brand)]`}
        >
          Open form
        </a>
      </div>

      <p className="mt-4 text-[0.88rem]" style={{ color: "var(--text-soft)" }}>
        &ldquo;Send by email&rdquo; opens your email app with the message ready to send. If that is
        not Zoho Mail, use &ldquo;Copy email text&rdquo; and paste it into a new email in Zoho Mail.
      </p>
    </div>
  );
}
