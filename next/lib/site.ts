/**
 * The public address of the site. Every link that leaves the site (in an
 * email, a WhatsApp message, a copied link) is built on this, never on the
 * address a request came in on, so a link made while testing on a laptop
 * still points at the live site rather than at localhost.
 */
export const SITE_URL = `${(process.env.SITE_URL ?? "https://www.mimschakwellness.com").replace(/\/+$/, "")}/`;
