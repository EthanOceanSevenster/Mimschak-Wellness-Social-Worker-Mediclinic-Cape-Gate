import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  cleanQuery,
  searchEntries,
  StorageNotConfigured,
  type EntryPage,
  type EntrySearch,
} from "@/lib/client-entries";
import { bankingReady, FORM_SERVICES, fullName, modeLabel, serviceLabel } from "@/lib/client-form";
import { hasAdminAccess } from "@/lib/clients-auth";

import { PageHeader, SHELL, SiteFooter, SiteHeader } from "../chrome";
import { mailConfigured } from "@/lib/mailer";
import { SendFormPanel } from "../send-form-panel";
import { CHILD_STYLE, OK_STYLE } from "./entry-card";
import { BUTTON, COUNT, DAY } from "./shared";

export const metadata: Metadata = {
  title: "Client form entries | Mimshack Wellness",
  robots: { index: false, follow: false },
};

// Entries arrive at any time, and this page must never be served from a cache.
export const dynamic = "force-dynamic";

const FIELD =
  "w-full rounded border px-4 py-2.5 text-base outline-none transition-colors focus:border-[var(--brand)]";

/** /clients with the given search, keeping only what is set. */
function listHref(search: EntrySearch, page = 1): string {
  const params = new URLSearchParams();
  if (search.q) params.set("q", search.q);
  if (search.service) params.set("service", search.service);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/clients?${query}` : "/clients";
}

/** A client's page, remembering this list view so "Back" returns to it. */
function detailHref(id: string, back: string): string {
  return `/clients/${encodeURIComponent(id)}?back=${encodeURIComponent(back)}`;
}

function ConsentMark({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="rounded-full px-2.5 py-0.5 text-[0.8rem] font-semibold" style={OK_STYLE}>
      {"✓"} Signed
    </span>
  ) : (
    <span className="text-[0.85rem]" style={{ color: "#b42318" }}>
      Incomplete
    </span>
  );
}

function Pagination({ result, search }: { result: EntryPage; search: EntrySearch }) {
  if (result.pages <= 1) return null;
  const { page, pages } = result;
  const step = (label: string, target: number, enabled: boolean) =>
    enabled ? (
      <Link
        href={listHref(search, target)}
        className={`${BUTTON} border hover:border-[var(--brand)]`}
        aria-label={`${label} page`}
      >
        {label}
      </Link>
    ) : (
      <span className={`${BUTTON} border opacity-40`} aria-disabled="true">
        {label}
      </span>
    );

  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-center gap-2">
      {step("First", 1, page > 1)}
      {step("Previous", page - 1, page > 1)}
      <span className="px-3 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
        Page {COUNT.format(page)} of {COUNT.format(pages)}
      </span>
      {step("Next", page + 1, page < pages)}
      {step("Last", pages, page < pages)}
    </nav>
  );
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; service?: string; page?: string }>;
}) {
  const params = await searchParams;

  // One sign-in for the whole admin area: /login, then back here.
  if (!(await hasAdminAccess())) redirect("/login?next=/clients");

  const search: EntrySearch = {
    q: cleanQuery(params.q) || undefined,
    service: (FORM_SERVICES as readonly string[]).includes(params.service ?? "")
      ? params.service
      : undefined,
    page: Number.parseInt(params.page ?? "1", 10) || 1,
  };
  const filtered = Boolean(search.q || search.service);

  let result: EntryPage | null = null;
  let problem: string | null = null;
  try {
    result = await searchEntries(search);
  } catch (err) {
    if (err instanceof StorageNotConfigured) {
      problem =
        "No database is connected yet, so there is nowhere to keep entries. Connect a Postgres database to the project in Vercel, under Storage, and redeploy.";
    } else {
      console.error("client form: could not list entries:", err instanceof Error ? err.message : err);
      problem = "The entries could not be loaded just now. Refresh the page to try again.";
    }
  }

  const here = listHref(search, result?.page ?? search.page ?? 1);
  const first = result && result.total > 0 ? (result.page - 1) * result.pageSize + 1 : 0;
  const last = result ? Math.min(result.page * result.pageSize, result.total) : 0;

  return (
    <>
      <SiteHeader />

      <main id="main">
        <div className={`${SHELL} pt-6`}>
          <Link
            href="/manage"
            className="text-[0.95rem] font-semibold underline underline-offset-4 hover:text-[var(--brand)]"
          >
            {"\u2190"} Admin
          </Link>
        </div>
        <PageHeader
          title="Client form entries"
          lead="Every signed consent form, newest first. Search by name, email, phone or ID number."
        />

        {/* ------------------------------------------------- send the form */}
        <section className="border-b py-6" style={{ background: "var(--bg-soft)" }}>
          <div className={SHELL}>
            <SendFormPanel emailReady={mailConfigured()} />
          </div>
        </section>

        <section className="py-8 sm:py-10">
          <div className={`${SHELL} grid gap-6`}>
            {!bankingReady() && (
              <p className="rounded border px-5 py-4" style={{ borderColor: "#b54708", color: "#b54708" }}>
                The banking details are not filled in yet, so clients do not see them after they
                submit. Add them in <code>next/lib/client-form.ts</code> and redeploy.
              </p>
            )}

            {/* ------------------------------------------------------ search */}
            {/* A plain GET form: the search lives in the address, so it can be
                bookmarked, and Back returns to the same page of results. */}
            <form
              method="get"
              action="/clients"
              role="search"
              className="grid gap-3 sm:grid-cols-[1fr_14rem_auto_auto] sm:items-end"
            >
              <label className="grid gap-1.5">
                <span className="text-[0.9rem] font-medium">Search</span>
                <input
                  type="search"
                  name="q"
                  defaultValue={search.q ?? ""}
                  maxLength={100}
                  placeholder="Name, email, phone or ID number"
                  className={FIELD}
                  style={{ background: "var(--surface)" }}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[0.9rem] font-medium">Help with</span>
                <select
                  name="service"
                  defaultValue={search.service ?? ""}
                  className={FIELD}
                  style={{ background: "var(--surface)" }}
                >
                  <option value="">All services</option>
                  {FORM_SERVICES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className={`${BUTTON} justify-center py-2.5`}
                style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
              >
                Search
              </button>
              {filtered && (
                <Link
                  href="/clients"
                  className={`${BUTTON} justify-center border py-2.5 hover:border-[var(--brand)]`}
                >
                  Clear
                </Link>
              )}
            </form>

            {problem && (
              <p
                role="alert"
                className="rounded border px-5 py-4"
                style={{ borderColor: "#b42318", color: "#b42318" }}
              >
                {problem}
              </p>
            )}

            {result && (
              <p className="text-[0.95rem]" style={{ color: "var(--text-soft)" }} aria-live="polite">
                {result.total === 0
                  ? filtered
                    ? "No clients match this search."
                    : "No signed forms yet. Send the form to a client with the buttons above."
                  : `Showing ${COUNT.format(first)}–${COUNT.format(last)} of ${COUNT.format(result.total)} ${
                      filtered ? "matching clients" : result.total === 1 ? "client" : "clients"
                    }`}
              </p>
            )}

            {result && result.rows.length > 0 && (
              <>
                {/* -------------------------------------- table, wide screens */}
                <div
                  className="hidden overflow-hidden rounded-lg border md:block"
                  style={{ background: "var(--surface)" }}
                >
                  <table className="w-full text-left text-[0.92rem]">
                    <thead style={{ background: "var(--bg-soft)" }}>
                      <tr className="border-b">
                        {["Client", "Phone", "Help with", "Sessions", "Submitted", "Consent", ""].map((h) => (
                          <th
                            key={h || "open"}
                            scope="col"
                            className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
                            style={{ color: "var(--text-soft)" }}
                          >
                            {h || <span className="sr-only">Open</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {result.rows.map((row) => (
                        <tr key={row.id} className="align-top transition-colors hover:bg-[var(--bg-soft)]">
                          <td className="px-4 py-3">
                            <Link
                              href={detailHref(row.id, here)}
                              className="font-semibold hover:text-[var(--brand)]"
                            >
                              {fullName(row)}
                            </Link>
                            {row.isMinor && (
                              <span
                                className="ml-2 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold"
                                style={CHILD_STYLE}
                              >
                                Child
                              </span>
                            )}
                            <span
                              className="block max-w-[16rem] truncate text-[0.85rem]"
                              style={{ color: "var(--text-soft)" }}
                            >
                              {row.email}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">{row.phone}</td>
                          <td className="max-w-[12rem] truncate px-4 py-3" title={serviceLabel(row)}>
                            {serviceLabel(row)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">{modeLabel(row.mode)}</td>
                          <td className="whitespace-nowrap px-4 py-3">{DAY.format(new Date(row.createdAt))}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <ConsentMark ok={row.agreeConsent && row.agreePayment} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <Link
                              href={detailHref(row.id, here)}
                              className="font-semibold underline underline-offset-4 hover:text-[var(--brand)]"
                              aria-label={`Open ${fullName(row)}`}
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ----------------------------------------- list, phones */}
                <ul className="grid gap-3 md:hidden">
                  {result.rows.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={detailHref(row.id, here)}
                        className="block rounded-lg border p-4 transition-colors hover:border-[var(--brand)]"
                        style={{ background: "var(--surface)" }}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="font-semibold">{fullName(row)}</span>
                          <span className="shrink-0 text-[0.85rem]" style={{ color: "var(--text-soft)" }}>
                            {DAY.format(new Date(row.createdAt))}
                          </span>
                        </span>
                        <span className="mt-1 block text-[0.9rem]" style={{ color: "var(--text-soft)" }}>
                          {serviceLabel(row)} &middot; {modeLabel(row.mode)}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-2 text-[0.9rem]">
                          {row.phone}
                          <ConsentMark ok={row.agreeConsent && row.agreePayment} />
                          {row.isMinor && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[0.75rem] font-semibold"
                              style={CHILD_STYLE}
                            >
                              Child
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>

                <Pagination result={result} search={search} />
              </>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
