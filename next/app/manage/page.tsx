import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { HORIZON_DAYS, isStatus, listBookings, monthRange, partnerCounts, PRACTICE, saDate } from "@/lib/bookings";
import { searchEntries, StorageNotConfigured, type EntryPage } from "@/lib/client-entries";
import { fullName, modeLabel, serviceLabel } from "@/lib/client-form";
import { hasAdminAccess, practiceUser } from "@/lib/clients-auth";
import { getPartner, partnerLink, PARTNERS } from "@/lib/partners";
import { getUser } from "@/lib/session";
import type { Booking, ManageBookings } from "@/lib/types";

import { CHILD_STYLE, OK_STYLE } from "../clients/entry-card";
import { COUNT, DAY } from "../clients/shared";
import { CopyButton } from "../copy-button";
import { MonthCalendar, shift } from "./calendar";
import { AddSession } from "./add-session";
import { SessionList } from "./session-list";

export const metadata: Metadata = {
  title: "Admin | Mimshack Wellness",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const VIEWS = ["overview", "sessions", "clients", "partners"] as const;
type View = (typeof VIEWS)[number];

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "requested", label: "Awaiting you" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

type Params = {
  view?: string;
  source?: string;
  status?: string;
  month?: string;
  layout?: string;
};

/**
 * The practice's admin area, laid out like an Office 365 app: a slim top
 * bar, a menu on the left, and one view at a time on the right.
 *
 * Views: overview, sessions (everyone, each partner, or direct; as a list
 * or a month calendar), clients, send the consent form, partner links. Each
 * is a query parameter, so every view has its own address and the back
 * button works.
 */
export default async function AdminPage({ searchParams }: { searchParams: Promise<Params> }) {
  if (!(await hasAdminAccess())) {
    // A client signed in to their own account is sent to their bookings;
    // anyone else to the sign-in.
    if (await getUser()) redirect("/bookings");
    redirect("/login?next=/manage");
  }

  const params = await searchParams;
  const view: View = (VIEWS as readonly string[]).includes(params.view ?? "") ? (params.view as View) : "overview";
  const source = params.source === "direct" ? "direct" : (getPartner(params.source)?.slug ?? "");
  const status = isStatus(params.status) ? params.status : undefined;
  const layout = params.layout === "list" ? "list" : "calendar";
  const range = monthRange(params.month);
  const who = (await practiceUser()) ?? "Admin";

  /** An Admin address with the current choices, changed as given. */
  const href = (change: Partial<Params>) => {
    const next: Params = { view, source, status: status ?? "", month: range.month, layout, ...change };
    // Only sessions use the filters; other views get a clean address.
    const keep = next.view === "sessions" ? next : { view: next.view };
    const query = Object.entries(keep)
      .filter(([k, v]) => v && !(k === "view" && v === "overview") && !(k === "layout" && v === "calendar"))
      .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
      .join("&");
    return query ? `/manage?${query}` : "/manage";
  };

  // ------------------------------------------------------------- data
  const now = new Date();
  const ahead = new Date(now.getTime() + HORIZON_DAYS * 86_400_000);

  let upcoming: ManageBookings | null = null;
  let diary: ManageBookings | null = null;
  let diaryProblem: string | null = null;
  try {
    upcoming = await listBookings({ from: now, to: ahead });
    if (view === "sessions") {
      diary = await listBookings({ from: range.from, to: range.to, status, source });
    }
  } catch (error) {
    diaryProblem =
      error instanceof StorageNotConfigured
        ? "No database is connected yet for bookings."
        : "Sessions could not be loaded just now. Refresh to try again.";
  }

  let referrals: Record<string, { upcoming: number; total: number }> = {};
  try {
    referrals = await partnerCounts();
  } catch {
    referrals = {};
  }

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

  const counts = upcoming?.counts;
  const partnerUpcoming = PARTNERS.reduce((n, p) => n + (referrals[p.slug]?.upcoming ?? 0), 0);
  const sources = [
    { value: "", label: "All sessions", count: counts?.upcoming },
    ...PARTNERS.map((p) => ({ value: p.slug, label: p.short, title: p.name, count: referrals[p.slug]?.upcoming ?? 0 })),
    { value: "direct", label: "Direct", title: "Booked straight on the website", count: counts ? counts.upcoming - partnerUpcoming : undefined },
  ];

  const soonest = (list: Booking[]) => [...list].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const live = upcoming ? soonest(upcoming.bookings.filter((b) => b.status === "requested" || b.status === "confirmed")) : [];
  const awaiting = live.filter((b) => b.status === "requested");
  const confirmed = live.filter((b) => b.status === "confirmed");

  const nav: { view: View; label: string; icon: React.ReactNode; badge?: number }[] = [
    { view: "overview", label: "Overview", icon: ICONS.home },
    { view: "sessions", label: "Sessions", icon: ICONS.calendar, badge: counts?.requested || undefined },
    { view: "clients", label: "Clients", icon: ICONS.people },
    { view: "partners", label: "Partner links", icon: ICONS.link },
  ];

  const titles: Record<View, string> = {
    overview: "Overview",
    sessions:
      source === "direct"
        ? "Sessions: direct"
        : source
          ? `Sessions: ${getPartner(source)?.name}`
          : "Sessions",
    clients: "Clients",
    partners: "Partner booking links",
  };

  const monthTitle = new Date(`${range.month}-15T12:00:00+02:00`).toLocaleDateString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="admin-shell min-h-screen" style={{ background: "#f5f5f5", color: "#242424" }}>
      {/* ---------------------------------------------------------- top bar */}
      <header className="sticky top-0 z-40 border-b bg-white" style={{ borderColor: "#e0e0e0" }}>
        {/* The brand's blue-to-green line, as on the public site. */}
        <div aria-hidden="true" style={{ height: 3, background: "linear-gradient(90deg, #1f86c7, #1a75ad 45%, #8bc34a)" }} />
        <div className="flex h-[3.8rem] items-center justify-between gap-4 px-4">
          <Link href="/manage" className="flex items-center gap-3">
            <Image src="/images/mimshack-logo.png" alt="Mimshack Wellness" width={500} height={180} className="h-11 w-auto" />
            <span aria-hidden="true" className="h-6 w-px" style={{ background: "#d1d1d1" }} />
            <span className="text-[1rem] font-semibold" style={{ color: "#0e3a57" }}>
              Admin
            </span>
          </Link>
          <div className="flex items-center gap-1 text-[0.88rem]" style={{ color: "#424242" }}>
            <Link href="/" className="rounded px-3 py-1.5 font-semibold hover:bg-[#f0f0f0]">
              View website
            </Link>
            <span className="hidden px-3 sm:inline" style={{ color: "#707070" }}>
              {who}
            </span>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="rounded px-3 py-1.5 font-semibold hover:bg-[#f0f0f0]">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* ------------------------------------------------------- left menu */}
        <nav
          aria-label="Admin"
          className="border-b bg-white lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r"
          style={{ borderColor: "#e0e0e0" }}
        >
          <ul className="grid list-none grid-cols-2 gap-1 p-2 sm:grid-cols-3 lg:grid-cols-1 lg:py-3">
            {nav.map((item) => {
              const on = view === item.view;
              return (
                <li key={item.view}>
                  <Link
                    href={href({ view: item.view })}
                    aria-current={on ? "page" : undefined}
                    className="relative flex items-center gap-3 rounded px-3 py-2 text-[0.9rem] transition-colors hover:bg-[#f0f0f0]"
                    style={on ? { background: "#eaf3fa", fontWeight: 600, color: "#0e3a57" } : undefined}
                  >
                    {on && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded"
                        style={{ background: "#1a75ad" }}
                      />
                    )}
                    <span aria-hidden="true" style={{ color: on ? "#1a75ad" : "#616161" }}>
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <span
                        className="rounded-full px-1.5 text-[0.72rem] font-semibold text-white"
                        style={{ background: "#c4314b" }}
                        title={`${item.badge} awaiting you`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>

                  {/* Session sources, under Sessions on a wide screen. */}
                  {item.view === "sessions" && view === "sessions" && (
                    <ul className="ml-9 mt-1 hidden list-none gap-0.5 lg:grid">
                      {sources.map((s) => {
                        const active = source === s.value;
                        return (
                          <li key={s.label}>
                            <Link
                              href={href({ view: "sessions", source: s.value })}
                              title={"title" in s ? s.title : undefined}
                              className="flex items-center justify-between rounded px-3 py-1.5 text-[0.85rem] hover:bg-[#f0f0f0]"
                              style={active ? { fontWeight: 600, color: "#0e3a57", background: "#f0f0f0" } : { color: "#424242" }}
                            >
                              {s.label}
                              {s.count !== undefined && (
                                <span className="text-[0.78rem]" style={{ color: "#707070" }}>
                                  {s.count}
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ----------------------------------------------------------- view */}
        <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-[1.6rem] font-semibold">{titles[view]}</h1>
            <AddSession
              services={[
                ...PRACTICE.services.map((s) => ({ value: s.slug, label: s.name })),
              ]}
              modes={PRACTICE.modes.map((m) => ({ value: m.value, label: m.label }))}
              partners={PARTNERS.map((p) => ({ slug: p.slug, name: p.name, short: p.short, referenceLabel: p.referenceLabel }))}
              defaultDate={saDate()}
            />
          </div>

          {/* ======================================================= overview */}
          {view === "overview" && (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <Tile label="Awaiting you" value={counts?.requested} href={href({ view: "sessions", source: "", status: "requested" })} alert />
                <Tile label="Upcoming sessions" value={counts?.upcoming} href={href({ view: "sessions", source: "", status: "" })} />
                <Tile label="Next 7 days" value={counts?.this_week} href={href({ view: "sessions", source: "", status: "" })} />
                {PARTNERS.map((p) => (
                  <Tile
                    key={p.slug}
                    label={`${p.short} upcoming`}
                    value={referrals[p.slug]?.upcoming ?? 0}
                    href={href({ view: "sessions", source: p.slug, status: "" })}
                  />
                ))}
                <Tile label="Signed consent forms" value={clients?.total} href={href({ view: "clients" })} />
              </div>

              {diaryProblem && <Notice>{diaryProblem}</Notice>}

              <div className="mt-6 grid gap-6">
                <Card
                  title="Waiting for you to confirm"
                  action={<Link href={href({ view: "sessions", source: "", status: "requested" })}>See all</Link>}
                >
                  <SessionList bookings={awaiting.slice(0, 6)} empty="Nothing waiting. New bookings appear here." />
                </Card>
                <Card title="Coming up" action={<Link href={href({ view: "sessions", source: "", status: "confirmed" })}>See all</Link>}>
                  <SessionList bookings={confirmed.slice(0, 6)} empty="No confirmed sessions coming up." />
                </Card>
              </div>

              <div className="mt-6">
                <Card title="Newest consent forms" action={<Link href="/clients">Search all clients</Link>}>
                  <ClientRows clients={clients} problem={clientsProblem} limit={5} />
                </Card>
              </div>
            </>
          )}

          {/* ======================================================= sessions */}
          {view === "sessions" && (
            <>
              {/* source pivot: the same choices as the left menu, for phones */}
              <div role="tablist" aria-label="Who booked" className="mt-4 flex flex-wrap gap-x-6 border-b" style={{ borderColor: "#e0e0e0" }}>
                {sources.map((s) => {
                  const active = source === s.value;
                  return (
                    <Link
                      key={s.label}
                      role="tab"
                      aria-selected={active}
                      href={href({ source: s.value })}
                      title={"title" in s ? s.title : undefined}
                      className="-mb-px border-b-2 px-1 pb-2 pt-1 text-[0.92rem]"
                      style={
                        active
                          ? { borderColor: "#1a75ad", fontWeight: 600, color: "#242424" }
                          : { borderColor: "transparent", color: "#616161" }
                      }
                    >
                      {s.label}
                      {s.count !== undefined && (
                        <span className="ml-1.5 text-[0.8rem]" style={{ color: "#707070" }}>
                          {s.count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* command bar */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  <Link href={href({ month: shift(range.month, -1) })} aria-label="Previous month" className={CMD}>
                    &lsaquo;
                  </Link>
                  <span className="min-w-[9.5rem] text-center text-[0.95rem] font-semibold">{monthTitle}</span>
                  <Link href={href({ month: shift(range.month, 1) })} aria-label="Next month" className={CMD}>
                    &rsaquo;
                  </Link>
                  <Link href={href({ month: saDate().slice(0, 7) })} className={`${CMD} ml-1`}>
                    Today
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-[0.88rem]" style={{ color: "#616161" }}>
                    Status
                    <StatusSelect
                      value={status ?? ""}
                      options={STATUS_FILTERS.map((f) => ({ label: f.label, href: href({ status: f.value }), value: f.value }))}
                    />
                  </label>
                  <div className="inline-flex overflow-hidden rounded border" style={{ borderColor: "#d1d1d1" }}>
                    {(["calendar", "list"] as const).map((l) => (
                      <Link
                        key={l}
                        href={href({ layout: l })}
                        aria-current={layout === l ? "true" : undefined}
                        className="px-3 py-1.5 text-[0.85rem] font-semibold"
                        style={layout === l ? { background: "#1a75ad", color: "#ffffff" } : { background: "#ffffff", color: "#424242" }}
                      >
                        {l === "list" ? "List" : "Calendar"}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                {!diary ? (
                  <Notice>{diaryProblem ?? "Sessions could not be loaded."}</Notice>
                ) : layout === "calendar" ? (
                  <>
                    <Card>
                      <MonthCalendar
                        month={range.month}
                        bookings={diary.bookings}
                        linkFor={(month) => href({ month })}
                        bare
                      />
                    </Card>
                    {/* The month's sessions, so a click on the calendar lands on one with its actions. */}
                    <div className="mt-6">
                      <Card title={`Sessions in ${monthTitle}`}>
                        <SessionList
                          bookings={soonest(diary.bookings)}
                          empty={`No sessions in ${monthTitle}${status ? " with this status" : ""}.`}
                        />
                      </Card>
                    </div>
                  </>
                ) : (
                  <Card>
                    <SessionList
                      bookings={soonest(diary.bookings)}
                      empty={`No sessions in ${monthTitle}${status ? " with this status" : ""}.`}
                    />
                  </Card>
                )}
              </div>
            </>
          )}

          {/* ======================================================== clients */}
          {view === "clients" && (
            <div className="mt-5">
              <Card
                title={clients ? `${COUNT.format(clients.total)} signed consent forms` : "Signed consent forms"}
                action={<Link href="/clients">Search all clients</Link>}
              >
                <ClientRows clients={clients} problem={clientsProblem} limit={20} />
              </Card>
            </div>
          )}

          {/* ======================================================= partners */}
          {view === "partners" && (
            <div className="mt-5 max-w-4xl">
              <p className="mb-4 text-[0.95rem]" style={{ color: "#616161" }}>
                Send each organisation its own link. Bookings made through it are marked as theirs.
              </p>
              <Card>
                <ul className="list-none">
                  {PARTNERS.map((p) => {
                    const c = referrals[p.slug] ?? { upcoming: 0, total: 0 };
                    return (
                      <li key={p.slug} className="flex flex-wrap items-center justify-between gap-4 border-b px-4 py-4 last:border-b-0">
                        <span className="flex min-w-0 items-center gap-4">
                          <span
                            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border bg-white p-1.5"
                            style={{ borderColor: "#e0e0e0" }}
                          >
                            <Image src={p.logo} alt={p.name} width={p.logoWidth} height={p.logoHeight} className="h-full w-full object-contain" />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold">{p.name}</span>
                            <span className="block break-all text-[0.88rem]" style={{ color: "#1a75ad" }}>
                              {partnerLink(p).replace("https://", "")}
                            </span>
                            <span className="block text-[0.82rem]" style={{ color: "#707070" }}>
                              {COUNT.format(c.upcoming)} upcoming &middot; {COUNT.format(c.total)} booked in total
                            </span>
                          </span>
                        </span>
                        <span className="flex flex-wrap gap-2">
                          <CopyButton value={partnerLink(p)} label="Copy link" />
                          <a
                            href={`/book/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded-full border px-4 py-1.5 text-[0.9rem] font-semibold"
                          >
                            Open page
                          </a>
                          <Link
                            href={href({ view: "sessions", source: p.slug, status: "" })}
                            className="shrink-0 rounded-full border px-4 py-1.5 text-[0.9rem] font-semibold"
                          >
                            Their sessions
                          </Link>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- pieces */

const CMD =
  "inline-flex h-8 min-w-8 items-center justify-center rounded border bg-white px-2.5 text-[0.88rem] font-semibold hover:bg-[#f5f5f5]";

function Card({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-white" style={{ borderColor: "#e0e0e0", boxShadow: "0 1px 2px rgb(0 0 0 / 0.06)" }}>
      {title && (
        <div className="flex items-center justify-between gap-4 border-b px-4 py-3" style={{ borderColor: "#e0e0e0" }}>
          <h2 className="text-[1rem] font-semibold">{title}</h2>
          {action && (
            <span className="text-[0.88rem] font-semibold hover:underline" style={{ color: "#1a75ad" }}>
              {action}
            </span>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

function Tile({ label, value, href, alert = false }: { label: string; value?: number; href: string; alert?: boolean }) {
  const show = value === undefined ? "–" : COUNT.format(value);
  return (
    <Link
      href={href}
      className="rounded-lg border bg-white px-4 py-3 transition-colors hover:border-[#1a75ad]"
      style={{ borderColor: "#e0e0e0", boxShadow: "0 1px 2px rgb(0 0 0 / 0.06)" }}
    >
      <span className="block text-[0.82rem]" style={{ color: "#616161" }}>
        {label}
      </span>
      <span className="mt-1 block text-[1.7rem] font-semibold leading-tight" style={alert && value ? { color: "#c4314b" } : undefined}>
        {show}
      </span>
    </Link>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded border px-4 py-3 text-[0.92rem]" style={{ borderColor: "#f1c21b", background: "#fff8e1" }}>
      {children}
    </p>
  );
}

/** A native select that navigates: works without any script on the page. */
function StatusSelect({ value, options }: { value: string; options: { label: string; href: string; value: string }[] }) {
  return (
    <span className="inline-flex overflow-hidden rounded border bg-white" style={{ borderColor: "#d1d1d1" }}>
      {options.map((o) => (
        <Link
          key={o.label}
          href={o.href}
          aria-current={o.value === value ? "true" : undefined}
          className="border-r px-2.5 py-1.5 text-[0.82rem] font-semibold last:border-r-0"
          style={
            o.value === value
              ? { background: "#eaf3fa", color: "#0e3a57", borderColor: "#d1d1d1" }
              : { color: "#424242", borderColor: "#d1d1d1" }
          }
        >
          {o.label}
        </Link>
      ))}
    </span>
  );
}

function ClientRows({ clients, problem, limit }: { clients: EntryPage | null; problem: string | null; limit: number }) {
  if (problem) return <p className="px-4 py-6 text-[0.92rem]" style={{ color: "#616161" }}>{problem}</p>;
  if (!clients || clients.rows.length === 0) {
    return <p className="px-4 py-10 text-center text-[0.92rem]" style={{ color: "#616161" }}>Nobody has signed the consent form yet.</p>;
  }
  return (
    <ul className="list-none text-[0.9rem]">
      {clients.rows.slice(0, limit).map((entry) => (
        <li key={entry.id} className="border-b last:border-b-0" style={{ borderColor: "#eeeeee" }}>
          <Link
            href={`/clients/${encodeURIComponent(entry.id)}?back=${encodeURIComponent("/manage?view=clients")}`}
            className="grid gap-x-4 gap-y-1 px-4 py-3 hover:bg-[#fafafa] sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_auto] sm:items-center"
          >
            <span className="min-w-0 truncate font-semibold">
              {fullName(entry)}
              {entry.isMinor && (
                <span className="ml-2 rounded-full px-2 py-0.5 text-[0.72rem] font-semibold" style={CHILD_STYLE}>
                  Child
                </span>
              )}
            </span>
            <span className="min-w-0 truncate" style={{ color: "#616161" }}>
              {serviceLabel(entry)} &middot; {modeLabel(entry.mode)} &middot; {entry.phone}
            </span>
            <span className="flex items-center gap-3 text-[0.85rem]" style={{ color: "#616161" }}>
              {entry.agreeConsent && entry.agreePayment && (
                <span className="rounded-full px-2 py-0.5 text-[0.75rem] font-semibold" style={OK_STYLE}>
                  {"✓"} Signed
                </span>
              )}
              {DAY.format(new Date(entry.createdAt))}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3.5 10.5 12 4l8.5 6.5V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  ),
  people: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h3a4.5 4.5 0 0 1 4.5 4.5V20" />
      <path d="M16 4.6a3.2 3.2 0 0 1 0 6.2M21 20v-1.5a4.5 4.5 0 0 0-3.2-4.3" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L11.7 6" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5" />
    </svg>
  ),
};
