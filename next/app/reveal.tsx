"use client";

import { useEffect } from "react";

/**
 * Adds .shown to anything carrying .reveal once it scrolls into view, then
 * stops watching it. One observer for the whole page rather than a component
 * per element.
 *
 * If the observer is unavailable, or the visitor has asked for reduced
 * motion, everything is shown immediately — the CSS starts elements hidden,
 * so failing to run must never leave the page blank.
 */
export function Reveal() {
  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (!items.length) return;

    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      // Never add .js here: the CSS should not hide anything at all.
      items.forEach((el) => el.classList.add("shown"));
      return;
    }

    // Opting in to the hidden state only now proves JS is alive.
    root.classList.add("js");

    // Backstop. If anything is still hidden after a few seconds — an observer
    // that never fired, a section that cannot be scrolled to — show it. An
    // invisible paragraph is a far worse failure than a missed animation.
    const backstop = window.setTimeout(() => {
      items.forEach((el) => el.classList.add("shown"));
    }, 3000);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("shown");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    items.forEach((el) => observer.observe(el));
    return () => {
      window.clearTimeout(backstop);
      observer.disconnect();
    };
  }, []);

  return null;
}
