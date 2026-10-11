import Link from "next/link";

import { saDate, TIME_ZONE } from "@/lib/bookings";
import type { Booking } from "@/lib/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Colour per status, matching the pills on each session below. */
const TONE: Record<string, { color: string; background: string }> = {
  requested: { color: "#8a5a00", background: "#fdf3e0" },
  confirmed: { color: "#1a5c34", background: "#e6f4ec" },
  cancelled: { color: "#8a2b25", background: "#fbeceb" },
  completed: { color: "#3a4a58", background: "#eef2f6" },
  no_show: { color: "#8a2b25", background: "#fbeceb" },
};

const CLOCK = new Intl.DateTimeFormat("en-ZA", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function shift(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + by;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/**
 * A month of sessions, Monday first. Each session links down to its full
 * card, where it can be confirmed or cancelled. On a phone the cells are too
 * narrow for names, so each day shows how many sessions it has instead.
 */
export function MonthCalendar({
  month,
  bookings,
  status,
}: {
  month: string;
  bookings: Booking[];
  status?: string;
}) {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  // getUTCDay: Sunday 0. Shift so Monday is the first column.
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const today = saDate();

  const byDay = new Map<string, Booking[]>();
  for (const b of [...bookings].sort((a, c) => a.starts_at.localeCompare(c.starts_at))) {
    const day = saDate(new Date(b.starts_at));
    byDay.set(day, [...(byDay.get(day) ?? []), b]);
  }

  const title = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const link = (to: string) => `/manage?month=${to}${status ? `&status=${status}` : ""}#sessions`;

  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7) cells.push(null);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl">{title}</h3>
        <div className="flex gap-2">
          <Link
            href={link(shift(month, -1))}
            className="rounded-full border px-4 py-2 text-[0.95rem] font-semibold"
            style={{ borderColor: "var(--line)" }}
            aria-label="Previous month"
          >
            &larr; Prev
          </Link>
          <Link
            href={link(today.slice(0, 7))}
            className="rounded-full border px-4 py-2 text-[0.95rem] font-semibold"
            style={{ borderColor: "var(--line)" }}
          >
            Today
          </Link>
          <Link
            href={link(shift(month, 1))}
            className="rounded-full border px-4 py-2 text-[0.95rem] font-semibold"
            style={{ borderColor: "var(--line)" }}
            aria-label="Next month"
          >
            Next &rarr;
          </Link>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border" style={{ background: "var(--surface)" }}>
        <div className="grid grid-cols-7 border-b text-center" style={{ background: "var(--tint)" }}>
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="py-2 text-[0.75rem] font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-soft)" }}
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const sessions = day ? (byDay.get(day) ?? []) : [];
            const isToday = day === today;
            const weekend = i % 7 >= 5;
            return (
              <div
                key={day ?? `blank-${i}`}
                className="min-h-[3.5rem] border-b border-r p-1 sm:min-h-[6.5rem] sm:p-1.5"
                style={{
                  borderColor: "var(--line)",
                  background: !day ? "var(--bg-soft)" : weekend ? "var(--bg-soft)" : undefined,
                }}
              >
                {day && (
                  <>
                    <span
                      className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[0.8rem] font-semibold"
                      style={
                        isToday
                          ? { background: "var(--btn-bg)", color: "var(--btn-ink)" }
                          : { color: "var(--text-soft)" }
                      }
                    >
                      {Number(day.slice(8))}
                    </span>

                    {sessions.length > 0 && (
                      <>
                        {/* Phone: a count. */}
                        <a
                          href={`#booking-${sessions[0].reference}`}
                          className="mt-1 block rounded px-1 text-center text-[0.75rem] font-semibold sm:hidden"
                          style={TONE[sessions[0].status] ?? TONE.completed}
                        >
                          {sessions.length}
                        </a>
                        {/* Wider: each session's time and name. */}
                        <ul className="mt-1 hidden list-none gap-1 sm:grid">
                          {sessions.map((b) => (
                            <li key={b.reference}>
                              <a
                                href={`#booking-${b.reference}`}
                                className="block truncate rounded px-1.5 py-0.5 text-[0.75rem] font-medium hover:underline"
                                style={{
                                  ...(TONE[b.status] ?? TONE.completed),
                                  textDecoration: b.status === "cancelled" ? "line-through" : undefined,
                                }}
                                title={`${CLOCK.format(new Date(b.starts_at))} ${b.full_name}, ${b.service}, ${b.status_label}`}
                              >
                                {CLOCK.format(new Date(b.starts_at))} {b.full_name.split(" ")[0]}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ul className="mt-3 flex list-none flex-wrap gap-x-5 gap-y-2 text-[0.85rem]" style={{ color: "var(--text-soft)" }}>
        {[
          ["requested", "Awaiting you"],
          ["confirmed", "Confirmed"],
          ["completed", "Done"],
          ["cancelled", "Cancelled"],
        ].map(([key, label]) => (
          <li key={key} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-3 w-3 rounded" style={{ background: TONE[key].background, border: `1px solid ${TONE[key].color}` }} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
