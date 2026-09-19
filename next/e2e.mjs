/**
 * End-to-end: book -> register -> see it -> owner confirms it.
 *
 *   node e2e.mjs
 *
 * Drives the real site against the real API, so it leaves real rows behind —
 * a booking and a patient account per run. Fine against the dev SQLite
 * database; do not point it at anything else.
 */
import { chromium } from "playwright";

const SITE = "http://127.0.0.1:3001";
const stamp = Date.now();
const patient = { email: `thandi.${stamp}@example.co.za`, password: "a-long-password-77" };
const owner = { email: "phakama@mimschakwellness.com", password: "mimschak-owner-2026" };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

// ---------------------------------------------------------------- 1. book
await page.goto(`${SITE}/book`, { waitUntil: "networkidle" });
await page.screenshot({ path: "shots/flow-1-book.png", fullPage: true });

const services = await page.locator('input[name="service"]').count();
const dayButtons = await page.locator('button[aria-pressed]').count();
console.log(`  form: ${services} services, ${dayButtons} day/slot buttons`);
if (services === 0) throw new Error("booking form did not render services");

// pick the first day, then the first time
await page.locator('button[aria-pressed]').first().click();
await page.waitForTimeout(250);
const times = page.locator('form fieldset').nth(1).locator('button[aria-pressed]');
const timeCount = await times.count();
// day chips come first in that fieldset; the time chips are the round ones
await times.last().click();

await page.fill('input[autocomplete="name"]', "Thandi Mokoena");
await page.fill('input[autocomplete="tel"]', "082 123 4567");
await page.fill('input[autocomplete="email"]', patient.email);
await page.fill("textarea", "First time, feeling anxious.");
await page.screenshot({ path: "shots/flow-2-filled.png", fullPage: true });

await page.click('button[type="submit"]');
await page.waitForSelector("text=Your session is held", { timeout: 15000 });
const reference = (await page.locator("strong").first().textContent())?.trim();
const waHref = await page.locator('a:has-text("Send on WhatsApp")').getAttribute("href");
console.log(`  booked ${reference}`);
console.log(`  whatsapp: ${decodeURIComponent(waHref).slice(0, 110).replace(/\n/g, " | ")}`);
await page.screenshot({ path: "shots/flow-3-confirmed.png", fullPage: true });

// ------------------------------------------------------------ 2. register
await page.goto(`${SITE}/login?tab=register`, { waitUntil: "networkidle" });
await page.fill('input[autocomplete="name"]', "Thandi Mokoena");
await page.fill('input[type="email"]', patient.email);
await page.fill('input[type="password"]', patient.password);
await page.click('button[type="submit"]');
await page.waitForURL("**/bookings", { timeout: 15000 });
await page.waitForLoadState("networkidle");

const mine = await page.locator("article").count();
const seesRef = await page.locator(`text=${reference}`).count();
console.log(`  after registering: ${mine} booking card(s), reference visible: ${seesRef > 0}`);
await page.screenshot({ path: "shots/flow-4-mine.png", fullPage: true });

// patient must not get the diary
await page.goto(`${SITE}/manage`, { waitUntil: "networkidle" });
const blocked = await page.locator("text=Not your diary").count();
console.log(`  patient blocked from /manage: ${blocked > 0}`);
await page.screenshot({ path: "shots/flow-5-blocked.png" });

// --------------------------------------------------------------- 3. owner
const octx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const opage = await octx.newPage();
opage.on("pageerror", (e) => errors.push(String(e)));
await opage.goto(`${SITE}/login`, { waitUntil: "networkidle" });
await opage.fill('input[type="email"]', owner.email);
await opage.fill('input[type="password"]', owner.password);
await opage.click('button[type="submit"]');
await opage.waitForURL("**/manage", { timeout: 15000 });
await opage.waitForLoadState("networkidle");

const rows = await opage.locator("article").count();
const ownerSees = await opage.locator(`text=${reference}`).count();
console.log(`  owner diary: ${rows} row(s), sees ${reference}: ${ownerSees > 0}`);
await opage.screenshot({ path: "shots/flow-6-diary.png", fullPage: true });

await opage.locator(`article:has-text("${reference}") button:has-text("Confirm")`).click();
// Wait for the pill rather than a fixed pause — router.refresh() is not instant.
await opage.waitForSelector(`article:has-text("${reference}") >> text=CONFIRMED`, { timeout: 15000 });
console.log("  after Confirm: Confirmed");
await opage.screenshot({ path: "shots/flow-7-confirmed.png", fullPage: true });

console.log(errors.length ? `\n  console errors: ${[...new Set(errors)].slice(0, 5).join(" | ")}` : "\n  no console errors");
await browser.close();
