import Image from "next/image";
import Link from "next/link";

import { hasPracticeCookie } from "@/lib/clients-auth";
import { getUser, looksLikeOwner } from "@/lib/session";

import { MobileMenu } from "./mobile-menu";

/* One shell for every section and every page, so the whole site lines up on
   the same gutters however wide the screen gets. */
export const SHELL = "mx-auto w-full max-w-[84rem] px-6 lg:px-12";

/* Absolute paths, not bare #anchors: these have to work from /book and
   /bookings too, where there is no #services on the page to jump to. */
export const NAV = [
  { href: "/#services", label: "Services" },
  { href: "/#why", label: "Why me" },
  { href: "/#about", label: "About" },
  { href: "/#contact", label: "Contact" },
];

export const FOOTER_SERVICES = [
  "Counselling",
  "Family support",
  "Crisis support",
  "Employee wellness",
];

/** The number is duplicated from the seeded practice on purpose — the home
    page must render without the API being up. */
export const WHATSAPP_NUMBER = "27641533469";

export function whatsappEnquiry(message = "Hi Mimshak Wellness, I would like to book a session. ") {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export async function SiteHeader() {
  const user = await getUser();
  // Signed in with the practice username counts as the practice too: see
  // lib/clients-auth.ts. Either way the menu shows the one Admin page.
  const owner = looksLikeOwner(user) || (await hasPracticeCookie());
  const signedIn = Boolean(user) || owner;

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur"
      style={{ background: "color-mix(in srgb, var(--bg) 92%, transparent)" }}
    >
      <div className={`${SHELL} flex items-center justify-between gap-6 py-2.5`}>
        <Link href="/" aria-label="Mimshak Wellness, home" className="shrink-0">
          <Image
            src="/images/logo.png"
            alt="Mimshak Wellness"
            width={428}
            height={155}
            priority
            className="h-14 w-auto sm:h-16"
          />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded px-4 py-2 text-base font-medium transition-colors hover:text-[var(--brand)]"
              style={{ color: "var(--text)" }}
            >
              {item.label}
            </a>
          ))}

          {signedIn ? (
            <>
              <Link
                href={owner ? "/manage" : "/bookings"}
                className="rounded px-4 py-2 text-base font-medium transition-colors hover:text-[var(--brand)]"
                style={{ color: "var(--text)" }}
              >
                {owner ? "Admin" : "My bookings"}
              </Link>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded px-4 py-2 text-base font-medium transition-colors hover:text-[var(--brand)]"
                  style={{ color: "var(--text-soft)" }}
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded px-4 py-2 text-base font-medium transition-colors hover:text-[var(--brand)]"
              style={{ color: "var(--text-soft)" }}
            >
              Sign in
            </Link>
          )}

          <Link
            href="/book"
            className="ml-4 rounded-full px-5 py-2.5 text-[0.95rem] font-semibold"
            style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
          >
            Book a session
          </Link>
        </nav>

        {/* Below lg: Book stays in view, and the menu holds everything else,
            sign-in and Admin included, so the site works fully on a phone. */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href="/book"
            className="rounded-full px-5 py-2.5 text-[0.95rem] font-semibold"
            style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
          >
            Book
          </Link>
          <MobileMenu links={NAV} signedIn={signedIn} owner={owner} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t pb-10 pt-16">
      <div
        className={`${SHELL} grid gap-x-16 gap-y-12 md:grid-cols-2 lg:grid-cols-[1.8fr_1fr_1fr_1.3fr]`}
      >
        <div>
          <Image
            src="/images/logo.png"
            alt="Mimshak Wellness"
            width={428}
            height={155}
            className="h-12 w-auto"
          />
          <p className="mt-6 max-w-xs text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
            A private social work practice in Kraaifontein, Cape Town. In person or online,
            wherever you are.
          </p>
        </div>

        <nav aria-label="Sections">
          <h2
            className="text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--text-soft)" }}
          >
            Explore
          </h2>
          <ul className="mt-5 space-y-3 text-[0.95rem]">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="transition-colors hover:text-[var(--brand)]">
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <Link href="/book" className="transition-colors hover:text-[var(--brand)]">
                Book a session
              </Link>
            </li>
            <li>
              <Link href="/bookings" className="transition-colors hover:text-[var(--brand)]">
                My bookings
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--text-soft)" }}
          >
            Services
          </h2>
          <ul className="mt-5 space-y-3 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
            {FOOTER_SERVICES.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>

        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--text-soft)" }}
          >
            Contact
          </h2>
          <ul className="mt-5 space-y-3 text-[0.95rem]">
            <li>
              <a href="tel:+27641533469" className="transition-colors hover:text-[var(--brand)]">
                064 153 3469
              </a>
            </li>
            <li>
              <a
                href={whatsappEnquiry()}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-[var(--brand)]"
              >
                WhatsApp
              </a>
            </li>
            <li>
              <a
                href="mailto:phakamandamase@gmail.com"
                className="break-all transition-colors hover:text-[var(--brand)]"
              >
                phakamandamase@gmail.com
              </a>
            </li>
            <li style={{ color: "var(--text-soft)" }}>
              Letada Medical Centre
              <br />
              Windsor Park, Kraaifontein
              <br />
              Cape Town, 7530
            </li>
          </ul>
        </div>
      </div>

      <div className={`${SHELL} mt-14 border-t pt-7`}>
        <div
          className="flex flex-col gap-2 text-[0.95rem] sm:flex-row sm:items-center sm:justify-between"
          style={{ color: "var(--text-soft)" }}
        >
          <p>&copy; {new Date().getFullYear()} Mimshak Wellness. Kraaifontein, Cape Town.</p>
          <p>Phakama Ndamase &middot; Registered social worker</p>
        </div>
      </div>
    </footer>
  );
}

/**
 * Floating WhatsApp button, carried over from the original site.
 *
 * The message is pre-filled so the practice receives something it can act on
 * rather than "hi" followed by four rounds of establishing who is asking.
 */
export function WhatsAppFloat({ message }: { message?: string }) {
  return (
    <a
      href={whatsappEnquiry(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Book on WhatsApp"
      className="whatsapp-float"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
      </svg>
    </a>
  );
}

/** Heading band for the pages that are not the home page. */
export function PageHeader({ title, lead }: { title: string; lead?: string }) {
  return (
    <section className="band-navy py-14 sm:py-16">
      <div className={SHELL}>
        <h1 className="text-3xl sm:text-[2.6rem]">{title}</h1>
        {lead && <p className="band-soft mt-4 max-w-2xl text-lg">{lead}</p>}
      </div>
    </section>
  );
}
