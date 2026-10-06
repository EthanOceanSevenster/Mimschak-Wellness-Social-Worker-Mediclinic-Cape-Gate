/**
 * The client form at /form: its options, its wording, the agreements clients
 * sign, and the practice's banking details.
 *
 * The wording is the practice's "Counselling and Therapy Consent Form"
 * (Word document, October 2026), word for word: the client consents to that
 * document, and the signed PDF reproduces it. Change the two together, and
 * add nothing here that is not in the document.
 *
 * Everything someone might want to change about the form lives here. This
 * file is imported by the browser as well as the server, so it must stay
 * free of secrets and of Node-only imports.
 */

/** Picking this one asks the client to describe what they need in their own words. */
export const OTHER_SERVICE = "Other";

export const FORM_SERVICES = [
  "Counselling",
  "Family support",
  "Crisis support",
  "Employee wellness",
  "Not sure yet",
  OTHER_SERVICE,
] as const;

export const FORM_MODES = [
  { value: "in_person", label: "In person" },
  { value: "online", label: "Online (video call)" },
] as const;

export const CONTACT_METHODS = [
  { value: "phone", label: "Phone call" },
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
] as const;

/**
 * Every entry records which version of the wording it was signed under, so
 * change TERMS_VERSION (to the date of the change) whenever the wording below
 * changes. Otherwise an old signature would appear to cover words the client
 * never saw.
 */
export const TERMS_VERSION = "2026-10-06";

export const DOC_TITLE = "Counselling and Therapy Consent Form";

export const DOC_INTRO =
  "Please read this form with your social worker and ask about anything that is unclear. Your signature confirms that the service and its limits have been explained to you and that you agree to participate.";

export const DOC_FOOTER =
  "Mimshack Wellness  •  Phakama Ndamase  •  064 153 3469  •  phakama.ndamase@mimschakwellness.com";

export const SOCIAL_WORKER = "Phakama Ndamase";

/** The "About the service" text, read before signing. From the document. */
export const SERVICE_SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: "What the service involves",
    paragraphs: [
      "Mimshack Wellness offers social work counselling and psychosocial support. Sessions may include assessment, discussion of concerns and goals, coping strategies, practical support and referral when needed. We will review progress together.",
      "You may ask questions, decline a particular activity or end counselling at any time. Benefits cannot be guaranteed, and discussing difficult experiences may cause temporary discomfort.",
    ],
  },
  {
    title: "Confidentiality and its limits",
    paragraphs: [
      "What you share is kept confidential and handled with care. Information may need to be shared when required by law, where there is a serious risk of harm to you or another person, or when necessary to arrange urgent care. Where possible and safe, we will discuss this with you first.",
      "Referrals, reports to third parties and routine sharing with family members or employers require your separate permission, unless disclosure is otherwise legally required.",
    ],
  },
  {
    title: "Records and privacy",
    paragraphs: [
      "We keep relevant contact details, assessments, session notes and care records for providing the service and administering the practice. Records are stored securely and accessed only by authorised people.",
      "You may ask how your information is used and request access or correction, subject to applicable law. For privacy questions contact Phakama Ndamase at 064 153 3469 or phakama.ndamase@mimschakwellness.com.",
    ],
  },
  {
    title: "Practical arrangements",
    paragraphs: [
      "Sessions last 60 minutes. The first session is an assessment. After assessment, sessions may be weekly or every two weeks, depending on the needs and severity of the case.",
      "Counselling messages are for scheduling and brief practical matters; electronic communication may have privacy limits.",
      "This service does not provide an emergency response. For immediate danger or urgent medical help, contact local emergency services or the nearest emergency department.",
    ],
  },
];

export const FEES = [
  { label: "Initial assessment session", amount: "R750" },
  { label: "Each following 60-minute session", amount: "R650" },
];

export const PAYMENT_TERMS = [
  "Payment for the first session must be made before that session.",
  "The payment reference must be the client’s name and surname.",
  "Please share proof of payment (POP) with Mimshack Wellness.",
];

export const CANCELLATION_TERMS = [
  "Please cancel at least 24 hours before the appointment.",
  "If an emergency requires you to postpone, please inform Mimshack Wellness at least 4 hours before the session.",
];

export const PAYMENT_AGREE =
  "I agree to the fees, payment terms and cancellation policy in the consent form.";

/** Where a client sends proof of payment. */
export const POP_CONTACT = {
  whatsapp: "064 153 3469",
  email: "phakama.ndamase@mimschakwellness.com",
};

/**
 * The paper form's "Additional permissions". On paper an unmarked box means
 * no; online every question must be answered, so nothing is left ambiguous.
 */
