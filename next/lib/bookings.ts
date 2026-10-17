import { randomInt } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { neon } from "@neondatabase/serverless";

import { StorageNotConfigured } from "./client-entries";
import { getPartner } from "./partners";
import type { Booking, BookingStatus, DiaryDay, ManageBookings, Practice } from "./types";

/**
 * Session bookings, kept in this site's own database. Server only.
 *
 * Same arrangement as lib/client-entries.ts: the Postgres database Vercel
 * attaches (DATABASE_URL) in production, a JSON file in .data/ on a laptop
 * without one, and a refusal rather than a silent loss in production.
 *
 * The diary is Monday to Friday, 08:00 to 17:00, in one-hour sessions, South
 * African time. South Africa has no daylight saving, so every time is stored
 * with a fixed +02:00 offset and needs no time zone library.
 *
 * A time can be held by one live booking only (requested or confirmed). The
 * database enforces it with a partial unique index, so two people pressing
 * Book on the same slot at once cannot both get it.
 */

const DATABASE_URL = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
const LOCAL_FILE = path.join(process.cwd(), ".data", "bookings.json");

export const TIME_ZONE = "Africa/Johannesburg";
const OFFSET = "+02:00";
const OPEN_HOUR = 8;
const CLOSE_HOUR = 17;
const SLOT_MINUTES = 60;
const MIN_NOTICE_HOURS = 12;
/** How far ahead clients can book: a year. */
export const HORIZON_DAYS = 366;

const WHATSAPP_NUMBER = "27641533469";

export const PRACTICE: Practice = {
  slug: "mimshack-wellness",
  name: "Mimshack Wellness",
  contact_phone: "064 153 3469",
  contact_email: "phakama.ndamase@mimschakwellness.com",
  slot_minutes: SLOT_MINUTES,
  min_notice_hours: MIN_NOTICE_HOURS,
  horizon_days: HORIZON_DAYS,
  services: [
    {
      slug: "counselling",
      name: "Counselling",
      description: "Individual support for stress, anxiety and emotional wellbeing.",
      duration_minutes: 60,
    },
    {
      slug: "family-support",
      name: "Family support",
      description: "Family interventions and mediation, towards healthier relationships.",
      duration_minutes: 60,
    },
    {
      slug: "crisis-support",
      name: "Crisis support",
      description: "Trauma, bereavement and abuse support.",
      duration_minutes: 60,
    },
    {
      slug: "spiritual-support",
      name: "Spiritual support",
      description: "Faith-based support and spiritual counselling.",
      duration_minutes: 60,
    },
    {
      slug: "employee-wellness",
      name: "Employee wellness",
      description: "For organisations, including support after workplace incidents.",
      duration_minutes: 60,
    },
  ],
  modes: [
    { value: "in_person", label: "In person" },
    { value: "online", label: "Online (video call)" },
  ],
  whatsapp_url: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "Hi Mimshack Wellness, I would like to book a session. ",
  )}`,
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "Awaiting confirmation",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Done",
  no_show: "No show",
};

const STATUSES = Object.keys(STATUS_LABEL) as BookingStatus[];
const LIVE: BookingStatus[] = ["requested", "confirmed"];

export function isStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && (STATUSES as string[]).includes(value);
}

export class SlotTaken extends Error {
  constructor() {
    super("Sorry, that time has just been taken. Please choose another.");
  }
}

/* ------------------------------------------------------------ storage */

type Stored = {
  reference: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  service: string;
  mode: string;
  starts_at: string;
  ends_at: string;
  notes: string;
  status: BookingStatus;
  cancel_reason: string;
  /** Referring organisation (lib/partners.ts) and their reference, or "". */
  partner: string;
  partner_ref: string;
};

let tableReady: Promise<unknown> | null = null;

function database() {
  const sql = neon(DATABASE_URL as string);
  tableReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        reference TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        service TEXT NOT NULL,
        mode TEXT NOT NULL,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'requested',
        cancel_reason TEXT NOT NULL DEFAULT ''
      )`;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_live_per_slot
      ON bookings (starts_at) WHERE status IN ('requested', 'confirmed')`;
    await sql`CREATE INDEX IF NOT EXISTS bookings_starts_idx ON bookings (starts_at)`;
    // Added with partner booking links; harmless on a table that has them.
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS partner TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS partner_ref TEXT NOT NULL DEFAULT ''`;
  })();
  return { sql, ready: tableReady };
}

function useLocalFile(): boolean {
  if (DATABASE_URL) return false;
  if (process.env.NODE_ENV === "production") throw new StorageNotConfigured();
  return true;
}

