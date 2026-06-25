import { enrichHotelOfferGalleries, enrichHotelOfferRoomInfo } from "@wander-tale/hotel-booking-agent";
import type { TripHotelPricingResult } from "./tripHotelPricing.js";

/** Lấy gallery ảnh từ trang Booking cho các offer hiển thị trên trip (chạy nền). */
export async function enrichHotelPricingWithGalleries(
  pricing: TripHotelPricingResult
): Promise<TripHotelPricingResult> {
  if (pricing.offers.length === 0) return pricing;

  try {
    const offersWithGallery = await enrichHotelOfferGalleries(pricing.offers, {
      maxOffers: 4,
      minImages: 2,
      maxImages: 8,
    });
    const offers = await enrichHotelOfferRoomInfo(offersWithGallery, { maxOffers: 4 });

    const comparison =
      pricing.comparison != null
        ? {
            ...pricing.comparison,
            recommended:
              offers.find((o) => o.bookingUrl === pricing.comparison!.recommended.bookingUrl) ??
              pricing.comparison.recommended,
            alternatives: pricing.comparison.alternatives.map(
              (alt) => offers.find((o) => o.bookingUrl === alt.bookingUrl) ?? alt
            ),
          }
        : null;

    return { ...pricing, offers, comparison };
  } catch (e) {
    console.warn("[trip-gallery] enrich failed:", e);
    return pricing;
  }
}