export const PERMISSIONS = [
  {
    key: "permMessages",
    text: "I agree to receive appointment messages using my chosen contact method.",
    allowNotApplicable: false,
  },
  {
    key: "permAdminContact",
    text: "Tabitha Khwatsha (Mimshack Wellness Admin) may contact me to arrange further sessions.",
    allowNotApplicable: false,
  },
  {
    key: "permRemote",
    text: "I agree to online or telephone sessions when separately arranged.",
    allowNotApplicable: false,
  },
  {
    key: "permAttendance",
    text: "I agree that a brief attendance confirmation may be given to the referring or paying organisation, if applicable. No session content is included.",
    allowNotApplicable: true,
  },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];
export type PermissionAnswer = "yes" | "no" | "na" | "";

export const PERMISSION_LABELS: Record<Exclude<PermissionAnswer, "">, string> = {
  yes: "Yes",
  no: "No",
  na: "Not applicable",
};

export const CONSENT_TEXT =
  "I have had an opportunity to ask questions. I understand the nature of counselling, confidentiality and its limits, record keeping and the practical arrangements above. I consent to participate in counselling with Mimshack Wellness. I understand that I may withdraw consent and discuss how this affects ongoing care.";

export const CONSENT_AGREE = "I have read the consent form and agree to it.";

/**
 * Shown in the form and on the screen after the client submits. Until the
 * bank name, account holder, account number and branch code are all filled
 * in, the banking details are not shown at all, because a half-filled panel
 * would send payments nowhere.
 */
export const BANKING = {
  bankName: "First National Bank (FNB)",
  accountHolder: "MIMSHACK WELLNESS (PTY) LTD",
  accountNumber: "63221458052",
  branchCode: "255355",
  accountType: "Gold Business Account",
  reference: "Your name and surname",
};

export function bankingReady(): boolean {
  return Boolean(
    BANKING.bankName && BANKING.accountHolder && BANKING.accountNumber && BANKING.branchCode,
  );
}

/** What the browser sends. */
export type ClientEntryInput = {
  firstName: string;
  surname: string;
  idOrDob: string;
  phone: string;
  email: string;
  contactMethod: string;
  street: string;
  suburb: string;
  city: string;
  postalCode: string;
  service: string;
  /** The client's own words, when service is OTHER_SERVICE. Empty otherwise. */
  serviceOther: string;
  mode: string;
  note: string;
  permMessages: PermissionAnswer;
  permAdminContact: PermissionAnswer;
  permRemote: PermissionAnswer;
  permAttendance: PermissionAnswer;
  agreePayment: boolean;
  agreeConsent: boolean;
  /** Set when a parent or guardian signs for a client under 18. */
  isMinor: boolean;
  minorName: string;
  minorRelationship: string;
  minorBasis: string;
  signedPlace: string;
  /** A PNG data URL of the drawn signature. */
  signature: string;
};

/** What the /clients page lists. The signature is fetched separately. */
export type ClientEntry = Omit<ClientEntryInput, "signature"> & {
  id: string;
  createdAt: string;
  termsVersion: string;
};

export const LIMITS = {
  name: 80,
  idOrDob: 20,
  phone: 30,
  email: 200,
  street: 200,
  place: 100,
  serviceOther: 200,
  note: 2000,
  // A drawn signature is typically 15 to 60 KB as a data URL.
  signature: 400_000,
};

function labelFrom(list: readonly { value: string; label: string }[], value: string): string {
  return list.find((item) => item.value === value)?.label ?? value;
}

export function modeLabel(value: string): string {
  return labelFrom(FORM_MODES, value);
}

export function contactMethodLabel(value: string): string {
  return labelFrom(CONTACT_METHODS, value);
}

export function serviceLabel(entry: { service: string; serviceOther: string }): string {
  return entry.service === OTHER_SERVICE && entry.serviceOther
    ? `Other: ${entry.serviceOther}`
    : entry.service;
}

