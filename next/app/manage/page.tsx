import type { Metadata } from "next";
import Link from "next/link";

import { ApiError, apiGetAuthed, BOOKINGS } from "@/lib/api";
import { searchEntries, StorageNotConfigured, type EntryPage } from "@/lib/client-entries";
import { fullName, modeLabel, serviceLabel } from "@/lib/client-form";
import { requireUser } from "@/lib/session";
import type { ManageBookings } from "@/lib/types";

import { PageHeader, SHELL, SiteFooter, SiteHeader } from "../chrome";
import { DAY } from "../clients/shared";
import { DiaryRow } from "./diary-row";

/** How many recent client entries show on the diary itself before "View all". */
const RECENT_CLIENTS = 6;

export const metadata: Metadata = {
  title: "Diary | Mimshak Wellness",
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

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  await requireUser("/manage");

  let data: ManageBookings | null = null;
  let forbidden = false;
  try {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    data = await apiGetAuthed<ManageBookings>(`${BOOKINGS}/manage/${query}`);
  } catch (error) {
    // 403 is the normal case for a patient who typed /manage, not a fault.
    forbidden = error instanceof ApiError && error.status === 403;
  }

  if (forbidden || !data) {
    return (
      <>
        <SiteHeader />
        <main id="main">
          <PageHeader
            title="Not your diary"
            lead="This page is for the practice. Your own sessions are on your bookings page."
          />
          <section className="py-20">
            <div className={SHELL}>
              <Link
                href="/bookings"
                className="inline-block rounded-full px-7 py-3.5 font-semibold"
                style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
              >
                Go to my bookings
              </Link>
            </div>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  const upcoming = data.bookings.filter(
    (b) => new Date(b.starts_at) >= new Date() && (b.status === "requested" || b.status === "confirmed"),
  );
  const rest = data.bookings.filter((b) => !upcoming.includes(b));

  // Shown on the same page as the diary, so one sign-in covers both: see
  // lib/clients-auth.ts, hasAdminAccess. This never touches the booking
  // backend, so it still loads even while that backend is the reason the
  // page above fell back to "Not your diary" for anyone who is not signed in.
  let clients: EntryPage | null = null;
  let clientsProblem: string | null = null;
  try {
    clients = await searchEntries({ page: 1 });
  } catch (error) {
    clientsProblem =
      error instanceof StorageNotConfigured
        ? "No database is connected yet for client form entries."
        : "Client form entries could not be loaded just now.";
  }

  return (
    <>
      <SiteHeader />

      <main id="main">
        <PageHeader
          title="Diary"
          lead={`Every booking made against ${data.practice}.`}
        />

        <section className="border-b py-8" style={{ background: "var(--bg-soft)" }}>
          <div className={`${SHELL} grid gap-x-16 gap-y-6 sm:grid-cols-4`}>
            {[
              { label: "Awaiting you", value: data.counts.requested },
              { label: "Upcoming", value: data.counts.upcoming },
              { label: "Next 7 days", value: data.counts.this_week },
              { label: "All time", value: data.counts.total },
            ].map((stat) => (
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

        <section className="py-12 sm:py-16">
          <div className={SHELL}>
            <nav aria-label="Filter" className="flex flex-wrap gap-2.5">
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

            {data.bookings.length === 0 ? (
              <p className="mt-12" style={{ color: "var(--text-soft)" }}>
                Nothing here yet.
              </p>
            ) : (
              <div className="mt-12 grid gap-14">
                {upcoming.length > 0 && (
                  <div>
                    <h2 className="rule text-2xl">Coming up</h2>
                    <div className="mt-8 grid gap-4">
                      {/* Soonest first here — the owner works forwards through
                          the day, unlike the API default of newest first. */}
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
                    <h2 className="rule text-2xl">Everything else</h2>
                    <div className="mt-8 grid gap-4">
                      {rest.map((b) => (
                        <DiaryRow key={b.reference} booking={b} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ----------------------------------------- client form entries */}
        <section className="border-t py-12 sm:py-16" style={{ background: "var(--bg-soft)" }}>
          <div className={SHELL}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="rule text-2xl">Client form entries</h2>
                <p className="mt-2" style={{ color: "var(--text-soft)" }}>
                  {clientsProblem
                    ? clientsProblem
                    : clients && clients.total > 0
                      ? `${clients.total} ${clients.total === 1 ? "client has" : "clients have"} signed the consent form.`
                      : "Nobody has filled in the form yet."}
                </p>
              </div>
              <Link
                href="/clients"
                className="rounded-full border px-5 py-2.5 text-[0.95rem] font-semibold transition-colors hover:border-[var(--brand)]"
              >
                View all client entries
              </Link>
            </div>

            {clients && clients.rows.length > 0 && (
              <div className="mt-8 grid gap-3">
                {clients.rows.slice(0, RECENT_CLIENTS).map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/clients/${encodeURIComponent(entry.id)}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-5 py-4 transition-colors hover:border-[var(--brand)]"
                    style={{ background: "var(--surface)" }}
                  >
                    <span>
                      <span className="font-semibold">{fullName(entry)}</span>
                      <span className="ml-3 text-[0.9rem]" style={{ color: "var(--text-soft)" }}>
                        {serviceLabel(entry)} &middot; {modeLabel(entry.mode)}
                      </span>
                    </span>
                    <span className="text-[0.9rem]" style={{ color: "var(--text-soft)" }}>
                      {DAY.format(new Date(entry.createdAt))}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
