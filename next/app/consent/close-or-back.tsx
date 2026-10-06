"use client";

/**
 * "Back to the form". The form opens this page in a new tab, so closing the
 * tab returns the client to their half-filled form exactly as they left it.
 * Opened any other way, it goes back, or to the form if there is no history.
 */
export function CloseOrBack() {
  function back() {
    if (window.opener && !window.opener.closed) {
      window.close();
      return;
    }
    if (window.history.length > 1) window.history.back();
    else window.location.href = "/form";
  }

  return (
    <button
      type="button"
      onClick={back}
      className="rounded-full px-7 py-3.5 font-semibold"
      style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
    >
      Back to the form
    </button>
  );
}
