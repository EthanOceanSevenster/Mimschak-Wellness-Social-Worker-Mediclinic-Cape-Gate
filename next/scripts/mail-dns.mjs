/**
 * Add the Zoho Mail DNS records to mimschakwellness.com, which runs on Vercel DNS.
 *
 *   VERCEL_TOKEN=... node scripts/mail-dns.mjs --list
 *   VERCEL_TOKEN=... node scripts/mail-dns.mjs --phase verify --code zb1234567.zmverify.zoho.com
 *   VERCEL_TOKEN=... node scripts/mail-dns.mjs --phase mail
 *   VERCEL_TOKEN=... node scripts/mail-dns.mjs --phase dkim --selector zoho --key "v=DKIM1; k=rsa; p=MIGf..."
 *
 * Nothing is written without --apply. Run it once to read the plan, then again
 * with --apply. Get the token at vercel.com/account/tokens (scope: the team or
 * account that holds the domain).
 *
 * The phases exist because Zoho hands you the values in that order: it gives
 * the verification string at sign-up, and only generates the DKIM key after
 * the domain is verified. There is no way to do it in one pass.
 */

const API = "https://api.vercel.com";

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1] ?? true;
};
const has = (name) => args.includes(`--${name}`);

const DOMAIN = flag("domain", "mimschakwellness.com");
const TEAM = flag("team", process.env.VERCEL_TEAM_ID);
const TOKEN = process.env.VERCEL_TOKEN;
const APPLY = has("apply");

if (!TOKEN) {
  console.error("Set VERCEL_TOKEN. Create one at https://vercel.com/account/tokens");
  process.exit(1);
}

const qs = TEAM ? `?teamId=${TEAM}` : "";

