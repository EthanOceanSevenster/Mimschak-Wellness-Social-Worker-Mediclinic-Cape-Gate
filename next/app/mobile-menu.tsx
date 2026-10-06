"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

const ITEM =
  "block rounded-lg px-4 py-3.5 text-[1.05rem] font-medium transition-colors hover:bg-[var(--bg-soft)]";

/**
 * The menu on phones and tablets, where the full header row does not fit.
 *
 * Everything the desktop header has is here too, including Sign in, or Admin
 * and Sign out once signed in, so the practice can manage the site from a
 * phone. It closes on any link, on Escape, and on the button again.
 */
export function MobileMenu({
  links,
  signedIn,
  owner,
}: {
  links: { href: string; label: string }[];
  signedIn: boolean;
  owner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-11 w-11 items-center justify-center rounded-full border transition-colors hover:border-[var(--brand)]"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute inset-x-0 top-full border-b shadow-lg"
          style={{ background: "var(--bg)" }}
        >
          <nav aria-label="Menu" className="mx-auto grid w-full max-w-[84rem] gap-1 px-4 py-4">
            {links.map((item) => (
              <a key={item.href} href={item.href} onClick={close} className={ITEM}>
                {item.label}
              </a>
            ))}

            <div className="my-2 border-t" />

            {signedIn ? (
              <>
                <Link href={owner ? "/manage" : "/bookings"} onClick={close} className={`${ITEM} font-semibold`}>
                  {owner ? "Admin" : "My bookings"}
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button type="submit" className={`${ITEM} w-full text-left`} style={{ color: "var(--text-soft)" }}>
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link href="/login" onClick={close} className={ITEM}>
                Sign in
              </Link>
            )}

            <Link
              href="/book"
              onClick={close}
              className="mt-2 block rounded-full px-5 py-3.5 text-center text-[1rem] font-semibold"
              style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
            >
              Book a session
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
