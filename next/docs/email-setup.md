# Email on mimschakwellness.com

Setting up `phakama@mimschakwellness.com` and friends on Zoho Mail's free plan.
Follow this at the Zoho and Vercel dashboards; the DNS records can be pushed
with `scripts/mail-dns.mjs` rather than typed by hand.

## Where the domain stands today

Checked 19 September 2026:

| | |
|---|---|
| Registered | yes, resolving |
| DNS | Vercel — `ns1.vercel-dns.com`, `ns2.vercel-dns.com` |
| A records | `64.29.17.1`, `64.29.17.65` (Vercel edge) |
| MX | **none** |
| SPF | **none** |

No mail service exists on the domain at all. That is why the practice still
publishes a Gmail address. Nothing here touches the A records, so the website
keeps serving throughout.

## What you get on the free plan

- 5 mailboxes, 5 GB each, on one domain
- Unlimited aliases
- Webmail and the Zoho Mail mobile apps

**Not** on the free plan: IMAP, POP and SMTP. Phakama will not be able to use
Outlook or the iPhone Mail app — she uses the Zoho Mail app or webmail. If that
is a problem, Zoho Mail Lite is about R30/user/month and restores IMAP, or move
to Google Workspace at about R121/user/month.

## Addresses to create

One real mailbox plus aliases. Aliases cost nothing and all land in the same
inbox, so there is only one place to check.

| Address | Type | Goes to |
|---|---|---|
| `phakama@mimschakwellness.com` | mailbox | her |
| `info@mimschakwellness.com` | alias | phakama@ |
| `bookings@mimschakwellness.com` | alias | phakama@ |
| `postmaster@mimschakwellness.com` | alias | phakama@ |

`postmaster@` is worth having: it is where the DMARC reports in step 4 are
addressed, and some providers expect it to exist.

## Step 1 — Sign up

1. Go to <https://www.zoho.com/mail/> and pick **Forever Free Plan** (scroll
   down; the paid plans are shown first).
2. Choose **Sign up with a domain I already own** and enter
   `mimschakwellness.com`.
3. Use your own address as the super admin, not Phakama's. You are the one
   maintaining it, and the admin account is separate from her mailbox.

Note which datacentre you land in — the console URL will be `zoho.com`,
`zoho.eu`, `zoho.in` or `zoho.com.au`. **The MX records differ per
datacentre.** A South African sign-up normally lands on `zoho.com`. If it does
not, pass `--region eu` (or `in`, `au`) to the script in step 3.

## Step 2 — Verify the domain

Zoho shows a verification value like `zb14295125.zmverify.zoho.com`.

```bash
cd clients/mimschak-next
export VERCEL_TOKEN=...          # vercel.com/account/tokens
node scripts/mail-dns.mjs --phase verify --code zb14295125.zmverify.zoho.com
# read the plan, then:
node scripts/mail-dns.mjs --phase verify --code zb14295125.zmverify.zoho.com --apply
```

Wait a few minutes, then press **Verify** in Zoho. It will fail if you press it
before DNS propagates; that is normal, just try again.

If the domain sits under a Vercel team, add `--team <teamId>`.

## Step 3 — Mail routing

Once verified:

```bash
node scripts/mail-dns.mjs --phase mail            # dry run
node scripts/mail-dns.mjs --phase mail --apply
```

That writes:

| Type | Host | Value | Priority |
|---|---|---|---|
| MX | `@` | `mx.zoho.com` | 10 |
| MX | `@` | `mx2.zoho.com` | 20 |
| MX | `@` | `mx3.zoho.com` | 50 |
| TXT | `@` | `v=spf1 include:zoho.com ~all` | |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:postmaster@mimschakwellness.com` | |

The script refuses to add SPF if the domain already has one. Two SPF records do
not combine — they invalidate each other and everything you send starts failing
authentication. If that ever fires, merge the includes into the existing record
by hand.

DMARC starts at `p=none`, which only collects reports. Leave it there for a
couple of weeks and read what arrives before tightening to `quarantine`. Going
straight to `reject` is how legitimate mail quietly disappears.

## Step 4 — DKIM

In Zoho: **Admin Console → Domains → mimschakwellness.com → Email
Configuration → DKIM → Add**. Use selector `zoho`. Zoho generates the key.

```bash
node scripts/mail-dns.mjs --phase dkim --selector zoho \
  --key "v=DKIM1; k=rsa; p=MIGfMA0GCSq..." --apply
```

Then press **Verify** in Zoho.

DKIM is not optional in practice. Without it, mail from a brand-new domain to
Gmail and Outlook addresses lands in spam often enough to matter — and this
practice's clients are on Gmail.

## Step 5 — Create the mailbox and aliases

**Admin Console → Users → Add** for `phakama@`, then **Mail Accounts →
phakama@ → Mail Aliases** for `info@`, `bookings@` and `postmaster@`.

## Step 6 — Check it works

- Send from the new address to a Gmail address. Open the message, **Show
  original**, and confirm `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.
- Send from Gmail *to* `info@mimschakwellness.com` and confirm it arrives.
- Re-run `node scripts/mail-dns.mjs --list` and confirm the MX and TXT records
  read back as expected.

Do not skip the first one. It is the only step that tells you whether mail will
actually be delivered rather than filed as spam.

## Step 7 — Put it on the website

The Gmail address is hardcoded in 19 places: the Next.js app, the old static
site and the booking seed data. **Leave them until step 6 passes** — pointing
the site at an address that bounces is worse than the Gmail one.

When it is live:

```
clients/mimschak-next/app/chrome.tsx          footer contact
clients/mimschak-next/app/layout.tsx          LocalBusiness JSON-LD
clients/mimschak-next/app/page.tsx            contact section
platform/backend/apps/bookings/management/commands/seed_bookings.py
clients/Mimschak-Wellness-.../*.html          15 places on the old static site
```

Then re-run `python manage.py seed_bookings` so the practice record picks up
the new address.

## Migrating the existing Gmail

Zoho's free plan has no IMAP, which is also how mail is normally migrated in.
Options:

- **Leave Gmail alone.** Set a forward from Gmail to the new address, and reply
  from the new one going forward. Old mail stays where it is. Simplest, and
  probably right for a one-person practice.
- **Pay for one month of Mail Lite** (~R30), migrate over IMAP, then downgrade.

## What this does not cover

The website does not send any email yet — the booking system notifies over
WhatsApp, and the Meridian lead form currently writes to the database and
emails nobody. If either ever needs to send mail *as* the domain, that needs an
SMTP relay and another `include:` in the SPF record. Zoho's free plan cannot do
it; that is what the SPF merge warning in step 3 is guarding.
