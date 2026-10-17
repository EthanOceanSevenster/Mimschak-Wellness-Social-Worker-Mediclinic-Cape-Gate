/**
 * Organisations that refer clients to the practice, each with its own
 * booking link: /book/<slug>. A booking made through that link is marked as
 * theirs, so the Admin page shows who sent the client.
 *
 * Adding a partner is adding an entry here (and its logo under
 * public/images/partners/). The slug is the link, so keep it short and never
 * change it once the link has been shared.
 */
export type Partner = {
  slug: string;
  name: string;
  /** Short name for badges and email subjects. */
  short: string;
  logo: string;
  logoWidth: number;
  logoHeight: number;
  /** Button colour and the ink on it (at least 4.5:1). */
  accent: string;
  accentInk: string;
  /** The stripe along the top of their page. */
  stripe: string;
  /** Background of their page's heading band (white text on it). */
  band: string;
  /** Pale background for selected choices. */
  tint: string;
  /** What the optional reference field is called, in their words. */
  referenceLabel: string;
};

export const PARTNERS: Partner[] = [
  {
    slug: "dthf",
    name: "Desmond Tutu Health Foundation",
    short: "DTHF",
    logo: "/images/partners/dthf-logo.png",
    logoWidth: 114,
    logoHeight: 114,
    // The red of the logo's rainbow, darkened enough for white text (5.9:1).
    accent: "#c41f1f",
    accentInk: "#ffffff",
    // The logo's rainbow.
    stripe: "linear-gradient(90deg, #eb2a2a, #f89623 25%, #f9ed25 45%, #6cbf4b 65%, #2a8fd6 85%, #6b3fa0)",
    // The black of the logo's figures, softened.
    band: "linear-gradient(125deg, #1d2024, #2c3036 60%, #3a3f46)",
    tint: "#fdeeee",
    referenceLabel: "DTHF reference or case number",
  },
];

export function getPartner(slug: string | null | undefined): Partner | null {
  if (!slug) return null;
  return PARTNERS.find((p) => p.slug === slug.toLowerCase()) ?? null;
}

/** The public link to give the partner. */
export function partnerLink(partner: Partner): string {
  return `https://www.mimschakwellness.com/book/${partner.slug}`;
}
