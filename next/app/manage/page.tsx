import type { Metadata } from "next";
import Link from "next/link";

import { ApiError, apiGetAuthed, BOOKINGS } from "@/lib/api";
import { requireUser } from "@/lib/session";
import type { ManageBookings } from "@/lib/types";

import { PageHeader, SHELL, SiteFooter, SiteHeader } from "../chrome";
import { DiaryRow } from "./diary-row";

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
      </main>

      <SiteFooter />
    </>
  );
}
