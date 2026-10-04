import { randomBytes, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { neon } from "@neondatabase/serverless";

import {
  TERMS_VERSION,
  type ClientEntry,
  type ClientEntryInput,
  type PermissionAnswer,
} from "./client-form";

/**
 * Where client form entries are kept. Server only.
 *
 * Production uses the Postgres database Vercel attaches to the project (Neon,
 * from Vercel Storage), which sets DATABASE_URL. The table is created on first
 * use, so there is no migration step.
 *
 * Without a database, local development falls back to a JSON file in .data/
 * so the form can be tried on a laptop. Production never does: Vercel's
 * filesystem is read-only and wiped between requests, so entries written there
 * would silently vanish. It refuses instead, and the form says so.
 *
 * The list page never loads whole entries: it asks searchEntries for one page
 * of summaries at a time, and the database does the filtering and counting.
 * Signatures (tens of KB each) are fetched one at a time, only on a client's
 * own page, through getSignature.
 *
 * Each entry also gets a random download token. It is handed to the client
 * who signed, once, so they can download their own signed PDF without an
 * account; at 192 random bits it cannot be guessed. It expires after
 * TOKEN_DAYS, after which the practice can still send them a copy.
 */

export const TOKEN_DAYS = 30;

const DATABASE_URL = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
const LOCAL_FILE = path.join(process.cwd(), ".data", "client-form-entries.json");

export class StorageNotConfigured extends Error {
  constructor() {
    super("No database is connected. Set DATABASE_URL to store client form entries.");
  }
}

/** A whole entry, as needed to build its signed PDF. */
export type SignedEntry = ClientEntry & { signature: string };

type Stored = SignedEntry & { downloadToken: string };

type Row = {
  id: string | number;
  created_at: string | Date;
  first_name: string;
  surname: string;
  id_or_dob: string;
  phone: string;
  email: string;
  contact_method: string;
  street: string;
  suburb: string;
  city: string;
  postal_code: string;
  service: string;
  service_other: string;
  mode: string;
  note: string;
  perm_messages: PermissionAnswer;
  perm_admin_contact: PermissionAnswer;
  perm_remote: PermissionAnswer;
  perm_attendance: PermissionAnswer;
  agreed_payment: boolean;
  agreed_consent: boolean;
  is_minor: boolean;
  minor_name: string;
  minor_relationship: string;
  minor_basis: string;
  signed_place: string;
  terms_version: string;
  signature?: string;
};

let tableReady: Promise<unknown> | null = null;

function database() {
  const sql = neon(DATABASE_URL as string);
  tableReady ??= sql`
    CREATE TABLE IF NOT EXISTS client_form_entries (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      first_name TEXT NOT NULL,
      surname TEXT NOT NULL,
      id_or_dob TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      contact_method TEXT NOT NULL,
      street TEXT NOT NULL,
      suburb TEXT NOT NULL,
      city TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      service TEXT NOT NULL,
      service_other TEXT NOT NULL DEFAULT '',
      mode TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      perm_messages TEXT NOT NULL,
      perm_admin_contact TEXT NOT NULL,
      perm_remote TEXT NOT NULL,
      perm_attendance TEXT NOT NULL,
      agreed_payment BOOLEAN NOT NULL,
      agreed_consent BOOLEAN NOT NULL,
      is_minor BOOLEAN NOT NULL DEFAULT false,
      minor_name TEXT NOT NULL DEFAULT '',
      minor_relationship TEXT NOT NULL DEFAULT '',
      minor_basis TEXT NOT NULL DEFAULT '',
      signed_place TEXT NOT NULL,
      terms_version TEXT NOT NULL,
      signature TEXT NOT NULL,
      download_token TEXT NOT NULL UNIQUE
    )
  `
    // The list pages newest first, with or without a service filter. These
    // keep that an index walk at 100,000 rows rather than a sort of them all.
    .then(() => sql`
      CREATE INDEX IF NOT EXISTS client_form_entries_created_idx
      ON client_form_entries (created_at DESC, id DESC)
    `)
    .then(() => sql`
      CREATE INDEX IF NOT EXISTS client_form_entries_service_created_idx
      ON client_form_entries (service, created_at DESC, id DESC)
    `)
    .catch((error) => {
    // Let the next request try again rather than failing forever.
    tableReady = null;
    throw error;
  });
  return { sql, ready: tableReady };
}

function useLocalFile(): boolean {
  if (DATABASE_URL) return false;
  if (process.env.NODE_ENV === "production") throw new StorageNotConfigured();
  return true;
}

async function readLocal(): Promise<Stored[]> {
  try {
    return JSON.parse(await fs.readFile(LOCAL_FILE, "utf8")) as Stored[];
  } catch {
    return [];
  }
}

/** Saves the entry and returns the client's private download token. */
export async function saveEntry(entry: ClientEntryInput): Promise<string> {
  const downloadToken = randomBytes(24).toString("base64url");

  if (useLocalFile()) {
    const all = await readLocal();
    all.push({
      ...entry,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      termsVersion: TERMS_VERSION,
      downloadToken,
    });
    await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
    await fs.writeFile(LOCAL_FILE, JSON.stringify(all, null, 2));
    return downloadToken;
  }

  const { sql, ready } = database();
  await ready;
  await sql`
    INSERT INTO client_form_entries (
      first_name, surname, id_or_dob, phone, email, contact_method,
      street, suburb, city, postal_code,
      service, service_other, mode, note,
      perm_messages, perm_admin_contact, perm_remote, perm_attendance,
      agreed_payment, agreed_consent,
      is_minor, minor_name, minor_relationship, minor_basis,
      signed_place, terms_version, signature, download_token
    ) VALUES (
      ${entry.firstName}, ${entry.surname}, ${entry.idOrDob}, ${entry.phone}, ${entry.email},
      ${entry.contactMethod},
      ${entry.street}, ${entry.suburb}, ${entry.city}, ${entry.postalCode},
      ${entry.service}, ${entry.serviceOther}, ${entry.mode}, ${entry.note},
      ${entry.permMessages}, ${entry.permAdminContact}, ${entry.permRemote}, ${entry.permAttendance},
      ${entry.agreePayment}, ${entry.agreeConsent},
      ${entry.isMinor}, ${entry.minorName}, ${entry.minorRelationship}, ${entry.minorBasis},
      ${entry.signedPlace}, ${TERMS_VERSION}, ${entry.signature}, ${downloadToken}
    )
  `;
  return downloadToken;
}

/** One row of the list page: just what the table shows. */
export type EntrySummary = Pick<
  ClientEntry,
  | "id"
  | "createdAt"
  | "firstName"
  | "surname"
  | "email"
  | "phone"
  | "service"
  | "serviceOther"
  | "mode"
  | "isMinor"
  | "agreeConsent"
  | "agreePayment"
>;

export type EntrySearch = { q?: string; service?: string; page?: number };

export type EntryPage = {
  rows: EntrySummary[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
};

export const PAGE_SIZE = 50;

/** Tidied search text, capped so a pasted essay cannot become a query. */
export function cleanQuery(q: string | undefined): string {
  return (q ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
}

/**
 * The phone part of a search, comparable however the number was typed:
 * "076 123 5651", "0761235651" and "+27 76 123 5651" all reduce to
 * "761235651", which is also inside the stored number's digits.
 */
export function phoneDigits(q: string): string {
  // Only a search that looks like a phone number is compared as one, so
  // "Thandi 1990" or "100%" do not match every phone containing those digits.
  if (!/^[\d\s()+-]+$/.test(q)) return "";
  const digits = q.replace(/\D/g, "");
  if (digits.length < 3) return "";
  if (digits.startsWith("27")) return digits.slice(2);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * The WHERE clause for a search, as parameterised SQL. Pure, so it can be
 * tested against a real Postgres without the rest of this module.
 *
 * Matching is a case-insensitive "contains" on name, email and ID or date of
 * birth, plus digits-only on phone. At 100,000 rows that is a single fast
 * scan; if it ever is not, a pg_trgm index on these columns is the next step.
 */
export function searchWhere(search: EntrySearch): { sql: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  const q = cleanQuery(search.q);

  if (q) {
    params.push(`%${escapeLike(q)}%`);
    const text = `$${params.length}`;
    const either = [
      `(first_name || ' ' || surname) ILIKE ${text}`,
      `email ILIKE ${text}`,
      `id_or_dob ILIKE ${text}`,
    ];
    const digits = phoneDigits(q);
    if (digits) {
      params.push(`%${digits}%`);
      either.push(`regexp_replace(phone, '[^0-9]', '', 'g') LIKE $${params.length}`);
    }
    parts.push(`(${either.join(" OR ")})`);
  }

  if (search.service) {
    params.push(search.service);
    parts.push(`service = $${params.length}`);
  }

  return { sql: parts.length ? `WHERE ${parts.join(" AND ")}` : "", params };
}

function localMatch(entry: ClientEntry, search: EntrySearch): boolean {
  const q = cleanQuery(search.q).toLowerCase();
  if (search.service && entry.service !== search.service) return false;
  if (!q) return true;
  const digits = phoneDigits(q);
  return (
    `${entry.firstName} ${entry.surname}`.toLowerCase().includes(q) ||
    entry.email.toLowerCase().includes(q) ||
    entry.idOrDob.toLowerCase().includes(q) ||
    (digits !== "" && entry.phone.replace(/\D/g, "").includes(digits))
  );
}

function summary(entry: ClientEntry): EntrySummary {
  return {
    id: entry.id,
    createdAt: entry.createdAt,
    firstName: entry.firstName,
    surname: entry.surname,
    email: entry.email,
    phone: entry.phone,
    service: entry.service,
    serviceOther: entry.serviceOther,
    mode: entry.mode,
    isMinor: entry.isMinor,
    agreeConsent: entry.agreeConsent,
    agreePayment: entry.agreePayment,
  };
}

/** One page of entries, newest first, filtered by the search. */
export async function searchEntries(search: EntrySearch): Promise<EntryPage> {
  const requested = Math.max(1, Math.floor(search.page ?? 1));

  if (useLocalFile()) {
    const matches = (await readLocal())
      .filter((entry) => localMatch(entry, search))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
    const page = Math.min(requested, pages);
    return {
      rows: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(summary),
      total: matches.length,
      page,
      pages,
      pageSize: PAGE_SIZE,
    };
  }

  const { sql, ready } = database();
  await ready;
  const where = searchWhere(search);
  const counted = (await sql.query(
    `SELECT count(*)::int AS total FROM client_form_entries ${where.sql}`,
    where.params,
  )) as { total: number }[];
  const total = counted[0]?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requested, pages);

  const n = where.params.length;
  const rows = (await sql.query(
    `SELECT id, created_at, first_name, surname, email, phone, service, service_other, mode,
            is_minor, agreed_consent, agreed_payment
     FROM client_form_entries ${where.sql}
     ORDER BY created_at DESC, id DESC
     LIMIT $${n + 1} OFFSET $${n + 2}`,
    [...where.params, PAGE_SIZE, (page - 1) * PAGE_SIZE],
  )) as Row[];

  return {
    rows: rows.map((row) => ({
      id: String(row.id),
      createdAt: new Date(row.created_at).toISOString(),
      firstName: row.first_name,
      surname: row.surname,
      email: row.email,
      phone: row.phone,
      service: row.service,
      serviceOther: row.service_other,
      mode: row.mode,
      isMinor: row.is_minor,
      agreeConsent: row.agreed_consent,
      agreePayment: row.agreed_payment,
    })),
    total,
    page,
    pages,
    pageSize: PAGE_SIZE,
  };
}

/** For the practice: one entry by id, without its signature. */
export async function getEntry(id: string): Promise<ClientEntry | null> {
  const entry = await getSignedEntry(id);
  if (!entry) return null;
  const { signature: _signature, ...rest } = entry;
  return rest;
}

function fromRow(row: Row): ClientEntry {
  return {
    id: String(row.id),
    createdAt: new Date(row.created_at).toISOString(),
    firstName: row.first_name,
    surname: row.surname,
    idOrDob: row.id_or_dob,
    phone: row.phone,
    email: row.email,
    contactMethod: row.contact_method,
    street: row.street,
    suburb: row.suburb,
    city: row.city,
    postalCode: row.postal_code,
    service: row.service,
    serviceOther: row.service_other,
    mode: row.mode,
    note: row.note,
    permMessages: row.perm_messages,
    permAdminContact: row.perm_admin_contact,
    permRemote: row.perm_remote,
    permAttendance: row.perm_attendance,
    agreePayment: row.agreed_payment,
    agreeConsent: row.agreed_consent,
    isMinor: row.is_minor,
    minorName: row.minor_name,
    minorRelationship: row.minor_relationship,
    minorBasis: row.minor_basis,
    signedPlace: row.signed_place,
    termsVersion: row.terms_version,
  };
}

/** The PNG data URL for one entry's signature, or null if there is no such entry. */
export async function getSignature(id: string): Promise<string | null> {
  if (useLocalFile()) {
    return (await readLocal()).find((entry) => entry.id === id)?.signature ?? null;
  }

  if (!/^\d{1,19}$/.test(id)) return null;
  const { sql, ready } = database();
  await ready;
  const rows = (await sql`
    SELECT signature FROM client_form_entries WHERE id = ${id}
  `) as { signature: string }[];
  return rows[0]?.signature ?? null;
}

function withoutToken({ downloadToken: _token, ...entry }: Stored): SignedEntry {
  return entry;
}

/** For the practice: one whole entry by id. */
export async function getSignedEntry(id: string): Promise<SignedEntry | null> {
  if (useLocalFile()) {
    const found = (await readLocal()).find((entry) => entry.id === id);
    return found ? withoutToken(found) : null;
  }

  if (!/^\d{1,19}$/.test(id)) return null;
  const { sql, ready } = database();
  await ready;
  const rows = (await sql`SELECT * FROM client_form_entries WHERE id = ${id}`) as Row[];
  return rows[0] ? { ...fromRow(rows[0]), signature: rows[0].signature ?? "" } : null;
}

/** For the client who signed: their own entry, by token, within TOKEN_DAYS. */
export async function getSignedEntryByToken(token: string): Promise<SignedEntry | null> {
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return null;
  const cutoff = Date.now() - TOKEN_DAYS * 24 * 60 * 60 * 1000;

  if (useLocalFile()) {
    const found = (await readLocal()).find((entry) => entry.downloadToken === token);
    return found && Date.parse(found.createdAt) >= cutoff ? withoutToken(found) : null;
  }

  const { sql, ready } = database();
  await ready;
  const rows = (await sql`
    SELECT * FROM client_form_entries
    WHERE download_token = ${token} AND created_at >= ${new Date(cutoff).toISOString()}
  `) as Row[];
  return rows[0] ? { ...fromRow(rows[0]), signature: rows[0].signature ?? "" } : null;
}
