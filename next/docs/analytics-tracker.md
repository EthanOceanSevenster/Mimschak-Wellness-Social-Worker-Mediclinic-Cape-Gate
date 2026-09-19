# Re-adding the Meridian analytics tracker

The tracker was removed from the eleven static pages before the first
deployment, because it pointed at `http://127.0.0.1:8000/m.js`. On a live
HTTPS site that is worse than a dead link: browsers block `http://` scripts on
an `https://` page as mixed content, so it would have failed on every page
view and logged an error into the console each time.

Put it back once the API has a public HTTPS address.

## The snippet

```html
<script defer data-site="7adc6cec24ce19c8d6ae45c9" src="https://<api-host>/m.js"></script>
```

The site id `7adc6cec24ce19c8d6ae45c9` is the existing `TrackedSite` record for
Mimschak Wellness. Keep it — changing it would orphan the visit history
already collected.

It goes just before `</head>` on each page. `defer` matters: the tracker must
not block rendering.

## Where

Eleven files at the repo root: `about.html`, `admin.html`, `blog.html`,
`booking.html`, `cart.html`, `checkout.html`, `contact.html`, `index.html`,
`services.html`, `shop.html`, `thankyou.html`.

## For the Next.js app instead

The rebuild in `next/` does not carry the tracker at all yet. When the API is
live, add it to `app/layout.tsx` with `next/script`:

```tsx
import Script from "next/script";

<Script
  src={`${process.env.NEXT_PUBLIC_ANALYTICS_HOST}/m.js`}
  data-site="7adc6cec24ce19c8d6ae45c9"
  strategy="afterInteractive"
/>
```

That one **does** need the `NEXT_PUBLIC_` prefix, unlike `API_URL` — the
browser loads this script, so the value has to reach the client bundle.

## Check it worked

Open the site, and in the browser's Network tab confirm `m.js` returns 200
over HTTPS. Then check the visit appears on the client's dashboard. A silent
failure here looks identical to a site with no visitors, which is a
demoralising thing to show a client by mistake.