export function fullName(entry: { firstName: string; surname: string }): string {
  return `${entry.firstName} ${entry.surname}`.trim();
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function between(value: string, min: number, max: number): boolean {
  return value.length >= min && value.length <= max;
}

function answer(value: unknown): PermissionAnswer {
  return value === "yes" || value === "no" || value === "na" ? value : "";
}

/**
 * Checked on the server, and again in the browser before sending so a client
 * sees the same plain message either way. Messages say exactly what to fix,
 * with an example where the format matters.
 */
export function validateEntry(
  raw: unknown,
): { ok: true; value: ClientEntryInput } | { ok: false; error: string } {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const service = text(body.service);
  const isMinor = body.isMinor === true;
  const value: ClientEntryInput = {
    firstName: text(body.firstName),
    surname: text(body.surname),
    idOrDob: text(body.idOrDob),
    phone: text(body.phone),
    email: text(body.email).toLowerCase(),
    contactMethod: text(body.contactMethod),
    street: text(body.street),
    suburb: text(body.suburb),
    city: text(body.city),
    postalCode: text(body.postalCode).replace(/\s+/g, ""),
    service,
    serviceOther: service === OTHER_SERVICE ? text(body.serviceOther) : "",
    mode: text(body.mode),
    note: text(body.note),
    permMessages: answer(body.permMessages),
    permAdminContact: answer(body.permAdminContact),
    permRemote: answer(body.permRemote),
    permAttendance: answer(body.permAttendance),
    agreePayment: body.agreePayment === true,
    agreeConsent: body.agreeConsent === true,
    isMinor,
    minorName: isMinor ? text(body.minorName) : "",
    minorRelationship: isMinor ? text(body.minorRelationship) : "",
    minorBasis: isMinor ? text(body.minorBasis) : "",
    signedPlace: text(body.signedPlace),
    signature: typeof body.signature === "string" ? body.signature : "",
  };

  if (!between(value.firstName, 1, LIMITS.name)) {
    return { ok: false, error: "Please enter your first name." };
  }
  if (!between(value.surname, 1, LIMITS.name)) {
    return { ok: false, error: "Please enter your surname." };
  }
  if (!/^[\d\s/.-]{6,20}$/.test(value.idOrDob)) {
    return {
      ok: false,
      error: "Please enter your ID number, or your date of birth, for example 14/05/1990.",
    };
  }
  if (!/^\+?[\d\s()-]{7,}$/.test(value.phone) || value.phone.length > LIMITS.phone) {
    return { ok: false, error: "Please enter a valid cellphone number, for example 082 123 4567." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) || value.email.length > LIMITS.email) {
    return { ok: false, error: "Please enter a valid email address, for example name@gmail.com." };
  }
  if (!CONTACT_METHODS.some((m) => m.value === value.contactMethod)) {
    return { ok: false, error: "Please choose how you would prefer to be contacted." };
  }
  if (!between(value.street, 3, LIMITS.street)) {
    return { ok: false, error: "Please enter your street address, for example 12 Main Road." };
  }
  if (!between(value.suburb, 2, LIMITS.place)) {
    return { ok: false, error: "Please enter your suburb." };
  }
  if (!between(value.city, 2, LIMITS.place)) {
    return { ok: false, error: "Please enter your city or town." };
  }
  if (!/^\d{4}$/.test(value.postalCode)) {
    return { ok: false, error: "Please enter your 4-digit postal code, for example 7570." };
  }
  if (!(FORM_SERVICES as readonly string[]).includes(value.service)) {
    return { ok: false, error: "Please choose what you would like help with." };
  }
  if (value.service === OTHER_SERVICE && !between(value.serviceOther, 2, LIMITS.serviceOther)) {
    return { ok: false, error: "You chose Other. Please describe what you would like help with." };
  }
  if (!FORM_MODES.some((m) => m.value === value.mode)) {
    return { ok: false, error: "Please choose how you would like to attend your sessions." };
  }
  if (value.note.length > LIMITS.note) {
    return { ok: false, error: `Please shorten your note to under ${LIMITS.note} characters.` };
  }
  if (!value.agreePayment) {
    return {
      ok: false,
      error: "Please tick the box to confirm that you agree to the fees, payment terms and cancellation policy.",
    };
  }
  for (const [i, permission] of PERMISSIONS.entries()) {
    const given = value[permission.key];
    if (!given || (given === "na" && !permission.allowNotApplicable)) {
      return {
        ok: false,
        error: `Please answer permission question ${i + 1} of ${PERMISSIONS.length} in step 4.`,
      };
    }
  }
  if (!value.agreeConsent) {
    return {
      ok: false,
      error: "Please open and read the consent form in step 5, then tick the box to agree to it.",
    };
  }
  if (value.isMinor) {
    if (!between(value.minorName, 2, LIMITS.name * 2)) {
      return { ok: false, error: "Please enter the full name of the child." };
    }
    if (!between(value.minorRelationship, 2, LIMITS.place)) {
      return { ok: false, error: "Please enter your relationship to the child, for example mother." };
    }
    if (!between(value.minorBasis, 2, LIMITS.place)) {
      return {
        ok: false,
        error: "Please enter the basis on which you consent for the child, for example parent or legal guardian.",
      };
    }
  }
  if (!between(value.signedPlace, 2, LIMITS.place)) {
    return { ok: false, error: "Please enter the town or city where you are signing." };
  }
  if (
    !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value.signature) ||
    value.signature.length > LIMITS.signature
  ) {
    return { ok: false, error: "Please sign in the signature box before submitting." };
  }
  return { ok: true, value };
}
