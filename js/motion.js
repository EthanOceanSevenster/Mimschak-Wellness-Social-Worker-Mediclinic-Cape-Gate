/* ===========================================================================
   Mimschak Wellness — motion behaviour
   ---------------------------------------------------------------------------
   Vanilla, no dependencies. The site already ships Bootstrap and tiny-slider;
   adding an animation library for what amounts to one IntersectionObserver
   would be weight this audience pays for on a phone, on mobile data.

   Everything here is progressive: with JavaScript off, css/motion.css shows
   all content in its final state via the .no-js rule set below.
   =========================================================================== */
(function () {
  "use strict";

  // Flip .no-js off immediately so revealed content stays hidden until observed.
  // If this script fails to load at all, the class stays and everything shows.
  document.documentElement.classList.remove("no-js");

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  /* ------------------------------------------------------------- reveals */
  function setupReveals() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    // Reduced motion, or a browser without IntersectionObserver: show it all.
    if (prefersReduced.matches || !("IntersectionObserver" in window)) {
      for (var i = 0; i < items.length; i++) items[i].classList.add("is-visible");
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          // Once only. Re-animating on every scroll past is distracting.
          observer.unobserve(entry.target);
        });
      },
      // Fires a little before the element reaches the viewport, so the
      // movement has finished by the time it is actually being read.
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    for (var j = 0; j < items.length; j++) observer.observe(items[j]);
  }

  /* ---------------------------------------------- stagger sibling groups */
  // Cards in a row arrive one after another rather than all at once.
  function setupStagger() {
    var groups = document.querySelectorAll("[data-reveal-group]");
    for (var g = 0; g < groups.length; g++) {
      var children = groups[g].querySelectorAll("[data-reveal]");
      for (var c = 0; c < children.length; c++) {
        // Capped so a long list never leaves the reader waiting.
        children[c].style.setProperty("--reveal-delay", Math.min(c * 80, 400) + "ms");
      }
    }
  }

  /* -------------------------------------------------------------- header */
  function setupHeader() {
    var nav = document.querySelector(".custom-navbar");
    if (!nav) return;

    var ticking = false;
    function update() {
      nav.classList.toggle("is-scrolled", window.scrollY > 40);
      ticking = false;
    }
    update();

    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );
  }

  /* -------------------------------------------------------- back to top */
  function setupBackToTop() {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "mw-to-top";
    button.setAttribute("aria-label", "Back to top");
    button.innerHTML = '<i class="fas fa-arrow-up" aria-hidden="true"></i>';
    document.body.appendChild(button);

    button.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: prefersReduced.matches ? "auto" : "smooth"
      });
      // Send focus somewhere sensible rather than leaving it on a button
      // that has just scrolled out of the reader's context.
      var first = document.querySelector("h1, main, .custom-navbar");
      if (first) {
        first.setAttribute("tabindex", "-1");
        first.focus({ preventScroll: true });
      }
    });

    var ticking = false;
    function update() {
      button.classList.toggle("is-shown", window.scrollY > 500);
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );
  }

  /* --------------------------------------------------------- skip link */
  function setupSkipLink() {
    if (document.querySelector(".mw-skip-link")) return;
    var link = document.createElement("a");
    link.className = "mw-skip-link";
    link.href = "#mw-main";
    link.textContent = "Skip to content";
    document.body.insertBefore(link, document.body.firstChild);

    // Give it something to land on if the page has no main landmark.
    if (!document.getElementById("mw-main")) {
      var target =
        document.querySelector(".hero") ||
        document.querySelector("main") ||
        document.querySelector(".custom-navbar + *");
      if (target) target.id = "mw-main";
    }
  }

  onReady(function () {
    setupStagger();
    setupReveals();
    setupHeader();
    setupBackToTop();
    setupSkipLink();
  });
})();