async function readLocal(): Promise<Stored[]> {
  try {
    const rows = JSON.parse(await fs.readFile(LOCAL_FILE, "utf8")) as Stored[];
    return rows.map((r) => ({ ...r, partner: r.partner ?? "", partner_ref: r.partner_ref ?? "" }));
  } catch {
    return [];
  }
}

async function writeLocal(rows: Stored[]): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(rows, null, 2));
}

function iso(value: string | Date): string {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function fromRow(row: Record<string, unknown>): Stored {
  return {
    reference: String(row.reference),
    created_at: iso(row.created_at as string | Date),
    full_name: String(row.full_name),
    email: String(row.email),
    phone: String(row.phone),
    service: String(row.service),
    mode: String(row.mode),
    starts_at: iso(row.starts_at as string | Date),
    ends_at: iso(row.ends_at as string | Date),
    notes: String(row.notes ?? ""),
    status: (isStatus(row.status) ? row.status : "requested") as BookingStatus,
    cancel_reason: String(row.cancel_reason ?? ""),
    partner: String(row.partner ?? ""),
    partner_ref: String(row.partner_ref ?? ""),
  };
}

/* ------------------------------------------------------------- shaping */

/** The client describes what they need themselves (the text goes in notes). */
export const OWN_WORDS = "own-words";

function serviceName(slug: string): string {
  if (slug === OWN_WORDS) return "In their own words";
  return PRACTICE.services.find((s) => s.slug === slug)?.name ?? slug;
}

function modeName(value: string): string {
  return PRACTICE.modes.find((m) => m.value === value)?.label ?? value;
}

const LONG = new Intl.DateTimeFormat("en-ZA", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const CLOCK = new Intl.DateTimeFormat("en-ZA", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function toBooking(row: Stored): Booking {
  const start = new Date(row.starts_at);
  const partner = getPartner(row.partner);
  const message =
    `Hi Mimshack Wellness, I have requested a session. Reference ${row.reference}: ` +
    `${serviceName(row.service)}, ${modeName(row.mode).toLowerCase()}, on ` +
    `${LONG.format(start)} at ${CLOCK.format(start)}. My name is ${row.full_name}.` +
    (partner ? ` I was referred by ${partner.name}${row.partner_ref ? ` (reference ${row.partner_ref})` : ""}.` : "");
  return {
    ...row,
    partner_name: partner?.name ?? "",
    partner_short: partner?.short ?? "",
    service: serviceName(row.service),
    mode_label: modeName(row.mode),
    status_label: STATUS_LABEL[row.status],
    whatsapp_url: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
    can_cancel: LIVE.includes(row.status) && start > new Date(),
  };
}

/* ------------------------------------------------------------ the diary */

/** The calendar date in South Africa, as YYYY-MM-DD. */
export function saDate(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(at);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00${OFFSET}`);
  d.setUTCDate(d.getUTCDate() + days);
  return saDate(d);
}

function slotStart(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${OFFSET}`);
}

function dayTimes(): string[] {
  const times: string[] = [];
  for (let h = OPEN_HOUR; h + SLOT_MINUTES / 60 <= CLOSE_HOUR; h++) {
    times.push(`${String(h).padStart(2, "0")}:00`);
  }
  return times;
}

async function liveStartsBetween(from: Date, to: Date): Promise<Set<string>> {
  if (useLocalFile()) {
    const rows = await readLocal();
    return new Set(
      rows
        .filter((r) => LIVE.includes(r.status))
        .filter((r) => new Date(r.starts_at) >= from && new Date(r.starts_at) < to)
        .map((r) => iso(r.starts_at)),
    );
  }
  const { sql, ready } = database();
  await ready;
  const rows = await sql`
    SELECT starts_at FROM bookings
    WHERE status IN ('requested', 'confirmed') AND starts_at >= ${from.toISOString()} AND starts_at < ${to.toISOString()}`;
  return new Set(rows.map((r) => iso(r.starts_at as string | Date)));
}

/** The next `days` calendar days, with the times still free on each. */
export async function availability(days = 14): Promise<DiaryDay[]> {
  const today = saDate();
  const first = slotStart(today, "00:00");
  const last = slotStart(addDays(today, days), "00:00");
  const taken = await liveStartsBetween(first, last);
  const earliest = Date.now() + MIN_NOTICE_HOURS * 3_600_000;

  const result: DiaryDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const noon = new Date(`${date}T12:00:00${OFFSET}`);
    const weekday = new Intl.DateTimeFormat("en-ZA", { timeZone: TIME_ZONE, weekday: "long" }).format(noon);
    const dow = noon.getUTCDay();
    const isOpen = dow >= 1 && dow <= 5;
    const slots = isOpen
      ? dayTimes().filter((t) => {
          const at = slotStart(date, t);
          return at.getTime() >= earliest && !taken.has(at.toISOString());
        })
      : [];
    result.push({ date, weekday, is_open: isOpen, slots });
  }
  return result;
}

/* ------------------------------------------------------------ booking */

export type BookingInput = {
  service: string;
  mode: string;
  date: string;
  time: string;
  full_name: string;
  email: string;
  phone: string;
  notes: string;
  partner: string;
  partner_ref: string;
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function readBookingInput(
  body: Record<string, unknown>,
): { ok: true; value: BookingInput } | { ok: false; error: string } {
  const value: BookingInput = {
    service: text(body.service, 60),
    mode: text(body.mode, 30),
    date: text(body.date, 10),
    time: text(body.time, 5),
    full_name: text(body.full_name, 120),
    email: text(body.email, 200).toLowerCase(),
    phone: text(body.phone, 30),
    notes: text(body.notes, 1000),
    // An unknown partner is dropped rather than refused: the booking still
    // reaches the practice, just as a direct one.
    partner: getPartner(text(body.partner, 40))?.slug ?? "",
    partner_ref: "",
  };
  value.partner_ref = value.partner ? text(body.partner_ref, 60) : "";
  if (value.service === OWN_WORDS) {
    const own = text(body.own_words, 500);
    if (own.length < 2) return { ok: false, error: "Please say in a few words what you would like help with." };
    value.notes = `In their own words: ${own}${value.notes ? `\n${value.notes}` : ""}`;
  } else if (!PRACTICE.services.some((s) => s.slug === value.service)) {
    return { ok: false, error: "Please choose what you need." };
  }
  if (!PRACTICE.modes.some((m) => m.value === value.mode)) {
    return { ok: false, error: "Please choose in person or online." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !dayTimes().includes(value.time)) {
    return { ok: false, error: "Please choose a day and a time." };
  }
  if (value.full_name.length < 2) return { ok: false, error: "Please enter your name." };
  // Email is optional on a partner's link, where many clients have none;
  // the phone number is how the practice reaches them.
  const emailOptional = Boolean(value.partner) && value.email === "";
  if (!emailOptional && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (value.phone.replace(/\D/g, "").length < 9) {
    return { ok: false, error: "Please enter a phone number we can reach you on." };
  }
  return { ok: true, value };
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newReference(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `MW-${code}`;
}

/** Holds the time for the client. Throws SlotTaken if it is no longer free. */
export async function createBooking(input: BookingInput): Promise<Booking> {
  const free = (await availability(HORIZON_DAYS)).find((d) => d.date === input.date)?.slots ?? [];
  if (!free.includes(input.time)) throw new SlotTaken();

  const start = slotStart(input.date, input.time);
  const row: Stored = {
    reference: newReference(),
    created_at: new Date().toISOString(),
    full_name: input.full_name,
    email: input.email,
    phone: input.phone,
    service: input.service,
    mode: input.mode,
    starts_at: start.toISOString(),
    ends_at: new Date(start.getTime() + SLOT_MINUTES * 60_000).toISOString(),
    notes: input.notes,
    status: "requested",
    cancel_reason: "",
    partner: input.partner,
    partner_ref: input.partner_ref,
  };

  if (useLocalFile()) {
    const rows = await readLocal();
    if (rows.some((r) => LIVE.includes(r.status) && r.starts_at === row.starts_at)) throw new SlotTaken();
    rows.push(row);
    await writeLocal(rows);
    return toBooking(row);
  }

  const { sql, ready } = database();
  await ready;
  try {
    await sql`
      INSERT INTO bookings (reference, created_at, full_name, email, phone, service, mode, starts_at, ends_at, notes, status, partner, partner_ref)
      VALUES (${row.reference}, ${row.created_at}, ${row.full_name}, ${row.email}, ${row.phone}, ${row.service},
              ${row.mode}, ${row.starts_at}, ${row.ends_at}, ${row.notes}, 'requested', ${row.partner}, ${row.partner_ref})`;
  } catch (error) {
    // The one-live-booking-per-slot index: somebody else got there first.
    if (String((error as { code?: string }).code) === "23505") throw new SlotTaken();
    throw error;
  }
  return toBooking(row);
}

/* ------------------------------------------------------------- admin */

export type Diary = ManageBookings;

/**
 * Bookings for the Admin page: every booking starting in [from, to), newest
 * first, optionally one status only, plus the counts for the summary row.
 */
export async function listBookings(options: {
  from: Date;
  to: Date;
  status?: BookingStatus;
  /** "" for everyone, "direct" for bookings with no partner, or a partner's slug. */
  source?: string;
}): Promise<Diary> {
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 86_400_000);
  let rows: Stored[];
  let counts: Diary["counts"];

  if (useLocalFile()) {
    const all = await readLocal();
    rows = all.filter((r) => {
      const at = new Date(r.starts_at);
      return (
        at >= options.from &&
        at < options.to &&
        (!options.status || r.status === options.status) &&
        (!options.source ||
          (options.source === "direct" ? r.partner === "" : r.partner === options.source))
      );
    });
    const live = all.filter((r) => LIVE.includes(r.status) && new Date(r.starts_at) >= now);
    counts = {
      requested: live.filter((r) => r.status === "requested").length,
      upcoming: live.length,
      this_week: live.filter((r) => new Date(r.starts_at) < week).length,
      total: all.length,
    };
  } else {
    const { sql, ready } = database();
    await ready;
    // Empty string means "any" for both filters.
    const found = await sql`
      SELECT * FROM bookings
      WHERE starts_at >= ${options.from.toISOString()} AND starts_at < ${options.to.toISOString()}
        AND (${options.status ?? ""} = '' OR status = ${options.status ?? ""})
        AND (${options.source ?? ""} = ''
          OR (${options.source ?? ""} = 'direct' AND partner = '')
          OR partner = ${options.source ?? ""})
      ORDER BY starts_at DESC LIMIT 1000`;
    rows = found.map(fromRow);
    const [c] = await sql`
      SELECT
        count(*) FILTER (WHERE status = 'requested' AND starts_at >= ${now.toISOString()})::int AS requested,
        count(*) FILTER (WHERE status IN ('requested', 'confirmed') AND starts_at >= ${now.toISOString()})::int AS upcoming,
        count(*) FILTER (WHERE status IN ('requested', 'confirmed') AND starts_at >= ${now.toISOString()} AND starts_at < ${week.toISOString()})::int AS this_week,
        count(*)::int AS total
      FROM bookings`;
    counts = {
      requested: Number(c.requested),
      upcoming: Number(c.upcoming),
      this_week: Number(c.this_week),
      total: Number(c.total),
    };
  }

  rows.sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  return { practice: PRACTICE.name, counts, bookings: rows.map(toBooking) };
}

/** Moves a booking on (confirm, cancel, done...). Null if there is no such booking. */
export async function setBookingStatus(reference: string, status: BookingStatus): Promise<Booking | null> {
  if (useLocalFile()) {
    const rows = await readLocal();
    const row = rows.find((r) => r.reference === reference);
    if (!row) return null;
    if (
      LIVE.includes(status) &&
      !LIVE.includes(row.status) &&
      rows.some((r) => r !== row && LIVE.includes(r.status) && r.starts_at === row.starts_at)
    ) {
      throw new SlotTaken();
    }
    row.status = status;
    await writeLocal(rows);
    return toBooking(row);
  }

  const { sql, ready } = database();
  await ready;
  try {
    const found = await sql`UPDATE bookings SET status = ${status} WHERE reference = ${reference} RETURNING *`;
    return found[0] ? toBooking(fromRow(found[0])) : null;
  } catch (error) {
    if (String((error as { code?: string }).code) === "23505") throw new SlotTaken();
    throw error;
  }
}

/** The first day of the month containing `date`, and of the month after. */
export function monthRange(month: string | undefined): { month: string; from: Date; to: Date } {
  const current = saDate().slice(0, 7);
  const chosen = month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : current;
  const [y, m] = chosen.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return {
    month: chosen,
    from: new Date(`${chosen}-01T00:00:00${OFFSET}`),
    to: new Date(`${next}-01T00:00:00${OFFSET}`),
  };
}

/** How many sessions each partner has sent: upcoming (live) and all time. */
export async function partnerCounts(): Promise<Record<string, { upcoming: number; total: number }>> {
  const now = new Date();
  const counts: Record<string, { upcoming: number; total: number }> = {};
  const add = (partner: string, upcoming: number, total: number) => {
    if (partner) counts[partner] = { upcoming, total };
  };
  if (useLocalFile()) {
    const rows = await readLocal();
    for (const partner of new Set(rows.map((r) => r.partner))) {
      const mine = rows.filter((r) => r.partner === partner);
      add(
        partner,
        mine.filter((r) => LIVE.includes(r.status) && new Date(r.starts_at) >= now).length,
        mine.length,
      );
    }
    return counts;
  }
  const { sql, ready } = database();
  await ready;
  const rows = await sql`
    SELECT partner,
      count(*) FILTER (WHERE status IN ('requested', 'confirmed') AND starts_at >= ${now.toISOString()})::int AS upcoming,
      count(*)::int AS total
    FROM bookings WHERE partner <> '' GROUP BY partner`;
  for (const r of rows) add(String(r.partner), Number(r.upcoming), Number(r.total));
  return counts;
}
