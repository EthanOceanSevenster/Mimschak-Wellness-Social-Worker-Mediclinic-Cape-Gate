"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FIELD =
  "w-full rounded border px-4 py-3 text-base outline-none transition-colors focus:border-[var(--brand)]";

export function AuthForm({
  next,
  initialTab,
}: {
  next: string | null;
  initialTab: "signin" | "register";
}) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const endpoint = tab === "signin" ? "/api/auth/login" : "/api/auth/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "That did not work. Please try again.");
        return;
      }
      // Server components read the new cookie on the next render, so refresh
      // before navigating or the destination renders as signed out.
      router.refresh();
      // An explicit ?next wins; otherwise the practice goes to the diary and
      // everyone else to their own sessions.
      router.push(next ?? (body.owner ? "/manage" : "/bookings"));
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border p-8" style={{ background: "var(--surface)" }}>
      <div className="flex gap-2" role="tablist">
        {(["signin", "register"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={tab === value}
            onClick={() => {
              setTab(value);
              setError(null);
            }}
            className="rounded-full px-5 py-2.5 text-[0.95rem] font-semibold"
            style={
              tab === value
                ? { background: "var(--btn-bg)", color: "var(--btn-ink)" }
                : { color: "var(--text-soft)" }
            }
          >
            {value === "signin" ? "Sign in" : "Create an account"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-7 grid gap-5">
        {tab === "register" && (
          <label className="grid gap-2">
            <span className="text-[0.95rem] font-medium">Your name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={FIELD}
              autoComplete="name"
            />
          </label>
        )}

        <label className="grid gap-2">
          <span className="text-[0.95rem] font-medium">
            {tab === "signin" ? "Email or username" : "Email"}
          </span>
          {/* Signing in also takes the practice username, so the field is
              plain text there; creating an account still needs an email. */}
          <input
            required
            type={tab === "signin" ? "text" : "email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD}
            autoComplete={tab === "signin" ? "username" : "email"}
            autoCapitalize="none"
            spellCheck={false}
          />
          {tab === "register" && (
            <span className="text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
              Use the same address you booked with and your existing sessions will appear.
            </span>
          )}
        </label>

        <label className="grid gap-2">
          <span className="text-[0.95rem] font-medium">Password</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={FIELD}
            autoComplete={tab === "signin" ? "current-password" : "new-password"}
            minLength={tab === "register" ? 10 : undefined}
          />
          {tab === "register" && (
            <span className="text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
              At least 10 characters.
            </span>
          )}
        </label>

        {error && (
          <p
            role="alert"
            className="rounded border px-4 py-3"
            style={{ borderColor: "#b42318", color: "#b42318" }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-full px-8 py-4 font-semibold disabled:opacity-60"
          style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
        >
          {busy ? "One moment…" : tab === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
