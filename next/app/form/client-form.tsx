"use client";

import { useId, useRef, useState } from "react";

import {
  BANKING,
  bankingReady,
  CONSENT_AGREE,
  CONSENT_TEXT,
  CONTACT_METHODS,
  DOC_TITLE,
  FEES,
  FORM_MODES,
  FORM_SERVICES,
  LIMITS,
  OTHER_SERVICE,
  PAYMENT_AGREE,
  PERMISSION_LABELS,
  PERMISSIONS,
  POP_CONTACT,
  validateEntry,
  type PermissionAnswer,
  type PermissionKey,
} from "@/lib/client-form";

import { CopyButton } from "../copy-button";
import { SignaturePad } from "./signature-pad";

const FIELD =
  "w-full rounded border px-4 py-3 text-base outline-none transition-colors focus:border-[var(--brand)]";

const LEGEND = "text-xs font-semibold uppercase tracking-[0.18em]";

/* A <legend> is not a grid item, so the fieldset gap never reaches it. */
const SECTION_LEGEND = `${LEGEND} mb-5`;

const HINT = "text-[0.9rem]";
const SOFT = { color: "var(--text-soft)" };
const CARD = "rounded-lg border p-6";
const CARD_STYLE = { background: "var(--bg-soft)" };

const CHOICE =
  "cursor-pointer rounded-full border px-5 py-2.5 text-[0.95rem] font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--green)]";
const CHOSEN = { borderColor: "var(--brand)", background: "var(--tint)" };

/* ------------------------------------------------------------- pieces */

type TextFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
};

function TextField({ label, hint, value, onChange, className = "", ...input }: TextFieldProps) {
  const hintId = useId();
  return (
    <label className={`grid content-start gap-2 ${className}`}>
      <span className="text-[0.95rem] font-medium">{label}</span>
      <input
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? hintId : undefined}
        className={FIELD}
        style={{ background: "var(--surface)" }}
        {...input}
      />
      {hint && (
        <span id={hintId} className={HINT} style={SOFT}>
          {hint}
        </span>
      )}
    </label>
  );
}

