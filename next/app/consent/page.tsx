import type { Metadata } from "next";

import {
  BANKING,
  CANCELLATION_TERMS,
  CONSENT_TEXT,
  DOC_INTRO,
  DOC_TITLE,
  FEES,
  PAYMENT_TERMS,
  PERMISSIONS,
  SERVICE_SECTIONS,
} from "@/lib/client-form";

import { SHELL, SiteFooter, SiteHeader } from "../chrome";
import { CloseOrBack } from "./close-or-back";

export const metadata: Metadata = {
  title: "Counselling and Therapy Consent Form | Mimshack Wellness",
  description: "The consent form clients read and agree to before their first session.",
  robots: { index: false, follow: false },
};

/**
 * The consent document, to read before signing at /form.
 *
 * The form links here instead of repeating all of it, so filling in the form
 * stays short. Every word comes from lib/client-form.ts, the same text the
 * signed PDF reproduces, so what a client reads here is what they sign.
 */
export default function ConsentPage() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="py-10 sm:py-14">
        <article className={SHELL}>
          <div className="max-w-3xl">
            <p
              className="text-xs font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--green-dark)" }}
            >
              Mimshack Wellness
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl">{DOC_TITLE}</h1>
            <p className="mt-4 text-lg" style={{ color: "var(--text-soft)" }}>
              {DOC_INTRO}
            </p>
            <p
              className="mt-6 rounded-lg border px-5 py-4 text-[0.95rem]"
              style={{ background: "var(--tint)", borderColor: "var(--tint)" }}
            >
              Read this through, then go back to the form to tick that you agree and sign.
            </p>

            <div className="mt-10 grid gap-9">
              {SERVICE_SECTIONS.map((section) => (
                <section key={section.title}>
                  <h2 className="rule text-xl">{section.title}</h2>
                  <div className="mt-3 grid gap-3 [overflow-wrap:anywhere]" style={{ color: "var(--text-soft)" }}>
                    {section.paragraphs.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>
                </section>
              ))}

              <section>
                <h2 className="rule text-xl">Fees and payment</h2>
                <dl className="mt-4 grid gap-2">
                  {FEES.map((fee) => (
                    <div key={fee.label} className="flex justify-between gap-4 border-b pb-2">
                      <dt>{fee.label}</dt>
                      <dd className="font-semibold tabular-nums">{fee.amount}</dd>
                    </div>
                  ))}
                </dl>
                <ul className="mt-4 grid list-disc gap-1.5 pl-5" style={{ color: "var(--text-soft)" }}>
                  {PAYMENT_TERMS.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                <dl className="mt-5 grid gap-x-8 gap-y-3 rounded-lg border p-5 sm:grid-cols-2" style={{ background: "var(--bg-soft)" }}>
                  {[
                    ["Bank", BANKING.bankName],
                    ["Account name", BANKING.accountHolder],
                    ["Account type", BANKING.accountType],
                    ["Account number", BANKING.accountNumber],
                    ["Branch code", BANKING.branchCode],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[0.82rem]" style={{ color: "var(--text-soft)" }}>
                        {label}
                      </dt>
                      <dd className="font-semibold tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section>
                <h2 className="rule text-xl">Cancellation and postponement</h2>
                <ul className="mt-3 grid list-disc gap-1.5 pl-5" style={{ color: "var(--text-soft)" }}>
                  {CANCELLATION_TERMS.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="rule text-xl">Additional permissions</h2>
                <p className="mt-3" style={{ color: "var(--text-soft)" }}>
                  The form asks you to answer Yes or No to each of these:
                </p>
                <ol className="mt-3 grid list-decimal gap-1.5 pl-5" style={{ color: "var(--text-soft)" }}>
                  {PERMISSIONS.map((p) => (
                    <li key={p.key}>{p.text}</li>
                  ))}
                </ol>
              </section>

              <section>
                <h2 className="rule text-xl">Consent</h2>
                <p className="mt-3" style={{ color: "var(--text-soft)" }}>
                  {CONSENT_TEXT}
                </p>
              </section>
            </div>

            <div className="mt-12 border-t pt-8">
              <CloseOrBack />
            </div>
          </div>
        </article>
      </main>

      <SiteFooter />
    </>
  );
}
