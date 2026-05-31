export interface TripRow {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  created_at: string;
  /** Ảnh cover thành phố từ Pexels (backend enrich). */
  cover_image_url?: string | null;
}

export interface DashboardStats {
  total_trips: number;
  total_budget_planned: number;
  unique_destinations: number;
  places_in_itineraries: number;
}

export type TripPhase = "upcoming" | "ongoing" | "completed";

export function getTripPhase(startDate: string, endDate: string): TripPhase {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (today < start) return "upcoming";
  if (today > end) return "completed";
  return "ongoing";
}

const phaseLabels: Record<TripPhase, string> = {
  upcoming: "Sắp tới",
  ongoing: "Đang diễn ra",
  completed: "Đã qua",
};

export function getTripPhaseLabel(phase: TripPhase): string {
  return phaseLabels[phase];
}

export function formatTripDates(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const s = new Date(start).toLocaleDateString("vi-VN", opts);
  const e = new Date(end).toLocaleDateString("vi-VN", opts);
  return `${s} – ${e}`;
}

export function formatBudget(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}
