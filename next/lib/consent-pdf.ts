import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

import type { SignedEntry } from "./client-entries";
import {
  BANKING,
  CANCELLATION_TERMS,
  CONSENT_TEXT,
  CONTACT_METHODS,
  DOC_FOOTER,
  DOC_INTRO,
  DOC_TITLE,
  FEES,
  fullName,
  modeLabel,
  PAYMENT_TERMS,
  PERMISSION_LABELS,
  PERMISSIONS,
  SERVICE_SECTIONS,
  serviceLabel,
  SOCIAL_WORKER,
  type PermissionAnswer,
} from "./client-form";
import { CONSENT_LOGO_PNG_BASE64, CONSENT_LOGO_SIZE } from "./consent-logo";

/**
 * The signed copy of the consent form, as a PDF. Server only.
 *
 * It reproduces the practice's Word document: the same page size and
 * margins, the logo header and footer, and the same wording in the same order,
 * with the client's answers filled in, their choices ticked and their drawn
 * signature placed. An electronic signature record closes it.
 *
 * Built from the stored entry each time it is asked for, so there is no file
 * to keep in sync. pdf-lib is pure JavaScript and runs on Vercel unchanged.
 */

// US Letter and margins, from the Word document (twips / 20 = points).
const PAGE = { width: 612, height: 792 };
const MARGIN_X = 56;
const TOP = PAGE.height - 112;
const BOTTOM = 64;
const WIDTH = PAGE.width - MARGIN_X * 2;

const INK = rgb(0.17, 0.2, 0.25);
const SOFT = rgb(0.35, 0.4, 0.45);
const BRAND = rgb(0.08, 0.38, 0.56);
const GREEN = rgb(0.37, 0.65, 0.23);
const LINE = rgb(0.8, 0.84, 0.87);
const PANEL = rgb(0.96, 0.97, 0.98);

const BODY = 9.5;
const LEADING = 13.5;

const WHEN = new Intl.DateTimeFormat("en-ZA", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Johannesburg",
});
const TIME = new Intl.DateTimeFormat("en-ZA", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Africa/Johannesburg",
});

class Writer {
  page!: PDFPage;
  y = TOP;
  private readonly allowed: Set<number>;

  constructor(
    readonly doc: PDFDocument,
    readonly regular: PDFFont,
    readonly bold: PDFFont,
    readonly logo: PDFImage,
  ) {
    // Helvetica covers Western European text only; anything else a client
    // types (an emoji, say) would make pdf-lib throw, so it is replaced.
    this.allowed = new Set([...regular.getCharacterSet(), ...bold.getCharacterSet()]);
    this.newPage();
  }

  safe(text: string): string {
    return Array.from(text.normalize("NFC"))
      .map((ch) => (this.allowed.has(ch.codePointAt(0) ?? 0) ? ch : "?"))
      .join("");
  }

  newPage() {
    this.page = this.doc.addPage([PAGE.width, PAGE.height]);
    const width = 155;
    const height = (width * CONSENT_LOGO_SIZE.height) / CONSENT_LOGO_SIZE.width;
    this.page.drawImage(this.logo, { x: MARGIN_X, y: PAGE.height - 18 - height, width, height });
    this.y = TOP;
  }

  ensure(height: number) {
    if (this.y - height < BOTTOM) this.newPage();
  }

  gap(points: number) {
    this.y -= points;
  }

  wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = "";
    for (const word of this.safe(text).split(/\s+/).filter(Boolean)) {
      const attempt = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(attempt, size) <= maxWidth) {
        line = attempt;
        continue;
      }
      if (line) lines.push(line);
      // A single word wider than the line (a long email address) is split.
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > maxWidth) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    if (line) lines.push(line);
    return lines;
  }

  paragraph(
    text: string,
    opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; indent?: number; after?: number } = {},
  ) {
    const font = opts.font ?? this.regular;
    const size = opts.size ?? BODY;
    const indent = opts.indent ?? 0;
    const leading = size * (LEADING / BODY);
    for (const line of this.wrap(text, font, size, WIDTH - indent)) {
      this.ensure(leading);
      this.y -= leading;
      this.page.drawText(line, { x: MARGIN_X + indent, y: this.y + 3, size, font, color: opts.color ?? INK });
    }
    this.gap(opts.after ?? 5);
  }

  heading(text: string) {
    this.ensure(LEADING * 4); // never strand a heading at the foot of a page
    this.gap(8);
    this.y -= 14;
    this.page.drawText(this.safe(text), { x: MARGIN_X, y: this.y + 2, size: 11.5, font: this.bold, color: BRAND });
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y - 3 },
      end: { x: MARGIN_X + WIDTH, y: this.y - 3 },
      thickness: 0.6,
      color: LINE,
    });
    this.gap(7);
  }

  /** "Label  value" on a ruled line, like the blanks on the paper form. */
  field(label: string, value: string) {
    const labelText = this.safe(label);
    const labelWidth = this.bold.widthOfTextAtSize(labelText, BODY) + 8;
    const lines = this.wrap(value || " ", this.regular, BODY + 0.5, WIDTH - labelWidth);
    for (const [i, line] of lines.entries()) {
      this.ensure(LEADING + 4);
      this.y -= LEADING + 3;
      if (i === 0) {
        this.page.drawText(labelText, { x: MARGIN_X, y: this.y + 3, size: BODY, font: this.bold, color: INK });
      }
      this.page.drawText(line, { x: MARGIN_X + labelWidth, y: this.y + 3, size: BODY + 0.5, font: this.regular, color: INK });
      this.page.drawLine({
        start: { x: MARGIN_X + labelWidth, y: this.y },
        end: { x: MARGIN_X + WIDTH, y: this.y },
        thickness: 0.5,
        color: SOFT,
      });
    }
    this.gap(3);
  }

  box(x: number, y: number, checked: boolean) {
    const s = 8;
    this.page.drawRectangle({ x, y, width: s, height: s, borderColor: INK, borderWidth: 0.7 });
    if (checked) {
      this.page.drawLine({ start: { x: x + 1.6, y: y + 1.6 }, end: { x: x + s - 1.6, y: y + s - 1.6 }, thickness: 1.2, color: BRAND });
      this.page.drawLine({ start: { x: x + 1.6, y: y + s - 1.6 }, end: { x: x + s - 1.6, y: y + 1.6 }, thickness: 1.2, color: BRAND });
    }
  }

  /** A row of tick boxes, such as Yes / No, with the chosen one marked. */
  choices(options: { label: string; checked: boolean }[], indent = 0, prefix?: string) {
    this.ensure(LEADING + 4);
    this.y -= LEADING + 2;
    let x = MARGIN_X + indent;
    if (prefix) {
      const text = this.safe(prefix);
      this.page.drawText(text, { x, y: this.y + 3, size: BODY, font: this.bold, color: INK });
      x += this.bold.widthOfTextAtSize(text, BODY) + 10;
    }
    for (const option of options) {
      this.box(x, this.y + 2, option.checked);
      const text = this.safe(option.label);
      const font = option.checked ? this.bold : this.regular;
      this.page.drawText(text, { x: x + 12, y: this.y + 3, size: BODY, font, color: INK });
      x += 12 + font.widthOfTextAtSize(text, BODY) + 18;
    }
    this.gap(4);
  }

  signature(label: string, image: PDFImage | null) {
    const height = 46;
    this.ensure(height + LEADING * 2);
    this.y -= height + 4;
    const labelText = this.safe(label);
    const labelWidth = this.bold.widthOfTextAtSize(labelText, BODY) + 8;
    this.page.drawText(labelText, { x: MARGIN_X, y: this.y + 3, size: BODY, font: this.bold, color: INK });
    if (image) {
      const width = (height * image.width) / image.height;
      this.page.drawImage(image, { x: MARGIN_X + labelWidth, y: this.y + 1, width, height });
    }
    this.page.drawLine({
      start: { x: MARGIN_X + labelWidth, y: this.y },
      end: { x: MARGIN_X + WIDTH, y: this.y },
      thickness: 0.5,
      color: SOFT,
    });
    this.gap(5);
  }

  /** Bold text, then a labelled blank to fill in by hand: "Date: ______". */
  textThenBlank(text: string, blankLabel: string) {
    this.ensure(LEADING + 6);
    this.y -= LEADING + 3;
    const left = this.safe(text);
    this.page.drawText(left, { x: MARGIN_X, y: this.y + 3, size: BODY, font: this.bold, color: INK });
    const x = MARGIN_X + Math.max(this.bold.widthOfTextAtSize(left, BODY) + 40, WIDTH * 0.55);
    this.page.drawText(this.safe(blankLabel), { x, y: this.y + 3, size: BODY, font: this.bold, color: INK });
    const lineStart = x + this.bold.widthOfTextAtSize(blankLabel, BODY) + 8;
    this.page.drawLine({
      start: { x: lineStart, y: this.y },
      end: { x: MARGIN_X + WIDTH, y: this.y },
      thickness: 0.5,
      color: SOFT,
    });
    this.gap(5);
  }

  /** A shaded panel around lines of text: the electronic signature record. */
  panel(title: string, lines: string[]) {
    const size = 8.5;
    const leading = 12;
    const wrapped = lines.flatMap((l) => this.wrap(l, this.regular, size, WIDTH - 20));
    const height = 24 + wrapped.length * leading + 8;
    this.ensure(height + 10);
    this.gap(10);
    const top = this.y;
    this.page.drawRectangle({
      x: MARGIN_X,
      y: top - height,
      width: WIDTH,
      height,
      color: PANEL,
      borderColor: LINE,
      borderWidth: 0.6,
    });
    this.page.drawRectangle({ x: MARGIN_X, y: top - height, width: 3, height, color: GREEN });
    this.page.drawText(this.safe(title), { x: MARGIN_X + 12, y: top - 16, size: 10, font: this.bold, color: BRAND });
    let y = top - 24;
    for (const line of wrapped) {
      y -= leading;
      this.page.drawText(line, { x: MARGIN_X + 12, y: y + 3, size, font: this.regular, color: INK });
    }
    this.y = top - height;
  }

  footers() {
    const pages = this.doc.getPages();
    const footer = this.safe(DOC_FOOTER);
    const size = 7.5;
    for (const [i, page] of pages.entries()) {
      const width = this.regular.widthOfTextAtSize(footer, size);
      page.drawText(footer, { x: (PAGE.width - width) / 2, y: 30, size, font: this.regular, color: SOFT });
      const number = `Page ${i + 1} of ${pages.length}`;
      const nWidth = this.regular.widthOfTextAtSize(number, size);
      page.drawText(number, { x: (PAGE.width - nWidth) / 2, y: 19, size, font: this.regular, color: SOFT });
    }
  }
}

