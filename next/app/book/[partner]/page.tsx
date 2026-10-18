import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { availability, HORIZON_DAYS, nextPartnerReference, PRACTICE } from "@/lib/bookings";
import { getPartner } from "@/lib/partners";
import type { DiaryDay } from "@/lib/types";

import { SHELL, SiteFooter, SiteHeader, WhatsAppFloat } from "../../chrome";
import { BookingForm } from "../booking-form";

// The diary changes every time somebody books, so this page is never cached.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ partner: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const partner = getPartner((await params).partner);
  return {
    title: partner ? `Book a session | ${partner.name} and Mimshack Wellness` : "Book a session | Mimshack Wellness",
    // Only the partner's own clients should land here, through the link.
    robots: { index: false, follow: false },
  };
}

/**
 * A referring organisation's own booking page: /book/<slug>.
 *
 * The same layout as /book, in the partner's colours and with their logo.
 * The colours are swapped by overriding the site's colour variables on
 * <main>, so the form and cards are the site's own, just recoloured.
 */
export default async function PartnerBookPage({ params }: Params) {
  const partner = getPartner((await params).partner);
  if (!partner) notFound();

  let days: DiaryDay[] = [];
  let diaryUp = true;
  let partnerRef = "";
  try {
    days = await availability(HORIZON_DAYS);
    partnerRef = await nextPartnerReference(partner.slug);
  } catch {
    diaryUp = false;
  }

  const whatsapp = `https://wa.me/27641533469?text=${encodeURIComponent(
    `Hi Mimshack Wellness, I was referred by ${partner.name} and would like to book a session. `,
  )}`;

  const colours = {
    "--brand": partner.accent,
    "--brand-dark": partner.accent,
    "--btn-bg": partner.accent,
    "--btn-ink": partner.accentInk,
    "--tint": partner.tint,
    "--green-dark": partner.accent,
  } as React.CSSProperties;

  return (
    <>
      <SiteHeader />

      <main id="main" style={colours}>
        {/* ------------------------------------------------- heading band */}
        <section className="relative overflow-hidden text-white" style={{ background: partner.band }}>
          <div aria-hidden="true" style={{ height: 6, background: partner.stripe }} />
          <div className={`${SHELL} flex flex-wrap items-center gap-x-8 gap-y-5 py-12 sm:py-14`}>
            <span className="inline-block rounded-xl bg-white p-2">
              <Image
                src={partner.logo}
                alt={partner.name}
                width={partner.logoWidth}
                height={partner.logoHeight}
                priority
                className="h-20 w-20"
              />
            </span>
            <div>
              <h1 className="text-3xl text-white sm:text-[2.6rem]">Book a session</h1>
              <p className="mt-3 max-w-2xl text-lg" style={{ color: "rgb(255 255 255 / 0.85)" }}>
                For people referred by the {partner.name}.
              </p>
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className={`${SHELL} grid gap-14 lg:grid-cols-12`}>
            <div className="lg:col-span-8">
              {diaryUp ? (
                <BookingForm
                  practice={PRACTICE}
                  days={days}
                  signedIn={false}
                  knownEmail={null}
                  partner={partner}
                  partnerRef={partnerRef}
                />
              ) : (
                <div className="rounded-lg border p-8" style={{ background: "var(--surface)" }}>
                  <h2 className="text-xl">The online diary is not reachable</h2>
                  <p className="mt-3" style={{ color: "var(--text-soft)" }}>
                    Please send a WhatsApp or call and Phakama will book you in directly.
                  </p>
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-block rounded-full px-7 py-3.5 font-semibold"
                    style={{ background: "var(--wa-btn)", color: "var(--wa-ink)" }}
                  >
                    WhatsApp 064 153 3469
                  </a>
                </div>
              )}
            </div>

            {/* ------------------------------------------------------ aside */}
            <aside className="lg:col-span-4">
              <div className="rounded-lg border p-7" style={{ background: "var(--bg-soft)" }}>
                <h2 className="text-lg">Rather just message?</h2>
                <p className="mt-3 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
                  Skip the form entirely. This opens WhatsApp with a message already started.
                </p>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-block rounded-full px-6 py-3 text-[0.95rem] font-semibold"
                  style={{ background: "var(--wa-btn)", color: "var(--wa-ink)" }}
                >
                  Book on WhatsApp
                </a>

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
                    <dd>Monday to Friday, 08:00 – 17:00</dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <SiteFooter />
      <WhatsAppFloat
        message={`Hi Mimshack Wellness, I was referred by ${partner.name} and would like to book a session. `}
      />
    </>
  );
}
