import type { Metadata } from "next";

import { bankingReady, FEES } from "@/lib/client-form";

import { PageHeader, SHELL, SiteFooter, SiteHeader, whatsappEnquiry } from "../chrome";
import { ClientForm } from "./client-form";

export const metadata: Metadata = {
  title: "Counselling consent form | Mimshack Wellness",
  description: "Send your details to Phakama Ndamase at Mimshak Wellness.",
  // Shared by link, not found by search.
  robots: { index: false, follow: false },
};

export default function FormPage() {
  const steps = [
    "Complete the five steps of the form and sign at the end.",
    "Phakama will contact you to confirm your first appointment.",
    bankingReady()
      ? "Pay for your first session by EFT before it takes place. The banking details are in the form."
      : "Your information is kept strictly confidential.",
  ];

  return (
    <>
      <SiteHeader />

      <main id="main">
        <PageHeader
          title="Counselling consent form"
          lead="Please complete this form before your first session. It takes about ten minutes."
        />

        {/* Form beside a sidebar, as on /book, so the form keeps a comfortable
            width without leaving the right of the page empty. The sidebar
            stacks under the form on phones. */}
        <section className="py-14 sm:py-20">
          <div className={`${SHELL} grid items-start gap-14 lg:grid-cols-12`}>
            <div className="relative lg:col-span-8">
              <ClientForm />
            </div>

            <aside className="lg:col-span-4">
              <div className="rounded-lg border p-7" style={{ background: "var(--bg-soft)" }}>
                <h2 className="text-lg">What happens next</h2>
                <ol className="mt-5 grid gap-4 text-[0.95rem]">
                  {steps.map((step, i) => (
                    <li key={step} className="flex gap-4">
                      <span
                        aria-hidden="true"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                        style={{ background: "var(--tint)", color: "var(--brand-dark)" }}
                      >
                        {i + 1}
                      </span>
                      <span style={{ color: "var(--text-soft)" }}>{step}</span>
                    </li>
                  ))}
                </ol>

                <hr className="my-7" />

                <h2 className="text-lg">Where and when</h2>
                <dl className="mt-4 grid gap-4 text-[0.95rem]">
                  <div>
                    <dt style={{ color: "var(--text-soft)" }}>In person</dt>
                    <dd>Letada Medical Centre, Windsor Park, Kraaifontein</dd>
                  </div>
                  <div>
                    <dt style={{ color: "var(--text-soft)" }}>Online</dt>
                    <dd>By video call, wherever you are</dd>
                  </div>
                  <div>
                    <dt style={{ color: "var(--text-soft)" }}>Hours</dt>
                    <dd>Monday to Friday, 08:00 &ndash; 17:00</dd>
                  </div>
                  {FEES.map((fee) => (
                    <div key={fee.label}>
                      <dt style={{ color: "var(--text-soft)" }}>{fee.label}</dt>
                      <dd>{fee.amount}</dd>
                    </div>
                  ))}
                </dl>

                <hr className="my-7" />

                <h2 className="text-lg">Rather just message?</h2>
                <p className="mt-3 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
                  This opens WhatsApp with a message already started.
                </p>
                <a
                  href={whatsappEnquiry("Hi Mimshak Wellness, I would like to arrange a session. ")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-block rounded-full px-6 py-3 text-[0.95rem] font-semibold"
                  style={{ background: "var(--wa-btn)", color: "var(--wa-ink)" }}
                >
                  WhatsApp 064 153 3469
                </a>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
