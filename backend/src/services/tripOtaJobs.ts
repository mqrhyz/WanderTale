import type { TripGenerateInput } from "../schemas/trip.js";
import type { GeneratedItinerary } from "./openaiItinerary.js";
import { updateTripAfterOtaPricing } from "./itineraryPersistence.js";
import { fetchHotelPricingForTrip, type TripHotelPricingResult } from "./tripHotelPricing.js";
import { enrichItineraryWithPricing } from "./tripPricingEnrichment.js";
import { enrichHotelPricingWithGalleries } from "./tripHotelGalleryEnrichment.js";
import { emitTripEvent } from "../lib/tripEvents.js";
import { scoreOtaHotelsForTrip } from "./tripHotelLocationService.js";
import { applyCoordMapsToItinerary } from "./tripCoordsEnrichment.js";
import type { SuggestedPlace } from "./tripSuggestPlaces.js";

/** Job A — quét OTA (thành phố) → VietMap xếp hạng vị trí KS. */
export async function scrapeHotelPrices(params: {
  tripId: string;
  userId: string;
  body: TripGenerateInput;
  itinerary: GeneratedItinerary;
  suggestedPlaces: SuggestedPlace[];
  destination: string;
}): Promise<{ itinerary: GeneratedItinerary; hotelPricing: TripHotelPricingResult }> {
  const hotelPricing = await fetchHotelPricingForTrip(params.body);

  const routeOptimization = await scoreOtaHotelsForTrip({
    destination: params.destination,
    suggestedPlaces: params.suggestedPlaces,
    itinerary: params.itinerary,
    offers: hotelPricing.offers,
  });

  if (routeOptimization.status === "ok") {
    emitTripEvent(params.tripId, "route_optimized", {
      hotels: routeOptimization.recommended_hotel_names,
      places: routeOptimization.places.length,
    });
  }

  const pricingWithRoute = { ...hotelPricing, route_optimization: routeOptimization };

  let itinerary = enrichItineraryWithPricing(
    params.itinerary,
    params.suggestedPlaces,
    pricingWithRoute,
    params.destination,
    routeOptimization
  );
  itinerary = applyCoordMapsToItinerary(itinerary, params.destination, routeOptimization);

  await updateTripAfterOtaPricing({
    userId: params.userId,
    tripId: params.tripId,
    itinerary,
    hotelPricingStatus: hotelPricing.status,
    generationStatus: "pricing_pending",
  });

  emitTripEvent(params.tripId, "prices_ready", {
    hotel_pricing_status: hotelPricing.status,
    hotel_count: itinerary.hotel_suggestions?.length ?? 0,
  });

  return { itinerary, hotelPricing: pricingWithRoute };
}

/** Job B — gallery ảnh KS từ OTA pages (chạy sau / song song Job A). */
export async function enrichHotelImagesJob(params: {
  tripId: string;
  userId: string;
  itinerary: GeneratedItinerary;
  hotelPricing: TripHotelPricingResult;
  suggestedPlaces: SuggestedPlace[];
  destination: string;
}): Promise<GeneratedItinerary> {
  const enrichedPricing = await enrichHotelPricingWithGalleries(params.hotelPricing);
  const routeOpt = params.hotelPricing.route_optimization;
  const itinerary = applyCoordMapsToItinerary(
    enrichItineraryWithPricing(
      params.itinerary,
      params.suggestedPlaces,
      { ...enrichedPricing, route_optimization: routeOpt },
      params.destination,
      routeOpt
    ),
    params.destination,
    routeOpt
  );

  await updateTripAfterOtaPricing({
    userId: params.userId,
    tripId: params.tripId,
    itinerary,
    hotelPricingStatus: enrichedPricing.status,
    generationStatus: "pricing_pending",
  });

  emitTripEvent(params.tripId, "hotel_images_ready", {
    hotels: itinerary.hotel_suggestions?.map((h) => ({
      name: h.name,
      image_count: Array.isArray(h.image_preview_urls) ? h.image_preview_urls.length : 0,
    })),
  });

  return itinerary;
}