async function call(path, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status} ${JSON.stringify(body.error ?? body)}`);
  }
  return body;
}

const listRecords = () =>
  call(`/v4/domains/${DOMAIN}/records${qs}`).then((r) => r.records ?? []);

const addRecord = (record) =>
  call(`/v2/domains/${DOMAIN}/records${qs}`, {
    method: "POST",
    body: JSON.stringify(record),
  });

/* ------------------------------------------------------------------ plans */

/**
 * Zoho runs regional datacentres and the MX hosts differ per region. These are
 * the zoho.com (global/US) hosts, which is where a South African sign-up lands
 * by default. If the Zoho console shows mx.zoho.eu or mx.zoho.in instead, pass
 * --region eu or --region in.
 */
const MX_HOSTS = {
  com: ["mx.zoho.com", "mx2.zoho.com", "mx3.zoho.com"],
  eu: ["mx.zoho.eu", "mx2.zoho.eu", "mx3.zoho.eu"],
  in: ["mx.zoho.in", "mx2.zoho.in", "mx3.zoho.in"],
  au: ["mx.zoho.com.au", "mx2.zoho.com.au", "mx3.zoho.com.au"],
};
const SPF_INCLUDE = { com: "zoho.com", eu: "zoho.eu", in: "zoho.in", au: "zoho.com.au" };

function plan() {
  const phase = flag("phase");
  const region = flag("region", "com");
  if (!MX_HOSTS[region]) throw new Error(`Unknown --region ${region}. Use com, eu, in or au.`);

  if (phase === "verify") {
    const code = flag("code");
    if (!code) throw new Error("--phase verify needs --code, the string Zoho shows at sign-up.");
    // Zoho prints it with or without the prefix depending on the screen.
    const value = String(code).startsWith("zoho-verification=") ? code : `zoho-verification=${code}`;
    return [{ type: "TXT", name: "", value, ttl: 3600 }];
  }

  if (phase === "mail") {
    const rows = MX_HOSTS[region].map((host, i) => ({
      type: "MX",
      name: "",
      value: host,
      mxPriority: [10, 20, 50][i],
      ttl: 3600,
    }));
    rows.push({
      type: "TXT",
      name: "",
      value: `v=spf1 include:${SPF_INCLUDE[region]} ~all`,
      ttl: 3600,
    });
    rows.push({
      type: "TXT",
      name: "_dmarc",
      // p=none first. Going straight to quarantine or reject before you have
      // seen a week of reports is how legitimate mail starts disappearing.
      value: "v=DMARC1; p=none; rua=mailto:postmaster@" + DOMAIN,
      ttl: 3600,
    });
    return rows;
  }

  if (phase === "dkim") {
    const selector = flag("selector", "zoho");
    const key = flag("key");
    if (!key) throw new Error('--phase dkim needs --key, the "v=DKIM1; k=rsa; p=..." value from Zoho.');
    return [{ type: "TXT", name: `${selector}._domainkey`, value: String(key), ttl: 3600 }];
  }

  throw new Error("Use --list, or --phase verify | mail | dkim");
}

/* ------------------------------------------------------------------- main */

// Everything below can fail on a bad token, a domain on another team, or a
// missing flag. A stack trace helps nobody standing at a DNS panel.
try {
  await main();
} catch (error) {
  console.error("");
  console.error("  " + error.message);
  if (String(error.message).startsWith("403")) {
    console.error("  That token cannot see " + DOMAIN + ".");
    console.error("  If the domain belongs to a team, pass --team <teamId>.");
  }
  console.error("");
  process.exit(1);
}

async function main() {
const existing = await listRecords();

if (has("list") || !flag("phase")) {
  console.log(`\n  ${DOMAIN} — ${existing.length} record(s)\n`);
  for (const r of existing) {
    const name = r.name || "@";
    const priority = r.mxPriority != null ? `${r.mxPriority} ` : "";
    console.log(`  ${r.type.padEnd(6)} ${name.padEnd(20)} ${priority}${r.value}`);
  }
  const mx = existing.filter((r) => r.type === "MX");
  const spf = existing.filter((r) => r.type === "TXT" && r.value.includes("v=spf1"));
  console.log(`\n  MX: ${mx.length || "none — no mail service on this domain"}`);
  console.log(`  SPF: ${spf.length || "none"}`);
  if (!flag("phase")) process.exit(0);
}

const wanted = plan();

// A second SPF record does not add to the first — it invalidates both, and
// mail starts failing authentication. Refuse rather than "helpfully" add one.
const addingSpf = wanted.some((r) => r.type === "TXT" && r.value.includes("v=spf1"));
const hasSpf = existing.some((r) => r.type === "TXT" && r.value.includes("v=spf1"));
if (addingSpf && hasSpf) {
  console.error("\n  Refusing: this domain already has an SPF record.");
  console.error("  Two SPF records break authentication for everything you send.");
  console.error("  Merge the includes into the existing record by hand instead.\n");
  process.exit(1);
}

const isDuplicate = (r) =>
  existing.some((e) => e.type === r.type && (e.name || "") === r.name && e.value === r.value);

console.log(`\n  ${DOMAIN} — planned changes\n`);
let queued = 0;
for (const r of wanted) {
  if (isDuplicate(r)) {
    console.log(`  skip  ${r.type.padEnd(5)} ${(r.name || "@").padEnd(20)} already present`);
    continue;
  }
  queued++;
  const priority = r.mxPriority != null ? `${r.mxPriority} ` : "";
  console.log(`  add   ${r.type.padEnd(5)} ${(r.name || "@").padEnd(20)} ${priority}${r.value}`);
}

if (!queued) {
  console.log("\n  Nothing to do.\n");
  process.exit(0);
}

if (!APPLY) {
  console.log(`\n  Dry run. Re-run with --apply to write ${queued} record(s).\n`);
  process.exit(0);
}

for (const r of wanted) {
  if (isDuplicate(r)) continue;
  await addRecord(r);
  console.log(`  wrote ${r.type} ${r.name || "@"}`);
}
console.log(`\n  Done. DNS takes a few minutes to propagate; Zoho will not verify before it does.\n`);
}
