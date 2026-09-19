/**
 * Screenshot the home page so the layout can actually be looked at rather
 * than reasoned about. Captures desktop and mobile, light and dark, plus a
 * full-page shot of each, and reports anything obviously broken:
 * horizontal overflow, elements stuck invisible, and console errors.
 *
 *   node shots.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.URL ?? "http://127.0.0.1:3001/";
const ORIGIN = URL.split("/").slice(0, 3).join("/");
const OUT = "shots";
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1180, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];
const SCHEMES = ["light", "dark"];


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
const problems = [];

for (const scheme of SCHEMES) {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: scheme,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    // scroll-behavior:smooth makes scripted scrolling lag behind the loop,
    // so captures ran before lower sections ever entered the viewport.
    await page.addStyleTag({ content: "html{scroll-behavior:auto !important}" }).catch(() => {});

    const consoleErrors = [];
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
    page.on("pageerror", (e) => consoleErrors.push(String(e)));

    await signIn(page, ORIGIN);
    const response = await page.goto(URL, { waitUntil: "networkidle" });
    if (!response || !response.ok()) problems.push(`${scheme}/${vp.name}: page returned ${response?.status()}`);

    // Scroll the whole page so every IntersectionObserver reveal fires,
    // otherwise the full-page shot is full of invisible sections.
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let y = 0;
        const step = () => {
          window.scrollBy(0, 400);
          y += 400;
          if (y < document.body.scrollHeight + 1000) setTimeout(step, 40);
          else resolve();
        };
        step();
      });
    });
    await page.waitForTimeout(3500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const tag = `${vp.name}-${scheme}`;
    await page.screenshot({ path: `${OUT}/${tag}-top.png` });
    await page.screenshot({ path: `${OUT}/${tag}-full.png`, fullPage: true });

    // --- automated checks -------------------------------------------------
    const report = await page.evaluate(() => {
      const out = { overflow: null, hidden: [], tiny: [], contrastRisk: [] };

      if (document.documentElement.scrollWidth > window.innerWidth + 1) {
        const offenders = [];
        document.querySelectorAll("*").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.right > window.innerWidth + 1 && r.width > 0) {
            offenders.push(
              `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).split(" ")[0] : ""} (right ${Math.round(r.right)})`,
            );
          }
        });
        out.overflow = {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          offenders: offenders.slice(0, 6),
        };
      }

      // Reveal elements that never became visible
      document.querySelectorAll(".reveal").forEach((el) => {
        if (getComputedStyle(el).opacity === "0") {
          out.hidden.push(el.tagName.toLowerCase() + " " + (el.textContent || "").trim().slice(0, 40));
        }
      });

      // Body copy below 15px is a readability problem on this kind of site
      document.querySelectorAll("p, li, a, dd").forEach((el) => {
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size && size < 15 && (el.textContent || "").trim().length > 20) {
          out.tiny.push(`${Math.round(size)}px — ${(el.textContent || "").trim().slice(0, 40)}`);
        }
      });

      return out;
    });

    if (report.overflow) {
      problems.push(
        `${tag}: horizontal overflow ${report.overflow.scrollWidth}px > ${report.overflow.innerWidth}px — ${report.overflow.offenders.join("; ")}`,
      );
    }
    if (report.hidden.length) problems.push(`${tag}: ${report.hidden.length} reveal element(s) stuck invisible`);
    if (report.tiny.length) problems.push(`${tag}: text under 15px — ${[...new Set(report.tiny)].slice(0, 3).join(" | ")}`);
    if (consoleErrors.length) problems.push(`${tag}: console — ${[...new Set(consoleErrors)].slice(0, 3).join(" | ")}`);

    const h = await page.evaluate(() => document.body.scrollHeight);
    console.log(`  ${tag.padEnd(16)} ok   page height ${h}px`);

    await context.close();
  }
}

await browser.close();

console.log("");
if (problems.length) {
  console.log("PROBLEMS:");
  problems.forEach((p) => console.log("  - " + p));
} else {
  console.log("No layout problems detected.");
}
