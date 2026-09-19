import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getUser, looksLikeOwner } from "@/lib/session";

import { PageHeader, SHELL, SiteFooter, SiteHeader, WhatsAppFloat } from "../chrome";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = {
  title: "Sign in | Mimshak Wellness",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; tab?: string }>;
}) {
  const { next, tab } = await searchParams;
  const user = await getUser();
  if (user) redirect(next ?? (looksLikeOwner(user) ? "/manage" : "/bookings"));

  // Only same-site paths, so ?next= cannot be used to bounce someone off site.
  // Null means "decide after sign-in", which is the only point at which we
  // know whether this is the practice or a client.
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  return (
    <>
      <SiteHeader />

      <main id="main">
        <PageHeader
          title="Your sessions"
          lead="Sign in to see when your next session is, or create an account to keep track of them."
        />

        <section className="py-14 sm:py-20">
          <div className={`${SHELL} grid gap-14 lg:grid-cols-12`}>
            <div className="lg:col-span-5">
              <AuthForm next={destination} initialTab={tab === "register" ? "register" : "signin"} />
            </div>

            <div className="lg:col-span-6 lg:col-start-7">
              <h2 className="text-2xl">You do not need an account to book</h2>
              <p className="mt-4 text-lg" style={{ color: "var(--text-soft)" }}>
                Booking is open to anyone — an account only exists so you can look up when your
                session is without having to ask.
              </p>
              <p className="mt-4" style={{ color: "var(--text-soft)" }}>
                If you have booked before, register with the same email address and those sessions
                will already be there.
              </p>
              <a
                href="/book"
                className="mt-7 inline-block rounded-full px-7 py-3.5 font-semibold"
                style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
              >
                Book a session
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <WhatsAppFloat />
    </>
  );
}
