import type { TripGenerateInput } from "../schemas/trip.js";
import { generateItinerary, isFallbackSkeletonItinerary, type GeneratedItinerary } from "./openaiItinerary.js";
import {
  markTripGenerationFailed,
  persistGeneratedTrip,
  updateTripAfterOtaPricing,
} from "./itineraryPersistence.js";
import { buildTripGenerationContext, buildMinimalTripContextForSkeleton, type TripGenerationContext } from "./tripGenerationContext.js";
import { fetchHotelPricingForTrip, type TripHotelPricingResult } from "./tripHotelPricing.js";
import { enrichItineraryWithPricing } from "./tripPricingEnrichment.js";
import { applySpecificPlacesToAgenda } from "./tripAgendaPlaces.js";
import {
  enrichItineraryWithAgendaImages,
  enrichItineraryWithInstantPlaceholders,
  enrichItineraryWithSearchMaps,
} from "./tripPlaceMediaEnrichment.js";
import { enrichItineraryWithCoordinates, applyCoordMapsToItinerary, prepareItineraryCoordsForMedia } from "./tripCoordsEnrichment.js";
import { mergeItineraryPreserveMedia } from "./tripItineraryMerge.js";
import { scrapeHotelPrices, enrichHotelImagesJob } from "./tripOtaJobs.js";
import { enrichHotelPricingWithGalleries } from "./tripHotelGalleryEnrichment.js";
import { scoreOtaHotelsForTrip } from "./tripHotelLocationService.js";
import { suggestPlacesForTrip, type SuggestedPlacesPlan, type SuggestedPlace } from "./tripSuggestPlaces.js";
import type { TripGenerationStatus, TripHotelPricingStatus } from "./tripGenerationStatus.js";
import { getDayActivities } from "./tripAgendaActivities.js";
import { env } from "../lib/env.js";
import { emitTripEvent, type TripEventType } from "../lib/tripEvents.js";
import { getSupabase } from "../lib/supabase.js";
import {
  enqueueTripEnrichment,
  scheduleLocalTripEnrichment,
  markTripEnrichmentJobComplete,
  markTripEnrichmentJobFailed,
  recordTripProgress,
  tryStartTripEnrichmentJob,
  TRIP_ENRICHMENT_MAX_ATTEMPTS,
} from "./tripEnrichmentJobService.js";

function countAgendaImageSlots(itinerary: GeneratedItinerary): number {
  let n = 0;
  for (const d of itinerary.days) {
    for (const slot of getDayActivities(d)) {
      const title = slot.title?.trim();
      if (title && title !== "—") n += 1;
    }
  }
  return n;
}

export type TripGenerationResult = {
  trip: { id: string };
  status: TripGenerationStatus;
  itinerary?: GeneratedItinerary;
  suggested_places?: SuggestedPlacesPlan["places"];
  hotel_pricing_status: TripHotelPricingStatus | string;
};

function pendingHotelPricing(): TripHotelPricingResult {
  return {
    status: "skipped",
    message: "AI đang tìm khách sạn phù hợp ngân sách…",
    offers: [],
    comparison: null,
    siteScans: [],
    errors: [],
  };
}

function skippedHotelPricing(): TripHotelPricingResult {
  return {
    status: "skipped",
    offers: [],
    comparison: null,
    siteScans: [],
    errors: [],
  };
}

