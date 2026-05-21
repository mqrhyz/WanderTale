export type TravelPace = "relaxed" | "balanced" | "packed";

export type TravelPreference =
  | "nature"
  | "food"
  | "culture"
  | "shopping"
  | "adventure"
  | "relaxation";

export interface TripPreferences {
  tags: TravelPreference[];
}

export type ItineraryActivityCategory =
  | "landmark"
  | "hotel"
  | "restaurant"
  | "cafe"
  | "nature"
  | "activity";

export type ItineraryCuisineType = "pho" | "bun_bo" | "com" | "banh" | "cafe" | "other";

export interface ItinerarySlot {
  title?: string;
  summary?: string;
  place_id?: string;
  start_time?: string;
  end_time?: string;
  suggested_duration_minutes?: number;
  estimated_cost?: number;
  price_vnd?: number;
  price_source?: "scraped" | "estimated" | "ai";
  notes?: string;
  weather_note?: string;
  crowdedness_hint?: string;
  /** Loại địa điểm — dùng routing ảnh placeholder / fetch. */
  category?: ItineraryActivityCategory;
  /** Chỉ khi category = restaurant | cafe. */
  cuisine_type?: ItineraryCuisineType;
  /** URL ảnh preview (link CDN, không lưu file) */
  image_preview_url?: string;
  /** Gallery ảnh từ Google Maps */
  image_preview_urls?: string[];
  /** Link Google Maps tới địa điểm */
  maps_url?: string;
}

export interface ItineraryDayPlan {
  day: number;
  date: string;
  theme: string;
  activities?: ItinerarySlot[];
  /** @deprecated Legacy 3-slot format — derived from `activities` when present. */
  morning: ItinerarySlot;
  afternoon: ItinerarySlot;
  evening: ItinerarySlot;
}

export interface BookingSuggestion {
  name: string;
  category: "hotel" | "restaurant" | "attraction";
  place_id?: string;
  url?: string;
  price_level?: number;
  reason?: string;
  price_vnd?: number;
  price_source?: "scraped" | "estimated" | "ai";
  site?: string;
  scraped_at?: string;
  image_preview_url?: string;
  /** Gallery ảnh phòng từ Google Maps */
  image_preview_urls?: string[];
  maps_url?: string;
}

export interface SuggestedPlace {
  name: string;
  type: "attraction" | "restaurant" | "activity";
  day?: number;
  estimated_cost_vnd?: number;
  duration_minutes?: number;
  note?: string;
  image_preview_url?: string;
  image_preview_urls?: string[];
  maps_url?: string;
}

export interface TripPricingMeta {
  suggested_places: SuggestedPlace[];
  hotel_pricing?: {
    status: string;
    message?: string;
    offers?: Array<{ hotelName: string; priceVnd: number; site: string; bookingUrl?: string }>;
    comparison?: unknown;
  };
}

export interface VoucherSuggestion {
  voucher_id: string;
  code: string;
  title: string;
  partner_name: string;
  reason?: string;
}

export interface GeneratedItinerary {
  destination: string;
  summary: string;
  total_estimated_cost: number;
  risk_warnings: string[];
  days: ItineraryDayPlan[];
  hotel_suggestions: BookingSuggestion[];
  restaurant_suggestions: BookingSuggestion[];
  voucher_suggestions: VoucherSuggestion[];
  pricing_meta?: TripPricingMeta;
}

export interface TripRecord {
  id: string;
  user_id: string;
  destination: string;
  destination_lat: number | null;
  destination_lng: number | null;
  start_date: string;
  end_date: string;
  budget: number;
  preferences: TripPreferences;
  travelers: number;
  pace: TravelPace;
  summary: string | null;
  total_estimated_cost: number | null;
  risk_warnings: string[] | null;
  itinerary_json: GeneratedItinerary | null;
  created_at: string;
  updated_at: string;
}
