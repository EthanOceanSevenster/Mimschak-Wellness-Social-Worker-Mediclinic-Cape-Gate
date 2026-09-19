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
