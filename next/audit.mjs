/**
 * Contrast audit. Walks every text node, resolves the colour it actually
 * renders in and the background actually behind it, and computes the WCAG
 * ratio — rather than trusting that the tokens were chosen well.
 *
 *   node audit.mjs
 *
 * Thresholds are WCAG AA: 4.5:1 for body text, 3:1 for large text
 * (>=24px, or >=18.66px when bold).
 */
import { chromium } from "playwright";

const URL = process.env.URL ?? "http://127.0.0.1:3001/";
const ORIGIN = URL.split("/").slice(0, 3).join("/");

/**
 * Optional sign-in, so pages behind a login can be measured too:
 *
 *   EMAIL=someone@example.com PASSWORD=... URL=http://127.0.0.1:3001/bookings node <script>
 *
 * Without EMAIL set this does nothing and every page is visited signed out.
 */
const SIGN_IN = process.env.EMAIL
  ? { email: process.env.EMAIL, password: process.env.PASSWORD ?? "" }
  : null;

async function signIn(page, origin) {
  if (!SIGN_IN) return;
  await page.goto(origin + "/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', SIGN_IN.email);
  await page.fill('input[type="password"]', SIGN_IN.password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
}
const browser = await chromium.launch();
let failures = 0;

for (const scheme of ["light", "dark"]) {
  const page = await (await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: scheme,
  })).newPage();

  await page.addStyleTag({ content: "html{scroll-behavior:auto !important}" }).catch(() => {});
  await signIn(page, ORIGIN);
  await page.goto(URL, { waitUntil: "networkidle" });
  // Let every reveal finish so nothing is measured at opacity 0.
  await page.evaluate(() => document.querySelectorAll(".reveal").forEach((e) => e.classList.add("shown")));
  await page.waitForTimeout(800);

  const results = await page.evaluate(() => {
    // Tailwind's /90 opacity utilities compute to oklab(), which a naive
    // "grab the numbers" regex reads as r=0.99 g=0.00 b=0.00 — garbage. The
    // canvas normalises any colour syntax the browser understands back to
    // rgb()/rgba(), so this works for oklab, color-mix, hsl and the rest.
    const probe = document.createElement("canvas").getContext("2d");
    const parse = (c) => {
      if (!c || c === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
      let s = c;
      if (!/^rgba?\(/.test(s)) {
        probe.fillStyle = "#000";
        probe.fillStyle = s;
        s = probe.fillStyle;
      }
      if (/^#/.test(s)) {
        const h = s.slice(1);
        const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
        return {
          r: parseInt(full.slice(0, 2), 16),
          g: parseInt(full.slice(2, 4), 16),
          b: parseInt(full.slice(4, 6), 16),
          a: 1,
        };
      }
      const m = s.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\)/);
      if (!m) return null;
      return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a, b) => {
      const l1 = lum(a), l2 = lum(b);
      const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
      return (hi + 0.05) / (lo + 0.05);
    };
    const hex2rgb = (hex) => ({
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
      a: 1,
    });
    // Walk outwards and take the FIRST thing that settles what is behind the
    // text: an opaque background, or a data-audit-bg declaration.
    //
    // Checking data-audit-bg first was wrong. A filled button inside the hero
    // got measured against the video rather than against its own background,
    // and reported a failure that was not there.
    const bgOf = (el) => {
      let node = el;
      while (node && node !== document.documentElement) {
        const bg = parse(getComputedStyle(node).backgroundColor);
        if (bg && bg.a >= 0.95) return bg;
        // An absolutely-positioned scrim or a video is not an ancestor
        // background, so the walk cannot see it. This declares what is there.
        const declared = node.getAttribute && node.getAttribute("data-audit-bg");
        if (declared) return hex2rgb(declared);
        node = node.parentElement;
      }
      return parse(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 };
    };

    const rows = [];
    const seen = new Set();
    document.querySelectorAll("h1,h2,h3,h4,p,li,a,span,dd,dt,blockquote,figcaption,button").forEach((el) => {
      const text = (el.textContent || "").trim();
      if (!text || text.length < 3) return;
      if (el.querySelector("h1,h2,h3,h4,p,li,a,blockquote")) return; // containers only
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;

      const fg = parse(cs.color);
      if (!fg) return;
      const bg = bgOf(el);
      // Flatten a translucent foreground onto its background first.
      const flat = fg.a >= 1 ? fg : {
        r: fg.r * fg.a + bg.r * (1 - fg.a),
        g: fg.g * fg.a + bg.g * (1 - fg.a),
        b: fg.b * fg.a + bg.b * (1 - fg.a),
      };

      const size = parseFloat(cs.fontSize);
      const bold = +cs.fontWeight >= 700;
      const large = size >= 24 || (bold && size >= 18.66);
      const need = large ? 3 : 4.5;
      const got = ratio(flat, bg);

      const key = text.slice(0, 30) + cs.color;
      if (seen.has(key)) return;
      seen.add(key);

      if (got < need) {
        rows.push({
          text: text.slice(0, 44),
          got: +got.toFixed(2),
          need,
          size: Math.round(size),
          color: cs.color,
        });
      }
    });
    return rows;
  });

  console.log(`\n  ${scheme.toUpperCase()}`);
  if (!results.length) {
    console.log("    all measured text meets WCAG AA");
  } else {
    failures += results.length;
    results.forEach((r) =>
      console.log(`    FAIL ${String(r.got).padStart(5)}:1 (needs ${r.need}) ${r.size}px — "${r.text}"`),
    );
  }
  await page.close();
}

await browser.close();
console.log(failures ? `\n  ${failures} contrast failure(s)` : "\n  No contrast failures.");