async function embedSignature(doc: PDFDocument, dataUrl: string): Promise<PDFImage | null> {
  const base64 = dataUrl.match(/^data:image\/png;base64,(.+)$/)?.[1];
  if (!base64) return null;
  try {
    return await doc.embedPng(Buffer.from(base64, "base64"));
  } catch {
    return null;
  }
}

export async function buildConsentPdf(entry: SignedEntry): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const name = fullName(entry);
  const signed = new Date(entry.createdAt);
  doc.setTitle(`${DOC_TITLE} - ${name}`);
  doc.setAuthor("Mimshack Wellness");
  doc.setSubject("Signed counselling and therapy consent form");
  doc.setCreationDate(signed);

  const w = new Writer(
    doc,
    await doc.embedFont(StandardFonts.Helvetica),
    await doc.embedFont(StandardFonts.HelveticaBold),
    await doc.embedPng(Buffer.from(CONSENT_LOGO_PNG_BASE64, "base64")),
  );
  const signature = await embedSignature(doc, entry.signature);

  // ------------------------------------------------------------- title
  w.y -= 18;
  w.page.drawText(w.safe(DOC_TITLE), { x: MARGIN_X, y: w.y, size: 17, font: w.bold, color: BRAND });
  w.gap(8);
  w.paragraph(DOC_INTRO, { color: SOFT });

  // ------------------------------------------------------ client details
  w.heading("Client details");
  w.field("Full name", name);
  w.field("Identity number or date of birth", entry.idOrDob);
  w.field("Mobile number", entry.phone);
  w.field("Email address", entry.email);
  w.choices(
    CONTACT_METHODS.map((m) => ({ label: m.label, checked: m.value === entry.contactMethod })),
    0,
    "Preferred contact method:",
  );

  // ------------------------------------------- the document's own sections
  for (const section of SERVICE_SECTIONS) {
    w.heading(section.title);
    w.paragraph(section.paragraphs.join(" "));
  }

  w.ensure(LEADING * 9);
  w.heading("Fees and payment");
  w.paragraph([...FEES.map((fee) => `${fee.label}: ${fee.amount}.`), ...PAYMENT_TERMS].join(" "));
  w.paragraph(`Bank: ${BANKING.bankName}   |   Account name: ${BANKING.accountHolder}`, { font: w.bold, after: 0 });
  w.paragraph(
    `Account type: ${BANKING.accountType}   |   Account number: ${BANKING.accountNumber}   |   Branch code: ${BANKING.branchCode}`,
    { font: w.bold },
  );

  w.heading("Cancellation and postponement");
  w.paragraph(CANCELLATION_TERMS.join(" "));

  // ---------------------------------------------------------- permissions
  w.heading("Additional permissions");
  w.paragraph("Please mark your choice. Leaving a box unmarked means permission has not been given.", {
    color: SOFT,
  });
  for (const permission of PERMISSIONS) {
    const given: PermissionAnswer = entry[permission.key];
    const answers = permission.allowNotApplicable ? (["yes", "no", "na"] as const) : (["yes", "no"] as const);
    w.paragraph(permission.text, { after: 0 });
    w.choices(answers.map((a) => ({ label: PERMISSION_LABELS[a], checked: given === a })), 14);
  }

  // ------------------------------------------------------------- consent
  w.heading("Consent");
  w.paragraph(CONSENT_TEXT);
  w.signature("Client or authorised representative signature", signature);
  w.field("Printed name of person signing", name);
  w.field("Date and place", `${WHEN.format(signed)}, ${entry.signedPlace}`);
  w.signature("Social worker signature", null);
  w.textThenBlank(`Social worker: ${SOCIAL_WORKER}`, "Date:");

  // ------------------------------------------------------------- a minor
  w.heading("For a minor client");
  const na = "Not applicable";
  w.field("Full name of minor", entry.isMinor ? entry.minorName : na);
  w.field("Relationship of person signing to minor", entry.isMinor ? entry.minorRelationship : na);
  w.field("Basis for consenting on behalf of minor", entry.isMinor ? entry.minorBasis : na);

  // ------------------------------------------------ e-signature record
  w.panel("Electronic signature record", [
    `Completed and signed online by ${name} at www.mimschakwellness.com/form on ${WHEN.format(signed)} at ${TIME.format(signed)} (South African time).`,
    `The client ticked to agree to the consent statement${entry.agreePayment ? ", and to the fees, payment terms and cancellation policy" : ""}, and drew the signature shown above.`,
    `Form reference: ${entry.id}.  Wording version: ${entry.termsVersion}.`,
    `Also provided online - home address: ${entry.street}, ${entry.suburb}, ${entry.city}, ${entry.postalCode}. Help requested: ${serviceLabel(entry)}. Sessions: ${modeLabel(entry.mode)}.`,
  ]);

  w.footers();
  return doc.save();
}

/** A tidy, ASCII-only download name, e.g. Consent-form-Thandi-Mokoena-2026-10-04.pdf. */
export function consentFileName(entry: SignedEntry): string {
  const date = new Date(entry.createdAt).toISOString().slice(0, 10);
  const part = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 40) || "client";
  return `Consent-form-${part(entry.firstName)}-${part(entry.surname)}-${date}.pdf`;
}
