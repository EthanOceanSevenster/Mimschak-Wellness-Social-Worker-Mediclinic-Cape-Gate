import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getEntry, StorageNotConfigured } from "@/lib/client-entries";
import { hasAdminAccess } from "@/lib/clients-auth";

import { SHELL, SiteFooter, SiteHeader } from "../../chrome";
import { EntryCard } from "../entry-card";

export const metadata: Metadata = {
  title: "Client | Mimshack Wellness",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** One client's whole entry. The list links here; it loads just this one. */
export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  // Signed out: the sign-in lives on the list page.
  if (!(await hasAdminAccess())) redirect("/clients");

  const { id } = await params;
  // Only ever a path within the entries list, never another site.
  const { back } = await searchParams;
  const backHref = back && /^\/clients(\?[^\s]*)?$/.test(back) ? back : "/clients";
  let entry;
  try {
    entry = await getEntry(id);
  } catch (error) {
    if (error instanceof StorageNotConfigured) redirect("/clients");
    throw error;
  }
  if (!entry) notFound();

  return (
    <>
      <SiteHeader />
      <main id="main" className="py-8 sm:py-10">
        <div className={`${SHELL} grid gap-5`}>
          <nav aria-label="Breadcrumb">
            {/* Back returns to the search and page the owner came from. */}
            <Link
              href={backHref}
              className="text-[0.95rem] font-semibold underline underline-offset-4 hover:text-[var(--brand)]"
            >
              {"\u2190"} All client entries
            </Link>
          </nav>
          <EntryCard entry={entry} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
