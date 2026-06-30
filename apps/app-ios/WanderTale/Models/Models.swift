import Foundation

struct TripPreferences: Codable {
    var tags: [String] = []
}

struct ItinerarySlot: Codable, Identifiable {
    // Stable ID: dùng combination title+start_time hoặc fallback index-based từ caller
    var id: String { "\(title ?? "slot")-\(start_time ?? "notime")-\(place_id ?? "")" }
    var title: String?
    var summary: String?
    var place_id: String?
    var start_time: String?
    var end_time: String?
    var suggested_duration_minutes: Int?
    var estimated_cost: Double?
    var price_vnd: Double?
    var price_source: String?
    var notes: String?
    var weather_note: String?
    var crowdedness_hint: String?
    var category: String?
    var cuisine_type: String?
    var image_preview_url: String?
    var image_preview_urls: [String]?
    var maps_url: String?
    var lat: Double?
    var lng: Double?
}

struct ItineraryDayPlan: Codable, Identifiable {
    var id: Int { day }
    let day: Int
    let date: String
    let theme: String
    var activities: [ItinerarySlot]?
    var morning: ItinerarySlot?
    var afternoon: ItinerarySlot?
    var evening: ItinerarySlot?
}

struct BookingSuggestion: Codable, Identifiable {
    var id: String { "\(name)-\(site ?? "")-\(price_vnd.map { String($0) } ?? "")" }
    let name: String
    var category: String = "hotel"
    var place_id: String?
    var url: String?
    var price_level: Int?
    var reason: String?
    var price_vnd: Double?
    var price_source: String?
    var site: String?
    var scraped_at: String?
    var image_preview_url: String?
    var image_preview_urls: [String]?
    var maps_url: String?
    var avg_distance_km: Double?
    var room_name: String?
    var room_amenities: [String]?
}

struct VoucherSuggestion: Codable, Identifiable {
    let voucher_id: String
    var id: String { voucher_id }
    let code: String
    let title: String
    let partner_name: String
    var reason: String?
}

struct GeneratedItinerary: Codable {
    var destination: String = ""
    var summary: String = ""
    var total_estimated_cost: Double = 0
    var risk_warnings: [String] = []
    var days: [ItineraryDayPlan] = []
    var hotel_suggestions: [BookingSuggestion] = []
    var voucher_suggestions: [VoucherSuggestion] = []
}

struct TripRecord: Codable, Identifiable {
    let id: String
    var user_id: String?
    let destination: String
    var destination_lat: Double?
    var destination_lng: Double?
    let start_date: String
    let end_date: String
    let budget: Double
    var summary: String?
    var total_estimated_cost: Double?
    var risk_warnings: [String]?
    var itinerary_json: GeneratedItinerary?
    var cover_image_url: String?
    var generation_status: String?
    var hotel_pricing_status: String?
    var created_at: String?
    var updated_at: String?
    var travelers: Int?
    var pace: String?
}

struct TripGenerateRequest: Codable {
    let destination: String
    let start_date: String
    let end_date: String
    let budget: Double
    let preferences: TripPreferences
    let travelers: Int
    let pace: String
    let accommodation_style: String
    let enrich_pricing: Bool
    var children: Int = 0
    var rooms: Int = 1
}

struct TripGenerateTripRef: Codable { let id: String }

struct TripGenerateResponse: Codable {
    let trip: TripGenerateTripRef
    var status: String?
    var itinerary: GeneratedItinerary?
    var hotel_pricing_status: String?
}

struct DashboardStats: Codable {
    var total_trips: Int = 0
    var total_budget_planned: Double = 0
    var unique_destinations: Int = 0
    var places_in_itineraries: Int = 0
}

struct ProfileRow: Codable {
    let id: String
    var display_name: String?
    var email: String?
    var phone: String?
    var is_admin: Bool = false
    var is_business: Bool = false
    var is_premium: Bool?
    var subscription_tier: String?
    var subscription_expires_at: String?
}

struct AccountInfo {
    var displayName: String
    var email: String
    var phone: String
    var profile: ProfileRow?
}

struct GeocodeAutocompleteItem: Codable, Identifiable {
    let ref_id: String
    var id: String { ref_id }
    let display: String
    var name: String = ""
    var address: String = ""
}

struct GeocodeAutocompleteResponse: Codable {
    var results: [GeocodeAutocompleteItem] = []
}

struct PartnerRow: Codable, Identifiable {
    let id: String
    let name: String
    var website: String?
}

struct VoucherRow: Codable, Identifiable {
    let id: String
    let code: String
    let title: String
    var valid_from: String
    var valid_until: String
}

struct ApiErrorBody: Codable {
    var message: String?
    var error: String?

    var resolvedMessage: String? { message ?? error }
}

enum TripPhase { case upcoming, ongoing, completed }
