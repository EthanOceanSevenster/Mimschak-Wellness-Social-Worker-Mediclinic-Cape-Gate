/**
 * Builds Mimshack-Wellness-Brochure.pdf from brochure.html.
 *
 *   node docs/brochure/build.cjs [output.pdf]     (run from the next/ folder)
 *
 * Prints the page with the installed Microsoft Edge through Playwright, so
 * nothing extra has to be downloaded. Needs an internet connection for the
 * Google Fonts; it waits for them, so the PDF never falls back to Arial.
 */
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(path.join(__dirname, "..", "..", "node_modules", "playwright"));

const source = path.join(__dirname, "brochure.html");
const output = path.resolve(process.argv[2] ?? path.join(__dirname, "Mimshack-Wellness-Brochure.pdf"));

(async () => {
  const browser = await chromium.launch({ channel: "msedge" });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(source).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const missing = await page.evaluate(() =>
    ["Fraunces", "Inter"].filter((family) => !document.fonts.check(`12px "${family}"`)),
  );
  if (missing.length) throw new Error(`Fonts did not load: ${missing.join(", ")}. Check the internet connection.`);

  await page.pdf({ path: output, preferCSSPageSize: true, printBackground: true });
  await browser.close();
  console.log("Wrote", output);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
