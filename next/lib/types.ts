export type PracticeService = {
  slug: string;
  name: string;
  description: string;
  duration_minutes: number;
};

export type Practice = {
  slug: string;
  name: string;
  contact_phone: string;
  contact_email: string;
  slot_minutes: number;
  min_notice_hours: number;
  horizon_days: number;
  services: PracticeService[];
  modes: { value: string; label: string }[];
  whatsapp_url: string;
};

export type DiaryDay = {
  date: string;
  weekday: string;
  is_open: boolean;
  slots: string[];
};

export type BookingStatus = "requested" | "confirmed" | "cancelled" | "completed" | "no_show";

export type Booking = {
  reference: string;
  full_name: string;
  email: string;
  phone: string;
  service: string | null;
  /** The service's slug (lib/bookings.ts PRACTICE.services), for editing. */
  service_slug?: string;
  mode: string;
  mode_label: string;
  starts_at: string;
  ends_at: string;
  notes: string;
  status: BookingStatus;
  status_label: string;
  cancel_reason: string;
  created_at: string;
  whatsapp_url: string;
  can_cancel: boolean;
  /** The referring organisation's slug (lib/partners.ts), or "" for a direct booking. */
  partner?: string;
  partner_name?: string;
  partner_short?: string;
  partner_ref?: string;
  /** The consent form version agreed to when booking online, or "". */
  consent_version?: string;
};

export type MyBookings = { upcoming: Booking[]; past: Booking[] };

export type ManageBookings = {
  practice: string;
  counts: { requested: number; upcoming: number; this_week: number; total: number };
  bookings: Booking[];
};

export type SessionUser = {
  id: string;
  email: string;
  full_name: string;
  organisation: { id: string; name: string; slug: string } | null;
  is_staff: boolean;
};
