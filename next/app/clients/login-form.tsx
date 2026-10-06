"use client";

import { useState } from "react";

const FIELD =
  "w-full rounded border px-4 py-3 text-base outline-none transition-colors focus:border-[var(--brand)]";

/**
 * Posts as a normal HTML form to /api/clients/login. This component only adds
 * the show-password toggle, so signing in still works if JavaScript fails.
 */
export function ClientsLoginForm({ failed }: { failed: boolean }) {
  const [show, setShow] = useState(false);

  return (
    <form
      action="/api/clients/login"
      method="post"
      className="grid gap-5 rounded-lg border p-8"
      style={{ background: "var(--surface)" }}
    >
      <div>
        <h2 className="text-xl">Practice sign-in</h2>
        <p className="mt-2 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
          This page lists the client forms that have been submitted. Only the practice can open it.
        </p>
        <p className="mt-2 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
          Already signed in at{" "}
          <a href="/login" className="underline underline-offset-4">
            /login
          </a>
          ? That sign-in opens this page too, alongside the Diary &mdash; no separate password
          needed. Use the fields below only if that is not working yet.
        </p>
      </div>

      {failed && (
        <p
          role="alert"
          className="rounded border px-4 py-3 text-[0.95rem]"
          style={{ borderColor: "#b42318", color: "#b42318" }}
        >
          The username or password is incorrect. Check for typing mistakes and try again. The
          password is case-sensitive.
        </p>
      )}

      <label className="grid gap-2">
        <span className="text-[0.95rem] font-medium">Username</span>
        <input
          name="username"
          required
          autoFocus
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className={FIELD}
          style={{ background: "var(--surface)" }}
        />
      </label>

      {/* The Show button sits outside the <label>, or its text would become
          part of the field's name ("Password Show") for screen readers. */}
      <div className="grid gap-2">
        <label htmlFor="clients-password" className="text-[0.95rem] font-medium">
          Password
        </label>
        <div className="flex gap-2">
          <input
            id="clients-password"
            name="password"
            type={show ? "text" : "password"}
            required
            autoComplete="current-password"
            autoCapitalize="none"
            spellCheck={false}
            className={FIELD}
            style={{ background: "var(--surface)" }}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-pressed={show}
            aria-controls="clients-password"
            className="shrink-0 rounded border px-4 text-[0.9rem] font-semibold transition-colors hover:border-[var(--brand)]"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div>
        <button
          type="submit"
          className="rounded-full px-7 py-3.5 font-semibold"
          style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
        >
          Sign in
        </button>
      </div>
    </form>
  );
}
