import type { WizardValues } from "@/schemas/wizard";
import { otaSearchLabel } from "@wander-tale/hotel-booking-agent";

export { ROOM_TYPES } from "@/lib/room-types";

export type HotelSearchFields = {
  roomType: string;
  children: number;
  rooms: number;
  hotelNotes: string;
};

export type UnifiedPlannerForm = WizardValues &
  HotelSearchFields & {
    phone: string;
  };

export type HotelSearchForm = {
  city: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
  roomType: string;
  notes: string;
};

export function cityFromDestination(destination: string): string {
  return otaSearchLabel(destination);
}

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** OpenWeather free forecast ~5 ngày tới — mặc định chọn trong phạm vi đó */
export function defaultUnifiedPlan(): UnifiedPlannerForm {
  const start = todayPlus(2);
  const end = todayPlus(5);
  return {
    destination: "",
    start_date: start,
    end_date: end,
    budget: 2000,
    travelers: 2,
    pace: "balanced",
    preferences: [],
    roomType: "",
    children: 0,
    rooms: 1,
    hotelNotes: "",
    phone: "",
  };
}

export function hotelSearchFormFromPlan(plan: UnifiedPlannerForm): HotelSearchForm {
  return {
    city: cityFromDestination(plan.destination),
    checkIn: plan.start_date,
    checkOut: plan.end_date,
    adults: plan.travelers,
    children: plan.children,
    rooms: plan.rooms,
    roomType: plan.roomType,
    notes: plan.hotelNotes,
  };
}

export function buildHotelSearchMessage(f: HotelSearchForm, tripBudgetNote?: string): string {
  const parts: string[] = [
    `Đặt phòng khách sạn tại ${f.city}`,
    `từ ${f.checkIn} đến ${f.checkOut}`,
    `${f.adults} người lớn`,
    f.children > 0 ? `${f.children} trẻ em` : null,
    `${f.rooms} phòng`,
  ].filter((p): p is string => Boolean(p));
  let msg = parts.join(", ") + ".";
  if (f.roomType) msg += ` Ưu tiên loại phòng: ${f.roomType}.`;
  if (tripBudgetNote) msg += ` ${tripBudgetNote}.`;
  if (f.notes.trim()) msg += ` Ghi chú: ${f.notes.trim()}`;
  return msg;
}

export function hotelSyncFromPlan(plan: UnifiedPlannerForm) {
  return {
    city: cityFromDestination(plan.destination),
    checkIn: plan.start_date,
    checkOut: plan.end_date,
    adults: plan.travelers,
    budgetNote:
      plan.budget > 0
        ? `Ngân sách chuyến ~${plan.budget.toLocaleString("vi-VN")} VND (gồm đặt phòng & chi tiêu, ước tính)`
        : undefined,
  };
}
