/** Shared by the entries list (/clients) and a client's own page (/clients/[id]). */

export const LEGEND = "text-xs font-semibold uppercase tracking-[0.18em]";

export const BUTTON =
  "inline-flex items-center rounded-full px-4 py-2 text-[0.9rem] font-semibold transition-colors";

// Vercel runs in UTC; the practice reads times in South African time.
export const WHEN = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Johannesburg",
});

export const DAY = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeZone: "Africa/Johannesburg",
});

/** "100 000", the South African way. */
export const COUNT = new Intl.NumberFormat("en-ZA");

/** 082 123 4567 → 27821234567, the form wa.me expects. */
export function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
}