async function loadSuggestedPlacesWithRetry(
  body: TripGenerateInput,
  context: TripGenerationContext
): Promise<SuggestedPlace[]> {
  try {
    const plan = await suggestPlacesForTrip(body, context);
    if (plan.places.length === 0) {
      console.warn("[trip-gen] suggested places empty — continue with skeleton");
    }
    return plan.places;
  } catch (error) {
    console.warn("[trip-gen] suggested places failed — continue with skeleton:", error);
    return [];
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function publishTripProgress(tripId: string, type: TripEventType, payload: Record<string, unknown>): Promise<void> {
  await recordTripProgress(tripId, type, payload);
  emitTripEvent(tripId, type, payload);
}

/** Quét OTA + ảnh agenda + ảnh KS — jobs tách, emit SSE events. */
export async function enrichTripWithOtaInBackground(params: {
  tripId: string;
  userId: string;
  body: TripGenerateInput;
  context: TripGenerationContext;
  suggestedPlaces: SuggestedPlacesPlan["places"];
  baseItinerary: GeneratedItinerary;
  loadSuggestedPlaces?: boolean;
}): Promise<void> {
  const { tripId, userId, body, baseItinerary, loadSuggestedPlaces = false, context } = params;
  const t0 = Date.now();
  const destination = body.destination;

  try {
    const suggestedPlaces = loadSuggestedPlaces
      ? await loadSuggestedPlacesWithRetry(body, context)
      : (params.suggestedPlaces ?? []);

    let itinerary = baseItinerary;

    // Nếu skeleton ban đầu là fallback do Gemini lỗi/quota, thử sinh lại lịch đầy đủ
    // trong nền khi đã có suggested places và context đầy đủ hơn.
    if (isFallbackSkeletonItinerary(itinerary)) {
      try {
        const regenerated = await generateItinerary({
          destination: body.destination,
          dateRangeLabel: `${body.start_date} → ${body.end_date}`,
          numDays: context.dates.length,
          budget: body.budget,
          preferences: body.preferences,
          travelers: body.travelers,
          pace: body.pace,
          accommodation_style: body.accommodation_style,
          weather: context.weather,
          traffic: context.traffic,
          places: context.places,
          vouchers: context.vouchers,
          suggestedPlaces,
          hotelPricing: pendingHotelPricing(),
        });
        itinerary = regenerated;
        console.info(`[trip-ota] regenerated fallback itinerary for trip=${tripId}`);
      } catch (regenError) {
        console.warn(`[trip-ota] failed to regenerate fallback itinerary for trip=${tripId}:`, regenError);
      }
    }

    if (suggestedPlaces.length > 0) {
      itinerary = applySpecificPlacesToAgenda(itinerary, suggestedPlaces);
    }
    itinerary = enrichItineraryWithSearchMaps(itinerary, destination);
    itinerary = enrichItineraryWithInstantPlaceholders(itinerary);

    await updateTripAfterOtaPricing({
      userId,
      tripId,
      itinerary,
      hotelPricingStatus: "pending",
      generationStatus: "pricing_pending",
    });
    await publishTripProgress(tripId, "skeleton_ready", { generation_status: "pricing_pending" });
    console.info(`[trip-ota] skeleton maps saved ${Date.now() - t0}ms`);

    const imageSlotTotal = countAgendaImageSlots(itinerary);
    await publishTripProgress(tripId, "images_progress", { filled: 0, total: imageSlotTotal });

    const agendaImagesPromise = enrichItineraryWithAgendaImages(itinerary, destination, {
      onProgress: ({ title, urls, filled, total }) => {
        emitTripEvent(tripId, "slot_image", {
          title,
          image_preview_url: urls[0],
          image_preview_urls: urls,
          filled,
          total,
        });
        void recordTripProgress(tripId, "images_progress", { filled, total });
        emitTripEvent(tripId, "images_progress", { filled, total });
      },
    }).then(async (withImages) => {
      await updateTripAfterOtaPricing({
        userId,
        tripId,
        itinerary: withImages,
        hotelPricingStatus: "pending",
        generationStatus: "pricing_pending",
      });
      await publishTripProgress(tripId, "images_ready", { generation_status: "pricing_pending" });
      console.info(`[trip-media] agenda images ${Date.now() - t0}ms`);
      return withImages;
    });

    const otaPromise = scrapeHotelPrices({
      tripId,
      userId,
      body,
      itinerary,
      suggestedPlaces,
      destination,
    });

    const [{ hotelPricing, itinerary: afterOtaItinerary }, withImages] = await Promise.all([
      otaPromise,
      agendaImagesPromise,
    ]);
    const itineraryWithPricingAndImages = mergeItineraryPreserveMedia(withImages, afterOtaItinerary);

    const withCoords = await prepareItineraryCoordsForMedia(
      itineraryWithPricingAndImages,
      destination,
      hotelPricing.route_optimization
    );

    await updateTripAfterOtaPricing({
      userId,
      tripId,
      itinerary: withCoords,
      hotelPricingStatus: hotelPricing.status,
      generationStatus: "pricing_pending",
    });

    let merged = enrichItineraryWithPricing(
      withCoords,
      suggestedPlaces,
      hotelPricing,
      destination,
      hotelPricing.route_optimization
    );
    merged = await applyCoordMapsToItinerary(merged, destination, hotelPricing.route_optimization);

    await updateTripAfterOtaPricing({
      userId,
      tripId,
      itinerary: merged,
      hotelPricingStatus: hotelPricing.status,
      generationStatus: "pricing_pending",
    });

    const [hotelImagesResult, coordsResult] = await Promise.allSettled([
      enrichHotelImagesJob({
        tripId,
        userId,
        itinerary: merged,
        hotelPricing,
        suggestedPlaces,
        destination,
      }),
      enrichItineraryWithCoordinates(merged, destination, hotelPricing.route_optimization),
    ]);

    const partialErrors: Array<{ phase: string; message: string }> = [];
    const withHotelImages =
      hotelImagesResult.status === "fulfilled"
        ? hotelImagesResult.value
        : merged;
    if (hotelImagesResult.status === "rejected") {
      partialErrors.push({ phase: "hotel_images", message: errorMessage(hotelImagesResult.reason) });
    }

    const withFinalCoords =
      coordsResult.status === "fulfilled"
        ? coordsResult.value
        : merged;
    if (coordsResult.status === "rejected") {
      partialErrors.push({ phase: "coordinates", message: errorMessage(coordsResult.reason) });
    }

    const coordMerged = {
      ...withHotelImages,
      days: withFinalCoords.days,
      hotel_suggestions: withFinalCoords.hotel_suggestions,
      pricing_meta: {
        ...(withHotelImages.pricing_meta as Record<string, unknown> | undefined),
        ...(withFinalCoords.pricing_meta as Record<string, unknown> | undefined),
        enrichment_errors: partialErrors.length > 0 ? partialErrors : undefined,
        enrichment_status: partialErrors.length > 0 ? "partial_ready" : "ready",
      },
    };
    const finalItinerary = mergeItineraryPreserveMedia(withFinalCoords, coordMerged as GeneratedItinerary);
    await updateTripAfterOtaPricing({
      userId,
      tripId,
      itinerary: finalItinerary,
      hotelPricingStatus: hotelPricing.status,
      generationStatus: "ready",
    });
    await publishTripProgress(tripId, "coords_ready", { partial_errors: partialErrors });
    await markTripEnrichmentJobComplete(tripId, {
      status: partialErrors.length > 0 ? "partial_ready" : "ready",
      partial_errors: partialErrors,
    });
    emitTripEvent(tripId, "complete", {
      status: partialErrors.length > 0 ? "partial_ready" : "ready",
      partial_errors: partialErrors,
    });
    console.info(`[trip-ota] complete ${Date.now() - t0}ms partialErrors=${partialErrors.length}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : "OTA background failed";
    const fallback = enrichItineraryWithSearchMaps(
      enrichItineraryWithPricing(baseItinerary, params.suggestedPlaces, {
        status: "error",
        message,
        offers: [],
        comparison: null,
        siteScans: [],
        errors: [{ site: "ota", message }],
      }, destination),
      destination
    );
    await updateTripAfterOtaPricing({
      userId,
      tripId,
      itinerary: fallback,
      hotelPricingStatus: "error",
      generationStatus: "ready",
    }).catch(() => markTripGenerationFailed(userId, tripId, message));
    await markTripEnrichmentJobFailed(tripId, message);
    emitTripEvent(tripId, "complete", { status: "ready", error: message });
  }
}

export async function processTripEnrichment(tripId: string): Promise<{ status: string }> {
  const job = await tryStartTripEnrichmentJob(tripId);
  if (!job) return { status: "skipped" };
  if (job.attempts > TRIP_ENRICHMENT_MAX_ATTEMPTS) {
    await markTripEnrichmentJobFailed(tripId, "max_attempts_exceeded");
    return { status: "failed" };
  }

  const { data: trip, error } = await getSupabase()
    .from("trips")
    .select("id,user_id,generation_status,hotel_pricing_status")
    .eq("id", tripId)
    .eq("user_id", job.user_id)
    .maybeSingle();
  if (error || !trip) {
    const message = error?.message ?? "trip_not_found";
    await markTripEnrichmentJobFailed(tripId, message);
    return { status: "failed" };
  }

  await enrichTripWithOtaInBackground({
    tripId,
    userId: job.payload.userId,
    body: job.payload.body,
    context: job.payload.context,
    suggestedPlaces: job.payload.suggestedPlaces ?? [],
    baseItinerary: job.payload.baseItinerary,
    loadSuggestedPlaces: job.payload.loadSuggestedPlaces ?? true,
  });
  return { status: "processed" };
}

/**
 * P2 staged: skeleton lịch (~8–15s, 1 lần LLM) → response → OTA + gợi ý địa điểm nền.
 */
export async function runTripGenerationStaged(
  userId: string,
  body: TripGenerateInput
): Promise<TripGenerationResult> {
  const enrichPricing = body.enrich_pricing !== false;
  const t0 = Date.now();

  const context = await buildMinimalTripContextForSkeleton(body);

  let itinerary = await generateItinerary({
    destination: body.destination,
    dateRangeLabel: `${body.start_date} → ${body.end_date}`,
    numDays: context.dates.length,
    budget: body.budget,
    preferences: body.preferences,
    travelers: body.travelers,
    pace: body.pace,
    accommodation_style: body.accommodation_style,
    weather: context.weather,
    traffic: context.traffic,
    places: context.places,
    vouchers: context.vouchers,
    suggestedPlaces: [],
    hotelPricing: enrichPricing ? pendingHotelPricing() : skippedHotelPricing(),
    skeleton: enrichPricing,
  });

  itinerary = enrichItineraryWithPricing(
    itinerary,
    [],
    enrichPricing ? pendingHotelPricing() : skippedHotelPricing()
  );

  itinerary = enrichItineraryWithSearchMaps(itinerary, body.destination);
  itinerary = enrichItineraryWithInstantPlaceholders(itinerary);

  const trip = await persistGeneratedTrip({
    userId,
    body,
    context,
    itinerary,
    generationStatus: enrichPricing ? "pricing_pending" : "ready",
    hotelPricingStatus: enrichPricing ? "pending" : "skipped",
  });

  const tripId = trip.id as string;

  if (enrichPricing) {
    await enqueueTripEnrichment(tripId, {
      userId,
      body,
      context,
      baseItinerary: itinerary,
      suggestedPlaces: [],
      loadSuggestedPlaces: true,
    });
    // Local best-effort + durable DB row. Prefer Cloud Scheduler:
    // POST /api/internal/trips/enrichment/sweep with x-worker-token.
    scheduleLocalTripEnrichment(tripId, processTripEnrichment);
  }

  console.info(
    `[trip-gen] staged skeleton trip=${tripId} ${Date.now() - t0}ms (LLM×1, OTA background)`
  );

  return {
    trip: { id: tripId },
    status: enrichPricing ? "pricing_pending" : "ready",
    itinerary,
    suggested_places: [],
    hotel_pricing_status: enrichPricing ? "pending" : "skipped",
  };
}

/**
 * Sync: chờ OTA + lịch xong (fallback khi tắt staged).
 */
export async function runTripGeneration(
  userId: string,
  body: TripGenerateInput
): Promise<TripGenerationResult> {
  const enrichPricing = body.enrich_pricing !== false;

  let placesPromise: Promise<SuggestedPlacesPlan> | undefined;
  const context = await buildTripGenerationContext(body, {
    onWeatherReady: (minimal) => {
      placesPromise = suggestPlacesForTrip(body, minimal);
    },
  });
  const suggestedPlacesPlan = await (placesPromise ?? suggestPlacesForTrip(body, context));

  let hotelPricing = enrichPricing ? await fetchHotelPricingForTrip(body) : skippedHotelPricing();
  let routeOptimization = undefined;

  if (enrichPricing && hotelPricing.offers.length > 0) {
    routeOptimization = await scoreOtaHotelsForTrip({
      destination: body.destination,
      suggestedPlaces: suggestedPlacesPlan.places,
      offers: hotelPricing.offers,
    });
    hotelPricing = { ...hotelPricing, route_optimization: routeOptimization };
  }

  let itinerary = await generateItinerary({
    destination: body.destination,
    dateRangeLabel: `${body.start_date} → ${body.end_date}`,
    numDays: context.dates.length,
    budget: body.budget,
    preferences: body.preferences,
    travelers: body.travelers,
    pace: body.pace,
    accommodation_style: body.accommodation_style,
    weather: context.weather,
    traffic: context.traffic,
    places: context.places,
    vouchers: context.vouchers,
    suggestedPlaces: suggestedPlacesPlan.places,
    hotelPricing,
  });

  if (enrichPricing) {
    itinerary = applySpecificPlacesToAgenda(itinerary, suggestedPlacesPlan.places);
    itinerary = enrichItineraryWithPricing(itinerary, suggestedPlacesPlan.places, hotelPricing, body.destination, routeOptimization);
    itinerary = enrichItineraryWithSearchMaps(itinerary, body.destination);
    itinerary = await prepareItineraryCoordsForMedia(itinerary, body.destination, routeOptimization);
    itinerary = await enrichItineraryWithAgendaImages(itinerary, body.destination);
    const enrichedPricing = await enrichHotelPricingWithGalleries(hotelPricing);
    itinerary = enrichItineraryWithPricing(
      itinerary,
      suggestedPlacesPlan.places,
      { ...enrichedPricing, route_optimization: routeOptimization },
      body.destination,
      routeOptimization
    );
    itinerary = await applyCoordMapsToItinerary(itinerary, body.destination, routeOptimization);
    itinerary = await enrichItineraryWithCoordinates(
      itinerary,
      body.destination,
      routeOptimization
    );
  }

  const trip = await persistGeneratedTrip({
    userId,
    body,
    context,
    itinerary,
    generationStatus: "ready",
    hotelPricingStatus: hotelPricing.status,
  });

  return {
    trip: { id: trip.id as string },
    status: "ready",
    itinerary,
    suggested_places: suggestedPlacesPlan.places,
    hotel_pricing_status: hotelPricing.status,
  };
}

export function useStagedTripGeneration(body: TripGenerateInput): boolean {
  return body.enrich_pricing !== false && env.TRIP_STAGED_GENERATION;
}
