@file:OptIn(kotlinx.serialization.ExperimentalSerializationApi::class)

package com.wandertale.mobile.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement

@Serializable
data class TripPreferences(val tags: List<String> = emptyList())

@Serializable
data class ItinerarySlot(
    val title: String? = null,
    val summary: String? = null,
    val place_id: String? = null,
    val start_time: String? = null,
    val end_time: String? = null,
    val suggested_duration_minutes: Int? = null,
    val estimated_cost: Double? = null,
    val price_vnd: Double? = null,
    val price_source: String? = null,
    val notes: String? = null,
    val weather_note: String? = null,
    val crowdedness_hint: String? = null,
    val category: String? = null,
    val cuisine_type: String? = null,
    val image_preview_url: String? = null,
    val image_preview_urls: List<String>? = null,
    val maps_url: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
)

@Serializable
data class ItineraryDayPlan(
    val day: Int,
    val date: String,
    val theme: String,
    val activities: List<ItinerarySlot>? = null,
    val morning: ItinerarySlot = ItinerarySlot(),
    val afternoon: ItinerarySlot = ItinerarySlot(),
    val evening: ItinerarySlot = ItinerarySlot(),
)

@Serializable
data class PlaceDistanceFromHotel(
    val place_name: String,
    val distance_km: Double = 0.0,
    val duration_min: Int = 0,
)

@Serializable
data class BookingSuggestion(
    val name: String,
    val category: String = "hotel",
    val place_id: String? = null,
    val url: String? = null,
    val price_level: Int? = null,
    val reason: String? = null,
    val price_vnd: Double? = null,
    val price_source: String? = null,
    val site: String? = null,
    val scraped_at: String? = null,
    val image_preview_url: String? = null,
    val image_preview_urls: List<String>? = null,
    val maps_url: String? = null,
    val distances_to_places: List<PlaceDistanceFromHotel>? = null,
    val avg_distance_km: Double? = null,
    val max_distance_km: Double? = null,
    val room_name: String? = null,
    val room_amenities: List<String>? = null,
)

@Serializable
data class SuggestedPlace(
    val name: String,
    val type: String = "attraction",
    val day: Int? = null,
    val estimated_cost_vnd: Double? = null,
    val duration_minutes: Int? = null,
    val note: String? = null,
    val image_preview_url: String? = null,
    val image_preview_urls: List<String>? = null,
    val maps_url: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
)

@Serializable
data class TripPricingMeta(
    val suggested_places: List<SuggestedPlace> = emptyList(),
    val hotel_pricing: JsonElement? = null,
)

@Serializable
data class VoucherSuggestion(
    val voucher_id: String,
    val code: String,
    val title: String,
    val partner_name: String,
    val reason: String? = null,
)

@Serializable
data class GeneratedItinerary(
    val destination: String = "",
    val summary: String = "",
    val total_estimated_cost: Double = 0.0,
    val risk_warnings: List<String> = emptyList(),
    val days: List<ItineraryDayPlan> = emptyList(),
    val hotel_suggestions: List<BookingSuggestion> = emptyList(),
    val restaurant_suggestions: List<BookingSuggestion> = emptyList(),
    val voucher_suggestions: List<VoucherSuggestion> = emptyList(),
    val pricing_meta: TripPricingMeta? = null,
)

@Serializable
data class TripRecord(
    val id: String,
    val user_id: String? = null,
    val destination: String,
    val destination_lat: Double? = null,
    val destination_lng: Double? = null,
    val start_date: String,
    val end_date: String,
    val budget: Double,
    val preferences: TripPreferences = TripPreferences(),
    val travelers: Int = 1,
    val pace: String = "balanced",
    val summary: String? = null,
    val total_estimated_cost: Double? = null,
    val risk_warnings: List<String>? = null,
    val itinerary_json: GeneratedItinerary? = null,
    /** Ảnh cover thành phố (Pexels) — backend enrich khi list trips. */
    val cover_image_url: String? = null,
    val generation_status: String? = null,
    val hotel_pricing_status: String? = null,
    val created_at: String? = null,
    val updated_at: String? = null,
)

@Serializable
data class TripGenerateRequest(
    val destination: String,
    val start_date: String,
    val end_date: String,
    val budget: Double,
    val preferences: TripPreferences,
    val travelers: Int,
    val pace: String,
    @SerialName("accommodation_style") val accommodation_style: String = "standard",
    val enrich_pricing: Boolean = true,
    val children: Int = 0,
    val rooms: Int = 1,
)

@Serializable
data class TripGenerateTripRef(
    val id: String,
)

@Serializable
data class TripGenerateResponse(
    val trip: TripGenerateTripRef,
    val status: String? = null,
    val itinerary: GeneratedItinerary? = null,
    val suggested_places: List<SuggestedPlace>? = null,
    val hotel_pricing_status: String? = null,
    val staged: Boolean? = null,
)

@Serializable
data class TripPreviewResponse(
    val destination: String,
    val lat: Double,
    val lng: Double,
    val weather: JsonElement? = null,
)

@Serializable
data class DashboardStats(
    val total_trips: Int = 0,
    val total_budget_planned: Double = 0.0,
    val unique_destinations: Int = 0,
    val places_in_itineraries: Int = 0,
    val recent_trips: List<RecentTrip> = emptyList(),
)

@Serializable
data class RecentTrip(
    val id: String,
    val budget: Double,
    val destination: String,
    val created_at: String,
)

@Serializable
data class VoucherRow(
    val id: String,
    val code: String,
    val title: String,
    val description: String? = null,
    val discount_percent: Double? = null,
    val discount_amount: Double? = null,
    val valid_from: String,
    val valid_until: String,
    val terms_url: String? = null,
    val partners: PartnerRef? = null,
)

@Serializable
data class PartnerRef(val name: String? = null, val website: String? = null)

@Serializable
data class PartnerRow(
    val id: String,
    val name: String,
    val website: String? = null,
    val contact_email: String? = null,
    val country: String? = null,
)

@Serializable
data class ProfileRow(
    val id: String,
    val display_name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val is_admin: Boolean = false,
    val is_business: Boolean = false,
    val is_premium: Boolean? = null,
    val subscription_tier: String? = null,
    val subscription_expires_at: String? = null,
)

@Serializable
data class ProfileInsert(
    val id: String,
    val display_name: String? = null,
    val email: String? = null,
    val phone: String? = null,
)

@Serializable
data class ProfilePhonePatch(
    val phone: String? = null,
)

data class AccountInfo(
    val displayName: String,
    val email: String,
    val phone: String,
    val profile: ProfileRow? = null,
)

@Serializable
data class GeocodeAutocompleteItem(
    val ref_id: String,
    val display: String,
    val name: String = "",
    val address: String = "",
    val distance_km: Double? = null,
)

@Serializable
data class GeocodeAutocompleteResponse(
    val results: List<GeocodeAutocompleteItem> = emptyList(),
)

@Serializable
data class ApiErrorBody(val error: JsonElement? = null, val message: String? = null)
