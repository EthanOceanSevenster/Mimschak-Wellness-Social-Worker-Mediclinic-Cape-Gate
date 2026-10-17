"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { DiaryDay } from "@/lib/types";

const SA = "Africa/Johannesburg";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function at(iso: string) {
  return new Date(`${iso}T12:00:00+02:00`);
}

function longDay(iso: string) {
  return at(iso).toLocaleDateString("en-ZA", { timeZone: SA, weekday: "long", day: "numeric", month: "long" });
}

type Props = {
  days: DiaryDay[];
  date: string;
  time: string;
  onChange: (date: string, time: string) => void;
};

/**
 * A field that opens a calendar in a popup: pick a date, then pick a time on
 * that date, and the popup closes. Only days with free times can be chosen.
 */
export function DateTimePicker({ days, date, time, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(date);
  const free = useMemo(() => new Map(days.filter((d) => d.slots.length).map((d) => [d.date, d.slots])), [days]);

  // The months the diary covers, so the popup can page between them.
  const months = useMemo(() => [...new Set(days.map((d) => d.date.slice(0, 7)))], [days]);
  const [month, setMonth] = useState(months[0] ?? "");

  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  function show() {
    setPicked(date);
    setMonth(date ? date.slice(0, 7) : (months.find((m) => [...free.keys()].some((d) => d.startsWith(m))) ?? months[0]));
    setOpen(true);
  }

  function close() {
    setOpen(false);
    opener.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
    // close() only touches refs and state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // The month as rows of seven, Monday first.
  const [y, m] = (month || "2000-01").split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7) cells.push(null);
  const monthIndex = months.indexOf(month);

  const label = date && time ? `${longDay(date)} at ${time}` : "";

  return (
    <>
      <button
        ref={opener}
        type="button"
        onClick={show}
        className="flex w-full items-center justify-between gap-4 rounded border px-4 py-3 text-left text-base transition-colors hover:border-[var(--brand)]"
        style={{ background: "var(--surface)" }}
        aria-haspopup="dialog"
      >
        <span style={label ? undefined : { color: "var(--text-soft)" }}>
          {label || "Choose a date and time"}
        </span>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" style={{ color: "var(--brand)" }}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1000] flex items-end justify-center p-0 sm:items-center sm:p-6"
          style={{ background: "rgb(15 23 32 / 0.55)" }}
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={picked ? "Choose a time" : "Choose a date"}
            tabIndex={-1}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl p-5 outline-none sm:max-w-md sm:rounded-2xl sm:p-6"
            style={{ background: "var(--surface)", boxShadow: "0 24px 60px -20px rgb(0 0 0 / 0.45)" }}
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl">{picked ? "Choose a time" : "Choose a date"}</h3>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full border text-lg"
              >
                &times;
              </button>
            </div>

            {!picked ? (
              <>
                <div className="mt-5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setMonth(months[monthIndex - 1])}
                    disabled={monthIndex <= 0}
                    aria-label="Previous month"
                    className="flex h-9 w-9 items-center justify-center rounded-full border disabled:opacity-30"
                  >
                    &lsaquo;
                  </button>
                  {/* Month and year pickers, as on a normal calendar. */}
                  <span className="flex items-center gap-2">
                    <select
                      aria-label="Month"
                      value={month.slice(5, 7)}
                      onChange={(e) => setMonth(`${month.slice(0, 4)}-${e.target.value}`)}
                      className="rounded border px-2 py-1.5 text-[0.95rem] font-semibold"
                      style={{ background: "var(--surface)" }}
                    >
                      {MONTHS.map((name, i) => {
                        const mm = String(i + 1).padStart(2, "0");
                        return (
                          <option key={mm} value={mm} disabled={!months.includes(`${month.slice(0, 4)}-${mm}`)}>
                            {name}
                          </option>
                        );
                      })}
                    </select>
                    <select
                      aria-label="Year"
                      value={month.slice(0, 4)}
                      onChange={(e) => setMonth(months.find((m) => m.startsWith(e.target.value)) ?? month)}
                      className="rounded border px-2 py-1.5 text-[0.95rem] font-semibold"
                      style={{ background: "var(--surface)" }}
                    >
                      {[...new Set(months.map((m) => m.slice(0, 4)))].map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMonth(months[monthIndex + 1])}
                    disabled={monthIndex >= months.length - 1}
                    aria-label="Next month"
                    className="flex h-9 w-9 items-center justify-center rounded-full border disabled:opacity-30"
                  >
                    &rsaquo;
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-7 text-center">
                  {WEEKDAYS.map((d) => (
                    <span
                      key={d}
                      className="pb-2 text-[0.75rem] font-semibold uppercase"
                      style={{ color: "var(--text-soft)" }}
                    >
                      {d}
                    </span>
                  ))}
                  {cells.map((day, i) => {
                    if (!day) return <span key={`gap-${i}`} />;
                    const open = free.has(day);
                    const chosen = day === date;
                    return (
                      <span key={day} className="flex justify-center p-0.5">
                        <button
                          type="button"
                          disabled={!open}
                          onClick={() => setPicked(day)}
                          aria-label={open ? `${longDay(day)}, ${free.get(day)!.length} times free` : longDay(day)}
                          className="flex h-11 w-11 items-center justify-center rounded-full text-[0.95rem] font-semibold transition-colors enabled:hover:bg-[var(--tint)] disabled:font-normal"
                          style={
                            chosen
                              ? { background: "var(--btn-bg)", color: "var(--btn-ink)" }
                              : open
                                ? { color: "var(--text)", boxShadow: "inset 0 0 0 1.5px var(--brand)" }
                                : { color: "var(--text-soft)", opacity: 0.4 }
                          }
                        >
                          {Number(day.slice(8))}
                        </button>
                      </span>
                    );
                  })}
                </div>
                <p className="mt-4 text-[0.9rem]" style={{ color: "var(--text-soft)" }}>
                  Circled days have times free.
                </p>
              </>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold">{longDay(picked)}</p>
                  <button
                    type="button"
                    onClick={() => setPicked("")}
                    className="rounded-full border px-4 py-1.5 text-[0.9rem] font-semibold"
                  >
                    &larr; Change date
                  </button>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2.5">
                  {(free.get(picked) ?? []).map((t) => {
                    const chosen = picked === date && t === time;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          onChange(picked, t);
                          close();
                        }}
                        className="rounded-lg border px-3 py-3 text-[0.95rem] font-semibold transition-colors hover:border-[var(--brand)]"
                        style={chosen ? { borderColor: "var(--brand)", background: "var(--tint)" } : undefined}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
