import {
  contactMethodLabel,
  fullName,
  modeLabel,
  PERMISSION_LABELS,
  PERMISSIONS,
  serviceLabel,
  type ClientEntry,
} from "@/lib/client-form";

import { BUTTON, DAY, LEGEND, WHEN, whatsappNumber } from "./shared";

/** A small uppercase section label inside an entry. */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <h3 className={LEGEND} style={{ color: "var(--text-soft)" }}>
      {children}
    </h3>
  );
}

/** One labelled fact, so no value on the page appears without its name. */
function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.82rem]" style={{ color: "var(--text-soft)" }}>
        {label}
      </dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

export const OK_STYLE: React.CSSProperties = {
  background: "color-mix(in srgb, var(--green-dark) 16%, transparent)",
  color: "var(--green-dark)",
};
export const MUTED_STYLE: React.CSSProperties = {
  background: "var(--bg-soft)",
  color: "var(--text-soft)",
};
export const CHILD_STYLE: React.CSSProperties = { background: "#fef0c7", color: "#93370d" };
const BAD_STYLE: React.CSSProperties = { background: "#fde8e7", color: "#b42318" };

export function Chip({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className="whitespace-nowrap rounded-full px-3 py-1 text-[0.82rem] font-semibold"
      style={ok ? OK_STYLE : BAD_STYLE}
    >
      {ok ? "✓" : "✗"} {children}
    </span>
  );
}

/** Everything one client gave, on their own page. */
export function EntryCard({ entry }: { entry: ClientEntry }) {
  const name = fullName(entry);
  const signed = new Date(entry.createdAt);
  return (
    <article className="overflow-hidden rounded-lg border" style={{ background: "var(--surface)" }}>
      {/* ---------------------------------------------------------- header */}
      <header
        className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-5"
        style={{ background: "var(--bg-soft)" }}
      >
        <div>
          <h1 className="text-2xl">{name}</h1>
          <p className="mt-0.5 text-[0.9rem]" style={{ color: "var(--text-soft)" }}>
            Submitted <time dateTime={entry.createdAt}>{WHEN.format(signed)}</time>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip ok={entry.agreeConsent}>Consent given</Chip>
          <Chip ok={entry.agreePayment}>Fees agreed</Chip>
          {entry.isMinor && (
            <span className="rounded-full px-3 py-1 text-[0.82rem] font-semibold" style={CHILD_STYLE}>
              For a child
            </span>
          )}
          <a
            href={`/api/clients/consent/${encodeURIComponent(entry.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${BUTTON} ml-1`}
            style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
          >
            View signed form (PDF)
          </a>
        </div>
      </header>

      {/* ------------------------------------------------------------ facts */}
      <div className="grid gap-8 px-6 py-6 md:grid-cols-3">
        <section>
          <Label>Contact</Label>
          <dl className="mt-3 grid gap-3 text-[0.95rem]">
            <Item label="Phone">
              <a
                href={`tel:${entry.phone.replace(/[^\d+]/g, "")}`}
                className="font-medium transition-colors hover:text-[var(--brand)]"
              >
                {entry.phone}
              </a>
              {" · "}
              <a
                href={`https://wa.me/${whatsappNumber(entry.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                WhatsApp
              </a>
            </Item>
            <Item label="Email">
              <a
                href={`mailto:${entry.email}`}
                className="break-all transition-colors hover:text-[var(--brand)]"
              >
                {entry.email}
              </a>
            </Item>
            <Item label="Prefers to be contacted by">{contactMethodLabel(entry.contactMethod)}</Item>
          </dl>
        </section>

        <section>
          <Label>Personal details</Label>
          <dl className="mt-3 grid gap-3 text-[0.95rem]">
            <Item label="ID number or date of birth">{entry.idOrDob}</Item>
            <Item label="Home address">
              <address className="not-italic">
                {entry.street}
                <br />
                {entry.suburb}
                <br />
                {`${entry.city}, ${entry.postalCode}`}
              </address>
            </Item>
            {entry.isMinor && (
              <Item label="Child">
                {entry.minorName}
                <span className="block text-[0.88rem]" style={{ color: "var(--text-soft)" }}>
                  {`Signed by their ${entry.minorRelationship.toLowerCase()} (${entry.minorBasis})`}
                </span>
              </Item>
            )}
          </dl>
        </section>

        <section>
          <Label>Request</Label>
          <dl className="mt-3 grid gap-3 text-[0.95rem]">
            <Item label="Help with">{serviceLabel(entry)}</Item>
            <Item label="Sessions">{modeLabel(entry.mode)}</Item>
            {entry.note && (
              <Item label="Note from the client">
                <span className="whitespace-pre-line">{entry.note}</span>
              </Item>
            )}
          </dl>
        </section>
      </div>

      {/* ------------------------------------------ permissions, signature */}
      <div className="grid gap-8 border-t px-6 py-6 md:grid-cols-3">
        <section className="md:col-span-2">
          <Label>Permissions</Label>
          <ul className="mt-3 grid gap-2.5 text-[0.95rem]">
            {PERMISSIONS.map((permission) => {
              const given = entry[permission.key];
              return (
                <li key={permission.key} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 w-[6.5rem] shrink-0 rounded-full px-2 py-0.5 text-center text-[0.8rem] font-semibold"
                    style={given === "yes" ? OK_STYLE : MUTED_STYLE}
                  >
                    {given ? PERMISSION_LABELS[given] : "Not answered"}
                  </span>
                  <span style={{ color: "var(--text-soft)" }}>{permission.text}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <Label>Signature</Label>
          {/* Loaded on its own, behind the same sign-in: see
              /api/clients/signature. Plain <img>, because next/image would
              try to optimise and cache a private image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/clients/signature/${encodeURIComponent(entry.id)}`}
            alt={`Signature of ${name}`}
            width={1200}
            height={360}
            className="mt-3 h-auto w-full max-w-[18rem] rounded border"
            style={{ background: "#ffffff" }}
          />
          <p className="mt-2 text-[0.85rem]" style={{ color: "var(--text-soft)" }}>
            {`Signed at ${entry.signedPlace}, ${DAY.format(signed)}.`}
          </p>
        </section>
      </div>
    </article>
  );
}