/** A row of pill-shaped radio buttons. */
function Choices({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((o) => (
        <label key={o.value} className={CHOICE} style={value === o.value ? CHOSEN : undefined}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function Tick({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`mt-5 flex items-start gap-3 font-medium ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <input
        type="checkbox"
        required
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--brand)]"
      />
      <span>{label}</span>
    </label>
  );
}

function BankingDetails() {
  const rows = [
    { label: "Bank", value: BANKING.bankName },
    { label: "Account name", value: BANKING.accountHolder },
    { label: "Account type", value: BANKING.accountType },
    { label: "Account number", value: BANKING.accountNumber, copy: true },
    { label: "Branch code", value: BANKING.branchCode, copy: true },
    { label: "Payment reference", value: BANKING.reference },
  ].filter((row) => row.value);

  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="border-b pb-3">
          <dt className={LEGEND} style={SOFT}>
            {row.label}
          </dt>
          <dd className="mt-1.5 flex items-center justify-between gap-3">
            <span className="font-semibold tabular-nums">{row.value}</span>
            {row.copy && <CopyButton value={row.value.replace(/\s+/g, "")} />}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ProofOfPayment() {
  return (
    <p className="text-[0.95rem]" style={SOFT}>
      After paying, please send your proof of payment (POP) on WhatsApp to{" "}
      <strong style={{ color: "var(--text)" }}>{POP_CONTACT.whatsapp}</strong> or by email to{" "}
      <strong className="break-all" style={{ color: "var(--text)" }}>
        {POP_CONTACT.email}
      </strong>
      .
    </p>
  );
}

/* --------------------------------------------------------------- form */

const NO_PERMISSIONS: Record<PermissionKey, PermissionAnswer> = {
  permMessages: "",
  permAdminContact: "",
  permRemote: "",
  permAttendance: "",
};

/** Details carried in a link sent from the Admin page, to fill in for the client. */
export type FormPrefill = { firstName?: string; surname?: string; email?: string; phone?: string };

export function ClientForm({ prefill = {} }: { prefill?: FormPrefill }) {
  const [firstName, setFirstName] = useState(prefill.firstName ?? "");
  const [surname, setSurname] = useState(prefill.surname ?? "");
  const [idOrDob, setIdOrDob] = useState("");
  const [phone, setPhone] = useState(prefill.phone ?? "");
  const [email, setEmail] = useState(prefill.email ?? "");
  const [contactMethod, setContactMethod] = useState("");
  const [street, setStreet] = useState("");
  const [suburb, setSuburb] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [service, setService] = useState<string>(FORM_SERVICES[0]);
  const [serviceOther, setServiceOther] = useState("");
  const [mode, setMode] = useState<string>(FORM_MODES[0].value);
  const [note, setNote] = useState("");
  const [permissions, setPermissions] = useState(NO_PERMISSIONS);
  const [agreePayment, setAgreePayment] = useState(false);
  const [agreeConsent, setAgreeConsent] = useState(false);
  const [readConsent, setReadConsent] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [minorName, setMinorName] = useState("");
  const [minorRelationship, setMinorRelationship] = useState("");
  const [minorBasis, setMinorBasis] = useState("");
  const [signedPlace, setSignedPlace] = useState("");
  const [signature, setSignature] = useState("");
  const [website, setWebsite] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAs, setSentAs] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  function showError(message: string) {
    setError(message);
    // Wait for the message to render, then bring it into view.
    window.requestAnimationFrame(() =>
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const payload = {
      firstName,
      surname,
      idOrDob,
      phone,
      email,
      contactMethod,
      street,
      suburb,
      city,
      postalCode,
      service,
      serviceOther,
      mode,
      note,
      ...permissions,
      agreePayment,
      agreeConsent,
      isMinor,
      minorName,
      minorRelationship,
      minorBasis,
      signedPlace,
      signature,
    };

    // The same checks the server makes, so a mistake is caught before sending
    // and explained in the same words.
    const check = validateEntry(payload);
    if (!check.ok) {
      showError(check.error);
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, website }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        showError(body.error ?? "Your form could not be sent. Please try again.");
        return;
      }
      setDownloadUrl(typeof body.downloadUrl === "string" ? body.downloadUrl : null);
      setSentAs(firstName.trim());
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      showError("The form could not be sent. Please check your internet connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  /* ----------------------------------------------------------------- sent */
  if (sentAs !== null) {
    return (
      <div className="grid gap-8">
        <div className="rounded-lg border p-8" style={{ background: "var(--surface)" }}>
          <p className={LEGEND} style={{ color: "var(--green-dark)" }}>
            Form received
          </p>
          <h2 className="mt-3 text-2xl">Thank you{sentAs ? `, ${sentAs}` : ""}</h2>
          <p className="mt-3" style={SOFT}>
            Your consent form has been received. Phakama will contact you to confirm your first
            appointment.
          </p>
          {downloadUrl && (
            <div className="mt-6 rounded-lg border p-5" style={CARD_STYLE}>
              <p className="font-semibold">Your signed consent form</p>
              <p className="mt-1 text-[0.95rem]" style={SOFT}>
                A copy of the {DOC_TITLE.toLowerCase()} with your details and signature. Please
                download it and keep it for your records. This link works for 30 days.
              </p>
              <a
                href={downloadUrl}
                className="mt-4 inline-block rounded-full px-6 py-3 text-[0.95rem] font-semibold"
                style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
              >
                Download signed form (PDF)
              </a>
            </div>
          )}
          {bankingReady() && (
            <p className="mt-3" style={SOFT}>
              Payment for the first session must be made before that session. The banking details
              are below.
            </p>
          )}
        </div>

        {bankingReady() && (
          <div className="grid gap-6 rounded-lg border p-8" style={{ background: "var(--surface)" }}>
            <div>
              <h2 className="text-xl">Banking details for payment</h2>
              <p className="mt-2" style={SOFT}>
                Please pay by EFT. Use your name and surname as the payment reference, so that your
                payment can be matched to you.
              </p>
            </div>
            <BankingDetails />
            <ProofOfPayment />
          </div>
        )}
      </div>
    );
  }

  /* ----------------------------------------------------------------- form */
  return (
    <form
      onSubmit={submit}
      className="grid gap-9 rounded-lg border p-6 sm:p-10"
      style={{ background: "var(--surface)" }}
    >
      <div className="grid gap-2 text-[0.95rem]" style={SOFT}>
        <p>
          This is the Mimshack Wellness <strong style={{ color: "var(--text)" }}>{DOC_TITLE}</strong>.
          Fill in your details in steps 1 to 4. In step 5 you read the consent form, agree to it and
          sign.
        </p>
        <p>
          Every field is required unless it is marked optional. Once you sign, you can download a
          signed copy for your records.
        </p>
      </div>

      {/* ------------------------------------------------------- 1. details */}
      <fieldset className="grid min-w-0 gap-4">
        <legend className={SECTION_LEGEND} style={SOFT}>
          Step 1 of 5 — Your details
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="First name"
            value={firstName}
            onChange={setFirstName}
            maxLength={LIMITS.name}
            autoComplete="given-name"
          />
          <TextField
            label="Surname"
            value={surname}
            onChange={setSurname}
            maxLength={LIMITS.name}
            autoComplete="family-name"
          />
          <TextField
            label="ID number or date of birth"
            hint="Your 13-digit ID number, or your date of birth if you do not have one."
            value={idOrDob}
            onChange={setIdOrDob}
            maxLength={LIMITS.idOrDob}
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 9005145800087 or 14/05/1990"
            className="sm:col-span-2"
          />
          <TextField
            label="Cellphone number"
            value={phone}
            onChange={setPhone}
            maxLength={LIMITS.phone}
            autoComplete="tel"
            inputMode="tel"
            placeholder="e.g. 082 123 4567"
          />
          <TextField
            label="Email address"
            type="email"
            value={email}
            onChange={setEmail}
            maxLength={LIMITS.email}
            autoComplete="email"
            placeholder="e.g. name@gmail.com"
          />
        </div>
        <p className="mt-2 text-[0.95rem] font-medium">How would you prefer to be contacted?</p>
        <Choices
          name="contactMethod"
          options={CONTACT_METHODS}
          value={contactMethod}
          onChange={setContactMethod}
        />
      </fieldset>

      <hr />

      {/* ------------------------------------------------------- 2. address */}
      <fieldset className="grid min-w-0 gap-4">
        <legend className={SECTION_LEGEND} style={SOFT}>
          Step 2 of 5 — Your home address
        </legend>
        <TextField
          label="Street address"
          hint="House or unit number and street name."
          value={street}
          onChange={setStreet}
          maxLength={LIMITS.street}
          autoComplete="address-line1"
          placeholder="e.g. 12 Main Road"
        />
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_9rem]">
          <TextField
            label="Suburb"
            value={suburb}
            onChange={setSuburb}
            maxLength={LIMITS.place}
            autoComplete="address-line2"
            placeholder="e.g. Windsor Park"
          />
          <TextField
            label="City or town"
            value={city}
            onChange={setCity}
            maxLength={LIMITS.place}
            autoComplete="address-level2"
            placeholder="e.g. Kraaifontein"
          />
          <TextField
            label="Postal code"
            value={postalCode}
            onChange={setPostalCode}
            maxLength={4}
            pattern="\d{4}"
            title="Your 4-digit postal code, for example 7570"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="e.g. 7570"
          />
        </div>
      </fieldset>

      <hr />

      {/* ------------------------------------------------------- 3. service */}
      <fieldset className="grid min-w-0 gap-4">
        <legend className={SECTION_LEGEND} style={SOFT}>
          Step 3 of 5 — What you would like help with
        </legend>
        <p className="-mt-1 text-[0.95rem]" style={SOFT}>
          Choose one. If none of these fits, choose Other and describe it in your own words.
        </p>
        <Choices
          name="service"
          options={FORM_SERVICES.map((s) => ({
            value: s,
            label: s === OTHER_SERVICE ? "Other (describe it)" : s,
          }))}
          value={service}
          onChange={setService}
        />

        {service === OTHER_SERVICE && (
          <TextField
            label="Describe what you would like help with"
            value={serviceOther}
            onChange={setServiceOther}
            maxLength={LIMITS.serviceOther}
            autoFocus
            placeholder="e.g. Help coping with stress at work"
          />
        )}

        <p className="mt-3 text-[0.95rem] font-medium">How would you like to attend your sessions?</p>
        <Choices name="mode" options={FORM_MODES} value={mode} onChange={setMode} />
        <p className={HINT} style={SOFT}>
          In-person sessions take place at Letada Medical Centre, Windsor Park, Kraaifontein.
        </p>

        <label className="mt-3 grid gap-2">
          <span className="text-[0.95rem] font-medium">
            Anything you would like Phakama to know before your first session{" "}
            <span style={SOFT}>(optional)</span>
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={LIMITS.note}
            rows={4}
            className={FIELD}
            style={{ background: "var(--surface)" }}
          />
          <span className={HINT} style={SOFT}>
            You do not need to go into detail here. You can discuss everything during your session.
          </span>
        </label>
      </fieldset>

      <hr />

      {/* ------------------------------------------------- 4. permissions */}
      <fieldset className="grid min-w-0 gap-5">
        <legend className={SECTION_LEGEND} style={SOFT}>
          Step 4 of 5 — Permissions
        </legend>
        <p className="-mt-1 text-[0.95rem]" style={SOFT}>
          Please answer each question.
        </p>
        {PERMISSIONS.map((permission, i) => (
          <fieldset key={permission.key} className="grid gap-3">
            <legend className="text-[0.95rem] font-medium">
              {i + 1}. {permission.text}
            </legend>
            <div className="mt-3">
              <Choices
                name={permission.key}
                options={(permission.allowNotApplicable
                  ? (["yes", "no", "na"] as const)
                  : (["yes", "no"] as const)
                ).map((a) => ({ value: a, label: PERMISSION_LABELS[a] }))}
                value={permissions[permission.key]}
                onChange={(v) =>
                  setPermissions((p) => ({ ...p, [permission.key]: v as PermissionAnswer }))
                }
              />
            </div>
          </fieldset>
        ))}
      </fieldset>

      <hr />

      {/* ---------------------------------------------- 5. consent, signature */}
      <fieldset className="grid min-w-0 gap-5">
        <legend className={SECTION_LEGEND} style={SOFT}>
          Step 5 of 5 — Consent and signature
        </legend>

        {/* The full document lives at /consent, in a new tab, so the form
            stays short and nothing typed here is lost while reading it. The
            agree box unlocks once it has been opened. rel="opener" keeps the
            link back, so "Back to the form" there can simply close the tab. */}
        <div className={CARD} style={CARD_STYLE}>
          <h3 className="text-lg">Read the consent form</h3>
          <p className="mt-2 text-[0.95rem]" style={SOFT}>
            It explains the service, confidentiality and its limits, records and privacy, practical
            arrangements, fees and payment, and cancellation. Please read it before you agree and
            sign.
          </p>
          <a
            href="/consent"
            target="_blank"
            rel="opener"
            onClick={() => setReadConsent(true)}
            className="mt-4 inline-block rounded-full px-6 py-3 text-[0.95rem] font-semibold"
            style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
          >
            Read the consent form
          </a>
          <p className={`mt-3 ${HINT}`} style={readConsent ? { color: "var(--green-dark)" } : SOFT}>
            {readConsent
              ? "\u2713 Opened. When you have read it, tick the box below."
              : "The tick box below unlocks once you have opened the consent form."}
          </p>

          <p className="mt-5 border-t pt-5 text-[0.95rem]" style={SOFT}>
            {CONSENT_TEXT}
          </p>
          <Tick
            label={CONSENT_AGREE}
            checked={agreeConsent}
            onChange={setAgreeConsent}
            disabled={!readConsent}
          />
        </div>

        <div className={CARD} style={CARD_STYLE}>
          <h3 className="text-lg">Fees and payment</h3>
          <p className="mt-2 text-[0.95rem]" style={SOFT}>
            {FEES.map((fee) => `${fee.label}: ${fee.amount}.`).join(" ")} Payment for the first
            session must be made before that session. The banking details are in the consent form,
            and are shown again once you submit.
          </p>
          <Tick label={PAYMENT_AGREE} checked={agreePayment} onChange={setAgreePayment} />
        </div>

        <div className="grid gap-3">
          <p className="text-[0.95rem] font-medium">
            Are you completing this form for a child under 18?
          </p>
          <Choices
            name="isMinor"
            options={[
              { value: "no", label: "No, it is for me" },
              { value: "yes", label: "Yes, for a child" },
            ]}
            value={isMinor ? "yes" : "no"}
            onChange={(v) => setIsMinor(v === "yes")}
          />
        </div>

        {isMinor && (
          <div className={`${CARD} grid gap-4`} style={CARD_STYLE}>
            <p className="text-[0.95rem]" style={SOFT}>
              Step 1 should hold your own details as the person signing. Add the child&rsquo;s
              details here.
            </p>
            <TextField
              label="Full name of the child"
              value={minorName}
              onChange={setMinorName}
              maxLength={LIMITS.name * 2}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Your relationship to the child"
                value={minorRelationship}
                onChange={setMinorRelationship}
                maxLength={LIMITS.place}
                placeholder="e.g. Mother"
              />
              <TextField
                label="Basis for consenting for the child"
                value={minorBasis}
                onChange={setMinorBasis}
                maxLength={LIMITS.place}
                placeholder="e.g. Parent or legal guardian"
              />
            </div>
          </div>
        )}

        <TextField
          label="Place of signing"
          hint="The town or city where you are signing this form."
          value={signedPlace}
          onChange={setSignedPlace}
          maxLength={LIMITS.place}
          placeholder="e.g. Kraaifontein"
          className="sm:max-w-sm"
        />

        <div className="grid gap-3">
          <div>
            <p id="signature-label" className="text-[0.95rem] font-medium">
              Signature of {isMinor ? "parent or guardian" : "client"}
            </p>
            <p className="mt-1 text-[0.95rem]" style={SOFT}>
              Sign in the box below using your finger on a phone or tablet, or your mouse on a
              computer. Tap Clear to start again.
            </p>
          </div>
          <SignaturePad
            labelId="signature-label"
            onChange={(dataUrl) => {
              setSignature(dataUrl);
              // Signing answers the "please sign" message, so it should not linger.
              if (dataUrl) setError(null);
            }}
          />
          {signature && (firstName || surname) && (
            <p className={HINT} style={SOFT}>
              Signed by {`${firstName} ${surname}`.trim()} on{" "}
              {new Date().toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {signedPlace.trim() ? ` at ${signedPlace.trim()}` : ""}.
            </p>
          )}
          <p className="text-[0.95rem]" style={SOFT}>
            By signing, you confirm that the information in this form is correct and that you agree
            to everything above.
          </p>
        </div>
      </fieldset>

      {/* Honeypot. Hidden from people and from screen readers; see /api/form. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px select-none overflow-hidden"
      >
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {error && (
        <p
          ref={errorRef}
          role="alert"
          className="rounded border px-4 py-3"
          style={{ borderColor: "#b42318", color: "#b42318" }}
        >
          {error}
        </p>
      )}

      <div className="grid gap-4">
        <div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full px-8 py-4 font-semibold disabled:opacity-60"
            style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
          >
            {busy ? "Sending…" : "Sign and submit form"}
          </button>
        </div>
        <p className="text-[0.95rem]" style={SOFT}>
          Your information is kept private and is used only by Mimshack Wellness to provide the
          service and manage your sessions.
        </p>
      </div>
    </form>
  );
}
