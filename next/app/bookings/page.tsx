import type { Metadata } from "next";
import Link from "next/link";

import { apiGetAuthed, BOOKINGS } from "@/lib/api";
import { requireUser } from "@/lib/session";
import type { MyBookings } from "@/lib/types";

import { PageHeader, SHELL, SiteFooter, SiteHeader, WhatsAppFloat, whatsappEnquiry } from "../chrome";
import { BookingRow, NextSession } from "./booking-card";

export const metadata: Metadata = {
  title: "My bookings | Mimshack Wellness",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MyBookingsPage() {
  const user = await requireUser("/bookings");

  let data: MyBookings = { upcoming: [], past: [] };
  let unreachable = false;
  try {
    data = await apiGetAuthed<MyBookings>(`${BOOKINGS}/mine/`);
  } catch {
    unreachable = true;
  }

  // The API returns newest first; forwards is the order you live your week in.
  const upcoming = [...data.upcoming].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const [next, ...later] = upcoming;

  return (
    <>
      <SiteHeader />

      <main id="main">
        <PageHeader
          title={next ? "Your sessions" : "My bookings"}
          lead={
            next
              ? undefined
              : "Sessions booked with your email address appear here, including any made before you created an account."
          }
        />

        <section className="py-12 sm:py-16">
          <div className={SHELL}>
            {unreachable ? (
              <div className="rounded-lg border p-8" style={{ background: "var(--surface)" }}>
                <h2 className="text-xl">Your bookings cannot be loaded</h2>
                <p className="mt-3" style={{ color: "var(--text-soft)" }}>
                  Something is wrong at our end. Your session is still booked — send a WhatsApp if
                  you need to check it.
                </p>
                <a
                  href={whatsappEnquiry("Hi Mimshack Wellness, I would like to check my booking. ")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-block rounded-full px-7 py-3.5 font-semibold"
                  style={{ background: "var(--wa-btn)", color: "var(--wa-ink)" }}
                >
                  Message 064 153 3469
                </a>
              </div>
            ) : (
              <div className="grid items-start gap-12 lg:grid-cols-12">
                {/* ------------------------------------------------- main */}
                <div className="grid gap-12 lg:col-span-8">
                  {next ? (
                    <NextSession booking={next} />
                  ) : (
                    <div className="rounded-lg border p-10" style={{ background: "var(--surface)" }}>
                      <h2 className="text-2xl">Nothing booked at the moment</h2>
                      <p className="mt-4 max-w-md text-lg" style={{ color: "var(--text-soft)" }}>
                        When you book a session it will show up here with the date, the time and
                        where to go.
                      </p>
                      <div className="mt-8 flex flex-wrap gap-4">
                        <Link
                          href="/book"
                          className="rounded-full px-7 py-3.5 font-semibold"
                          style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
                        >
                          Book a session
                        </Link>
                        <a
                          href={whatsappEnquiry()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full px-7 py-3.5 font-semibold"
                          style={{ background: "var(--wa-btn)", color: "var(--wa-ink)" }}
                        >
                          Book on WhatsApp
                        </a>
                      </div>
                    </div>
                  )}

                  {later.length > 0 && (
                    <div>
                      <h2 className="rule text-2xl">Also coming up</h2>
                      <div className="mt-7 grid gap-4">
                        {later.map((b) => (
                          <BookingRow key={b.reference} booking={b} />
                        ))}
                      </div>
                    </div>
                  )}

                  {data.past.length > 0 && (
                    <div>
                      <h2 className="rule text-2xl">Earlier sessions</h2>
                      <div className="mt-7 grid gap-4">
                        {data.past.map((b) => (
                          <BookingRow key={b.reference} booking={b} muted />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ------------------------------------------------ aside */}
                <aside className="lg:col-span-4">
                  <div className="grid gap-5">
                    {next && (
                      <Link
                        href="/book"
                        className="rounded-full px-7 py-3.5 text-center font-semibold"
                        style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
                      >
                        Book another session
                      </Link>
                    )}

                    <div className="rounded-lg border p-7" style={{ background: "var(--bg-soft)" }}>
                      <h2 className="text-lg">Need to change something?</h2>
                      <p className="mt-3 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
                        Cancel any upcoming session here, or send a message and Phakama will move it
                        for you.
                      </p>
                      <a
                        href={whatsappEnquiry(
                          "Hi Mimshack Wellness, I need to change my booking. ",
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 inline-block rounded-full px-6 py-3 text-[0.95rem] font-semibold"
                        style={{ background: "var(--wa-btn)", color: "var(--wa-ink)" }}
                      >
                        Message Phakama
                      </a>

                      <hr className="my-7" />

                      <h2 className="text-lg">The practice</h2>
                      <dl className="mt-4 grid gap-4 text-[0.95rem]">
                        <div>
                          <dt style={{ color: "var(--text-soft)" }}>Phone</dt>
                          <dd>
                            <a href="tel:+27641533469" className="hover:underline">
                              064 153 3469
                            </a>
                          </dd>
                        </div>
                        <div>
                          <dt style={{ color: "var(--text-soft)" }}>Hours</dt>
                          <dd>Monday to Friday, 08:00 &ndash; 17:00</dd>
                        </div>
                        <div>
                          <dt style={{ color: "var(--text-soft)" }}>In person</dt>
                          <dd>Letada Medical Centre, Windsor Park, Kraaifontein</dd>
                        </div>
                      </dl>

                      <hr className="my-7" />

                      <p className="text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
                        Signed in as {user.email}. Sessions booked with this address appear here,
                        including any made before you created an account.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
      <WhatsAppFloat />
    </>
  );
}
