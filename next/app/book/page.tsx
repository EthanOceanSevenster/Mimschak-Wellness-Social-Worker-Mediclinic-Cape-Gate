import type { Metadata } from "next";

import { apiGet, BOOKINGS } from "@/lib/api";
import { getUser } from "@/lib/session";
import type { DiaryDay, Practice } from "@/lib/types";

import { PageHeader, SHELL, SiteFooter, SiteHeader, WhatsAppFloat } from "../chrome";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = {
  title: "Book a session | Mimshack Wellness",
  description:
    "Book a counselling, family support or crisis support session with Phakama Ndamase in Kraaifontein, in person or online.",
};

// The diary changes every time somebody books, so this page is never cached.
export const dynamic = "force-dynamic";

export default async function BookPage() {
  const user = await getUser();

  let practice: Practice | null = null;
  let days: DiaryDay[] = [];
  try {
    practice = await apiGet<Practice>(`${BOOKINGS}/`);
    const availability = await apiGet<{ days: DiaryDay[] }>(`${BOOKINGS}/availability/?days=14`);
    days = availability.days;
  } catch {
    practice = null;
  }

  return (
    <>
      <SiteHeader />

      <main id="main">
        <PageHeader
          title="Book a session"
          lead="Choose a time that suits you. Nothing is charged online — you send the request through on WhatsApp and Phakama confirms."
        />

        <section className="py-14 sm:py-20">
          <div className={`${SHELL} grid gap-14 lg:grid-cols-12`}>
            <div className="lg:col-span-8">
              {practice ? (
                <BookingForm
                  practice={practice}
                  days={days}
                  signedIn={Boolean(user)}
                  knownEmail={user?.email ?? null}
                />
              ) : (
                /* The booking system being down must never be a dead end —
                   WhatsApp works whether or not this API answers. */
                <div className="rounded-lg border p-8" style={{ background: "var(--surface)" }}>
                  <h2 className="text-xl">The online diary is not reachable</h2>
                  <p className="mt-3" style={{ color: "var(--text-soft)" }}>
                    Please send a WhatsApp or call and Phakama will book you in directly.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4">
                    <a
                      href="https://wa.me/27641533469?text=Hi%20Mimshack%20Wellness%2C%20I%20would%20like%20to%20book%20a%20session.%20"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full px-7 py-3.5 font-semibold"
                      style={{ background: "var(--wa-btn)", color: "var(--wa-ink)" }}
                    >
                      WhatsApp 064 153 3469
                    </a>
                    <a
                      href="tel:+27641533469"
                      className="rounded-full border px-7 py-3.5 font-semibold"
                      style={{ borderColor: "var(--line)" }}
                    >
                      Call instead
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* ------------------------------------------------------ aside */}
            <aside className="lg:col-span-4">
              <div
                className="rounded-lg border p-7"
                style={{ background: "var(--bg-soft)" }}
              >
                <h2 className="text-lg">Rather just message?</h2>
                <p className="mt-3 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
                  Skip the form entirely. This opens WhatsApp with a message already started.
                </p>
                <a
                  href={practice?.whatsapp_url ?? "https://wa.me/27641533469"}
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
                  <div>
                    <dt style={{ color: "var(--text-soft)" }}>Fees</dt>
                    <dd>R250 – R1 250 depending on the service</dd>
                  </div>
                </dl>

                <hr className="my-7" />

                <p className="text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
                  {user ? (
                    <>
                      Signed in as {user.email}.{" "}
                      <a href="/bookings" className="underline">
                        See your bookings
                      </a>
                      .
                    </>
                  ) : (
                    <>
                      Already booked before?{" "}
                      <a href="/login" className="underline">
                        Sign in
                      </a>{" "}
                      to see your sessions.
                    </>
                  )}
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <SiteFooter />
      <WhatsAppFloat />
    </>
  );
}
