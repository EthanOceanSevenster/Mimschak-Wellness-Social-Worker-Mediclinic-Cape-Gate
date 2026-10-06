import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { apiGetAuthed, BOOKINGS } from "@/lib/api";
import { searchEntries, StorageNotConfigured, type EntryPage } from "@/lib/client-entries";
import { fullName, modeLabel, serviceLabel } from "@/lib/client-form";
import { hasAdminAccess } from "@/lib/clients-auth";
import { getUser } from "@/lib/session";
import type { ManageBookings } from "@/lib/types";

import { PageHeader, SHELL, SiteFooter, SiteHeader } from "../chrome";
import { CHILD_STYLE, OK_STYLE } from "../clients/entry-card";
import { COUNT, DAY, formLink } from "../clients/shared";
import { mailConfigured } from "@/lib/mailer";
import { SendFormPanel } from "../send-form-panel";
import { DiaryRow } from "./diary-row";

export const metadata: Metadata = {
  title: "Admin | Mimshack Wellness",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "", label: "All" },
  { value: "requested", label: "Awaiting you" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

/** How many recent client entries show here before "View all". */
const RECENT_CLIENTS = 8;

/**
 * The practice's one admin page: sessions and the client form entries
 * together, after one sign-in at /login.
 *
 * Opens with either sign-in (see lib/clients-auth.ts). The sessions come from
 * the separate booking backend, so they show only when that backend answers;
 * the client entries come from this site's own database and always show.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  if (!(await hasAdminAccess())) {
    // A client signed in to their own account is sent to their bookings;
    // anyone else to the sign-in.
    if (await getUser()) redirect("/bookings");
    redirect("/login?next=/manage");
  }

  // ---------------------------------------------------- sessions (bookings)
  let diary: ManageBookings | null = null;
  try {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    diary = await apiGetAuthed<ManageBookings>(`${BOOKINGS}/manage/${query}`);
  } catch {
    // Offline backend, or signed in with the practice username rather than a
    // booking account: the sessions section says so, the page carries on.
    diary = null;
  }

  const upcoming = diary
    ? diary.bookings.filter(
        (b) => new Date(b.starts_at) >= new Date() && (b.status === "requested" || b.status === "confirmed"),
      )
    : [];
  const rest = diary ? diary.bookings.filter((b) => !upcoming.includes(b)) : [];

  // --------------------------------------------------------------- clients
  let clients: EntryPage | null = null;
  let clientsProblem: string | null = null;
  try {
    clients = await searchEntries({ page: 1 });
  } catch (error) {
    clientsProblem =
      error instanceof StorageNotConfigured
        ? "No database is connected yet for client form entries."
        : "Client form entries could not be loaded just now. Refresh to try again.";
  }

  const stats = [
    { label: "Sessions awaiting you", value: diary ? COUNT.format(diary.counts.requested) : "–" },
    { label: "Upcoming sessions", value: diary ? COUNT.format(diary.counts.upcoming) : "–" },
    { label: "Sessions next 7 days", value: diary ? COUNT.format(diary.counts.this_week) : "–" },
    { label: "Signed consent forms", value: clients ? COUNT.format(clients.total) : "–" },
  ];

  return (
    <>
      <SiteHeader />

      <main id="main">
        <PageHeader title="Admin" lead="Your sessions and the clients who have signed the consent form." />

        {/* ------------------------------------------------------- at a glance */}
        <section className="border-b py-8" style={{ background: "var(--bg-soft)" }}>
          <div className={`${SHELL} grid gap-x-16 gap-y-6 sm:grid-cols-4`}>
            {stats.map((stat) => (
              <div key={stat.label}>
                <p
                  className="text-xs font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--text-soft)" }}
                >
                  {stat.label}
                </p>
                <p className="mt-1 text-3xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------- send the form */}
        <section className="pt-10">
          <div className={SHELL}>
            <SendFormPanel formUrl={await formLink()} emailReady={mailConfigured()} />
          </div>
        </section>

        {/* ---------------------------------------------------------- clients */}
        <section className="py-12 sm:py-14">
          <div className={SHELL}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="rule text-2xl">Clients</h2>
                <p className="mt-2" style={{ color: "var(--text-soft)" }}>
                  {clientsProblem
                    ? clientsProblem
                    : clients && clients.total > 0
                      ? "The newest signed consent forms. Open one for the full details and signed PDF."
                      : "Nobody has signed the consent form yet."}
                </p>
              </div>
              <Link
                href="/clients"
                className="rounded-full px-5 py-2.5 text-[0.95rem] font-semibold"
                style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
              >
                Search all clients
              </Link>
            </div>

            {clients && clients.rows.length > 0 && (
              <div className="mt-8 grid gap-3">
                {clients.rows.slice(0, RECENT_CLIENTS).map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/clients/${encodeURIComponent(entry.id)}?back=${encodeURIComponent("/manage")}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-5 py-4 transition-colors hover:border-[var(--brand)]"
                    style={{ background: "var(--surface)" }}
                  >
                    <span className="min-w-0">
                      <span className="font-semibold">{fullName(entry)}</span>
                      {entry.isMinor && (
                        <span
                          className="ml-2 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold"
                          style={CHILD_STYLE}
                        >
                          Child
                        </span>
                      )}
                      <span className="block text-[0.9rem] sm:ml-3 sm:inline" style={{ color: "var(--text-soft)" }}>
                        {serviceLabel(entry)} &middot; {modeLabel(entry.mode)} &middot; {entry.phone}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 text-[0.9rem]" style={{ color: "var(--text-soft)" }}>
                      {entry.agreeConsent && entry.agreePayment && (
                        <span className="rounded-full px-2.5 py-0.5 text-[0.8rem] font-semibold" style={OK_STYLE}>
                          {"✓"} Signed
                        </span>
                      )}
                      {DAY.format(new Date(entry.createdAt))}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* --------------------------------------------------------- sessions */}
        <section className="border-t py-12 sm:py-14">
          <div className={SHELL}>
            <h2 className="rule text-2xl">Sessions</h2>

            {!diary ? (
              <p className="mt-4 max-w-2xl" style={{ color: "var(--text-soft)" }}>
                Online bookings will show here once the booking system is connected. Until then,
                sessions booked by WhatsApp or phone are not listed on this page.
              </p>
            ) : (
              <>
                <nav aria-label="Filter sessions" className="mt-6 flex flex-wrap gap-2.5">
                  {FILTERS.map((f) => {
                    const on = (status ?? "") === f.value;
                    return (
                      <Link
                        key={f.label}
                        href={f.value ? `/manage?status=${f.value}` : "/manage"}
                        className="rounded-full border px-5 py-2.5 text-[0.95rem] font-semibold"
                        style={
                          on
                            ? { borderColor: "var(--brand)", background: "var(--tint)" }
                            : { borderColor: "var(--line)", color: "var(--text-soft)" }
                        }
                      >
                        {f.label}
                      </Link>
                    );
                  })}
                </nav>

                {diary.bookings.length === 0 ? (
                  <p className="mt-10" style={{ color: "var(--text-soft)" }}>
                    No sessions here yet.
                  </p>
                ) : (
                  <div className="mt-10 grid gap-12">
                    {upcoming.length > 0 && (
                      <div>
                        <h3 className="text-xl">Coming up</h3>
                        <div className="mt-6 grid gap-4">
                          {/* Soonest first here: the practice works forwards
                              through the day, unlike the API's newest first. */}
                          {[...upcoming]
                            .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                            .map((b) => (
                              <DiaryRow key={b.reference} booking={b} />
                            ))}
                        </div>
                      </div>
                    )}

                    {rest.length > 0 && (
                      <div>
                        <h3 className="text-xl">Everything else</h3>
                        <div className="mt-6 grid gap-4">
                          {rest.map((b) => (
                            <DiaryRow key={b.reference} booking={b} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
