import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://mimschakwellness.com"),
  title: "Social Worker Kraaifontein | Mimschak Wellness | Phakama Ndamase",
  description:
    "Phakama Ndamase — professional social worker in Kraaifontein, Cape Town. Serving Windsor Park, Brackenfell and surrounding areas from Letada Medical Centre. Counselling, trauma, family support and more.",
  keywords: [
    "social worker Kraaifontein",
    "social worker Cape Town",
    "Phakama Ndamase",
    "Mimschak Wellness",
    "counselling Kraaifontein",
    "trauma counselling Cape Town",
  ],
  alternates: { canonical: "https://mimschakwellness.com/" },
  openGraph: {
    title: "Social Worker Kraaifontein | Mimschak Wellness | Phakama Ndamase",
    description:
      "Professional social worker in Kraaifontein, Cape Town. Counselling, trauma, family support and more at Letada Medical Centre.",
    url: "https://mimschakwellness.com/",
    siteName: "Mimschak Wellness",
    locale: "en_ZA",
    type: "website",
  },
  icons: { icon: "/favicon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#101820" },
  ],
};

/* Carried over from the existing site so local search results are not lost
   in the rebuild. */
const LOCAL_BUSINESS = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Mimschak Wellness",
  description:
    "Professional social work practice in Kraaifontein, Cape Town. Counselling, trauma support, family interventions and more.",
  url: "https://mimschakwellness.com",
  telephone: "+27641533469",
  email: "phakamandamase@gmail.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Letada Medical Centre",
    addressLocality: "Windsor Park, Kraaifontein",
    addressRegion: "Cape Town",
    postalCode: "7530",
    addressCountry: "ZA",
  },
  geo: { "@type": "GeoCoordinates", latitude: -33.8447, longitude: 18.7078 },
  openingHours: "Mo-Fr 08:00-17:00",
  priceRange: "R250-R1250",
  founder: { "@type": "Person", name: "Phakama Ndamase" },
  areaServed: ["Kraaifontein", "Windsor Park", "Brackenfell", "Cape Town"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      {/* Browser extensions write attributes onto <body> before React
          hydrates — ColorZilla adds cz-shortcut-listen, Grammarly adds
          data-gr-ext-installed — and React reports the difference as a
          hydration mismatch. This suppresses it for this element's own
          attributes only, one level deep, so a genuine mismatch inside the
          page still reports normally. */}
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(LOCAL_BUSINESS) }}
        />
        {children}
      </body>
    </html>
  );
}
