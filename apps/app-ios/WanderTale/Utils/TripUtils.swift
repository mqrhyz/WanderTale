import Foundation
import SwiftUI

enum FormatUtils {
    static func formatVnd(_ n: Double?) -> String {
        guard let n, n.isFinite else { return "—" }
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.locale = Locale(identifier: "vi_VN")
        f.maximumFractionDigits = 0
        return f.string(from: NSNumber(value: n)) ?? "—"
    }

    static func formatCompactVnd(_ n: Double?) -> String {
        guard let n, n.isFinite else { return "—" }
        let abs = Swift.abs(n)
        if abs >= 1_000_000 {
            let v = n / 1_000_000
            return "\(trimOneDecimal(v))tr ₫"
        }
        if abs >= 1_000 { return "\(Int((n / 1_000).rounded()))k" }
        return formatVnd(n)
    }

    private static func trimOneDecimal(_ v: Double) -> String {
        let rounded = (v * 10).rounded() / 10
        if rounded.truncatingRemainder(dividingBy: 1) == 0 { return String(Int(rounded)) }
        return String(format: "%.1f", rounded)
    }

    static func formatDateRange(start: String, end: String) -> String {
        let fmt = DateFormatter()
        fmt.locale = Locale(identifier: "en_US_POSIX")
        fmt.dateFormat = "yyyy-MM-dd"
        guard let s = fmt.date(from: start), let e = fmt.date(from: end) else { return "\(start) – \(end)" }
        fmt.locale = Locale(identifier: "vi_VN")
        fmt.dateFormat = "dd/MM/yyyy"
        return "\(fmt.string(from: s)) - \(fmt.string(from: e))"
    }

    static func formatDayShort(_ date: String) -> String {
        let inFmt = DateFormatter()
        inFmt.locale = Locale(identifier: "en_US_POSIX")
        inFmt.dateFormat = "yyyy-MM-dd"
        guard let d = inFmt.date(from: date) else { return date }
        let out = DateFormatter()
        out.locale = Locale(identifier: "vi_VN")
        out.setLocalizedDateFormatFromTemplate("dMMM")
        return out.string(from: d)
    }
}

enum TripUtils {
    private static let enrichmentMaxMs: TimeInterval = 30 * 60

    static func getTripPhase(start: String, end: String) -> TripPhase {
        let fmt = DateFormatter()
        fmt.locale = Locale(identifier: "en_US_POSIX")
        fmt.dateFormat = "yyyy-MM-dd"
        guard let s = fmt.date(from: start), let e = fmt.date(from: end) else { return .upcoming }
        let today = Calendar.current.startOfDay(for: Date())
        if today < s { return .upcoming }
        if today > e { return .completed }
        return .ongoing
    }

    static func tripPhaseLabel(_ phase: TripPhase) -> String {
        switch phase {
        case .upcoming: return "Sắp tới"
        case .ongoing: return "Đang diễn ra"
        case .completed: return "Đã qua"
        }
    }

    static func slotHasContent(_ slot: ItinerarySlot?) -> Bool {
        let title = slot?.title?.trimmingCharacters(in: .whitespaces) ?? ""
        return !title.isEmpty && title != "—"
    }

    static func getDayActivities(_ day: ItineraryDayPlan) -> [ItinerarySlot] {
        if let activities = day.activities?.filter({ slotHasContent($0) }), !activities.isEmpty {
            return activities.sorted { parseMinutes($0.start_time) < parseMinutes($1.start_time) }
        }
        return [day.morning, day.afternoon, day.evening].compactMap { slot in
            slotHasContent(slot) ? slot : nil
        }
    }

    static func formatSlotClock(_ time: String?) -> String {
        let t = time?.trimmingCharacters(in: .whitespaces) ?? ""
        if t.count >= 5, t[t.index(t.startIndex, offsetBy: 2)] == ":" {
            return String(t.prefix(5))
        }
        return t.isEmpty ? "—" : t
    }

    static func tripNeedsOtaPolling(_ trip: TripRecord) -> Bool {
        let status = trip.generation_status ?? ""
        if status == "ready" || status == "failed" { return false }
        let otaActive = ["pricing_pending", "generating"].contains(status) || trip.hotel_pricing_status == "pending"
        guard otaActive else { return false }
        return withinEnrichmentWindow(trip)
    }

    static func tripNeedsMediaPolling(_ trip: TripRecord) -> Bool {
        guard withinEnrichmentWindow(trip) else { return false }
        let hotels = trip.itinerary_json?.hotel_suggestions ?? []
        if hotels.contains(where: { hotelImages($0).isEmpty }) && !hotels.isEmpty { return true }
        for day in trip.itinerary_json?.days ?? [] {
            for slot in getDayActivities(day) where slotImages(slot).isEmpty {
                return true
            }
        }
        return false
    }

    static func tripNeedsPolling(_ trip: TripRecord) -> Bool {
        tripNeedsOtaPolling(trip) || tripNeedsMediaPolling(trip)
    }

    static func slotImages(_ slot: ItinerarySlot) -> [String] {
        if let urls = slot.image_preview_urls?.filter({ !$0.isEmpty }), !urls.isEmpty { return urls }
        if let url = slot.image_preview_url, !url.isEmpty { return [url] }
        return []
    }

    static func hotelImages(_ hotel: BookingSuggestion) -> [String] {
        if let urls = hotel.image_preview_urls?.filter({ !$0.isEmpty }), let first = urls.first { return [first] }
        if let url = hotel.image_preview_url, !url.isEmpty { return [url] }
        return []
    }

    static func applyingSlotImage(
        to trip: TripRecord,
        title: String,
        imageURL: String,
        imageURLs: [String]?
    ) -> TripRecord {
        var updated = trip
        guard var itinerary = updated.itinerary_json else { return trip }
        let target = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !target.isEmpty else { return trip }
        let urls = (imageURLs ?? [imageURL]).filter { !$0.isEmpty }
        guard let first = urls.first else { return trip }

        func patch(_ slot: ItinerarySlot?) -> ItinerarySlot? {
            guard var slot else { return nil }
            guard slot.title?.trimmingCharacters(in: .whitespacesAndNewlines) == target else { return slot }
            slot.image_preview_url = first
            slot.image_preview_urls = urls
            return slot
        }

        itinerary.days = itinerary.days.map { day in
            var patched = day
            patched.activities = day.activities?.map { patch($0) ?? $0 }
            patched.morning = patch(day.morning)
            patched.afternoon = patch(day.afternoon)
            patched.evening = patch(day.evening)
            return patched
        }
        updated.itinerary_json = itinerary
        return updated
    }

    /// Merge: giữ lại image_preview_url đã có ở trip cũ khi trip mới thiếu.
    static func mergingSlotImages(from old: TripRecord?, into new: TripRecord) -> TripRecord {
        guard let oldItinerary = old?.itinerary_json else { return new }
        guard var newItinerary = new.itinerary_json else { return new }

        // Build map title → image from old
        var imageMap: [String: (String?, [String]?)] = [:]
        for day in oldItinerary.days {
            for slot in (day.activities ?? []) + [day.morning, day.afternoon, day.evening].compactMap({ $0 }) {
                let title = slot.title?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
                guard !title.isEmpty else { continue }
                if let url = slot.image_preview_url, !url.isEmpty {
                    imageMap[title] = (slot.image_preview_url, slot.image_preview_urls)
                }
            }
        }

        guard !imageMap.isEmpty else { return new }

        newItinerary.days = newItinerary.days.map { day in
            var patched = day
            patched.activities = day.activities?.map { slot in
                var s = slot
                let title = s.title?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
                if (s.image_preview_url ?? "").isEmpty, let cached = imageMap[title] {
                    s.image_preview_url = cached.0
                    if (s.image_preview_urls ?? []).isEmpty { s.image_preview_urls = cached.1 }
                }
                return s
            }
            return patched
        }

        var result = new
        result.itinerary_json = newItinerary
        return result
    }

    static func parseHotelRating(_ reason: String?, _ priceLevel: Int?) -> Int {
        if let reason, let range = reason.range(of: #"★([\d.]+)"#, options: .regularExpression) {
            let num = reason[range].dropFirst()
            if let v = Double(num) { return min(5, max(1, Int(v.rounded()))) }
        }
        if let p = priceLevel { return min(5, max(3, p + 2)) }
        return 4
    }

    static func siteLabel(_ site: String?) -> String {
        switch site?.lowercased() {
        case "booking": return "Booking"
        case "agoda": return "Agoda"
        case "vntrip": return "Vntrip"
        default: return site?.capitalized ?? "OTA"
        }
    }

    static func splitHotels(_ hotels: [BookingSuggestion]) -> (recommended: BookingSuggestion?, alternatives: [BookingSuggestion]) {
        guard !hotels.isEmpty else { return (nil, []) }
        let idx = hotels.firstIndex { h in
            (h.reason?.contains("Đề xuất") ?? false) || (h.reason?.contains("Gợi ý") ?? false)
        }
        let recIdx = idx ?? 0
        let recommended = hotels[recIdx]
        let alternatives = hotels.enumerated().compactMap { i, h in i == recIdx ? nil : h }
        return (recommended, alternatives)
    }

    static func hotelMapsUrl(_ hotel: BookingSuggestion, destination: String? = nil) -> String {
        if let maps = hotel.maps_url?.trimmingCharacters(in: .whitespaces), !maps.isEmpty { return maps }
        let query = destination.map { "\(hotel.name) \($0)" } ?? hotel.name
        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        return "https://www.google.com/maps/search/?api=1&query=\(encoded)"
    }

    /// Maps URL cho địa điểm trong lịch trình.
    /// - Ưu tiên `maps_url` do backend enrich (food pool sẽ trả về coord + địa chỉ DB).
    /// - Nếu là quán ăn/nhà hàng/cafe và có `address` từ DB, dùng địa chỉ đó thay vì tìm theo tên.
    /// - Cuối cùng fallback tìm theo tên + destination.
    static func slotMapsUrl(_ slot: ItinerarySlot, destination: String? = nil) -> String? {
        if let maps = slot.maps_url?.trimmingCharacters(in: .whitespaces), !maps.isEmpty {
            return maps
        }

        let title = slot.title?.trimmingCharacters(in: .whitespaces) ?? ""
        let address = slot.address?.trimmingCharacters(in: .whitespaces)

        if isFoodOrDrinkSlot(slot), let addr = address, !addr.isEmpty {
            let encoded = addr.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? addr
            return "https://www.google.com/maps/search/?api=1&query=\(encoded)"
        }

        if !title.isEmpty {
            let query = destination.map { "\(title) \($0)" } ?? title
            let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
            return "https://www.google.com/maps/search/?api=1&query=\(encoded)"
        }

        return nil
    }

    private static func isFoodOrDrinkSlot(_ slot: ItinerarySlot) -> Bool {
        let text = "\(slot.category ?? "") \(slot.cuisine_type ?? "")".lowercased()
        let keywords = ["restaurant", "cafe", "food", "drink", "coffee", "ăn", "nhà hàng", "quán", "cà phê", "buffet", "bistro", "eatery", "bar"]
        return keywords.contains { text.contains($0) }
    }

    static func tripCoverImageUrl(_ trip: TripRecord) -> String? {
        guard let url = trip.cover_image_url?.trimmingCharacters(in: .whitespaces), !url.isEmpty else { return nil }
        return url
    }

    static func tripActivityCount(_ trip: TripRecord) -> Int {
        trip.itinerary_json?.days.reduce(0) { $0 + getDayActivities($1).count } ?? 0
    }

    static func tripBudgetChip(_ trip: TripRecord) -> String {
        let budget = trip.budget > 0 ? trip.budget : (trip.total_estimated_cost ?? 0)
        return FormatUtils.formatCompactVnd(budget)
    }

    static func tripWeatherChip(_ trip: TripRecord) -> String {
        let summary = trip.summary?.trimmingCharacters(in: .whitespaces) ?? ""
        if summary.localizedCaseInsensitiveContains("mây") { return "Nhiều mây" }
        if summary.localizedCaseInsensitiveContains("mưa") { return "Có mưa" }
        if summary.localizedCaseInsensitiveContains("nắng") { return "Nắng đẹp" }
        if !summary.isEmpty { return String(summary.prefix(12)) }
        return "—"
    }

    static func dedupeRoomAmenities(_ items: [String]?, roomName: String? = nil) -> [String] {
        guard let items, !items.isEmpty else { return [] }
        var seen = Set<String>()
        var out: [String] = []
        for raw in items {
            for part in raw.components(separatedBy: CharacterSet(charactersIn: "|•·")) {
                let cleaned = part.trimmingCharacters(in: .whitespaces)
                guard cleaned.count >= 2 else { continue }
                let key = cleaned.lowercased()
                if seen.contains(key) { continue }
                seen.insert(key)
                out.append(cleaned)
            }
        }
        return out
    }

    static let tripGradients: [[Color]] = [
        [Color(red: 0.16, green: 0.48, blue: 0.61), PremiumTheme.ink],
        [Color(red: 0.16, green: 0.62, blue: 0.44), PremiumTheme.ink],
        [Color(red: 0.83, green: 0.51, blue: 0.04), PremiumTheme.ink],
        [Color(red: 0.35, green: 0.37, blue: 0.81), PremiumTheme.ink],
        [PremiumTheme.accent, PremiumTheme.ink],
    ]

    static func defaultPlannerStartDate() -> String { iso(daysFromNow: 2) }
    static func defaultPlannerEndDate() -> String { iso(daysFromNow: 5) }

    static let preferenceOptions: [(String, String)] = [
        ("nature", "Thiên nhiên"),
        ("food", "Ẩm thực"),
        ("culture", "Văn hóa"),
        ("shopping", "Mua sắm"),
        ("adventure", "Phiêu lưu"),
        ("relaxation", "Thư giãn"),
    ]

    static let paceOptions: [(String, String)] = [
        ("relaxed", "Thư thả"),
        ("balanced", "Cân bằng"),
        ("packed", "Dày đặc"),
    ]

    private static func withinEnrichmentWindow(_ trip: TripRecord) -> Bool {
        let status = trip.generation_status ?? ""
        if status == "ready" || status == "failed" { return false }
        guard let raw = trip.updated_at ?? trip.created_at else { return false }
        let fmt = ISO8601DateFormatter()
        fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = fmt.date(from: raw)
        if date == nil {
            fmt.formatOptions = [.withInternetDateTime]
            date = fmt.date(from: raw)
        }
        guard let ts = date else { return false }
        return Date().timeIntervalSince(ts) < enrichmentMaxMs
    }

    private static func parseMinutes(_ time: String?) -> Int {
        guard let time, !time.isEmpty,
              let match = time.range(of: #"^(\d{1,2}):(\d{2})"#, options: .regularExpression) else { return 24 * 60 }
        let parts = time[match].split(separator: ":")
        guard parts.count == 2, let h = Int(parts[0]), let m = Int(parts[1]) else { return 24 * 60 }
        return h * 60 + m
    }

    private static func iso(daysFromNow: Int) -> String {
        let d = Calendar.current.date(byAdding: .day, value: daysFromNow, to: Date()) ?? Date()
        let fmt = DateFormatter()
        fmt.locale = Locale(identifier: "en_US_POSIX")
        fmt.dateFormat = "yyyy-MM-dd"
        return fmt.string(from: d)
    }
}

func formatAuthError(_ error: Error, fallback: String) -> String {
    if let api = error as? ApiError { return api.message }
    if !AppConfig.isSupabaseConfigured {
        return "Chưa cấu hình Supabase. Kiểm tra Config.xcconfig rồi build lại."
    }
    if let urlError = error as? URLError {
        switch urlError.code {
        case .cannotFindHost, .dnsLookupFailed:
            return "Không kết nối được Supabase. Kiểm tra SUPABASE_URL trong Config.xcconfig (dùng https:/$()/...)."
        case .notConnectedToInternet:
            return "Không có kết nối mạng."
        case .timedOut:
            return "Kết nối quá thời gian chờ."
        default:
            break
        }
    }
    if error is DecodingError {
        return "Phản hồi đăng nhập không hợp lệ. Thử build lại app."
    }
    let text = error.localizedDescription.trimmingCharacters(in: .whitespacesAndNewlines)
    return text.isEmpty ? fallback : text
}

func formatApiError(_ error: Error, fallback: String) -> String {
    if let api = error as? ApiError { return api.message }
    if let urlError = error as? URLError {
        switch urlError.code {
        case .cannotConnectToHost, .cannotFindHost, .networkConnectionLost:
            return "Không kết nối được \(AppConfig.apiURL) (\(urlError.localizedDescription))"
        case .notConnectedToInternet:
            return "Không có kết nối mạng."
        case .timedOut:
            return "Kết nối \(AppConfig.apiURL) quá thời gian chờ."
        default:
            return urlError.localizedDescription
        }
    }
    if let decoding = error as? DecodingError {
        switch decoding {
        case .keyNotFound(let key, _):
            return "Thiếu trường dữ liệu API: \(key.stringValue)."
        case .typeMismatch(_, let context):
            let path = context.codingPath.map(\.stringValue).joined(separator: ".")
            return path.isEmpty
                ? "Dữ liệu API không khớp kiểu dữ liệu."
                : "Dữ liệu API không khớp tại \(path)."
        case .valueNotFound(_, let context):
            let path = context.codingPath.map(\.stringValue).joined(separator: ".")
            return path.isEmpty
                ? "Thiếu giá trị trong phản hồi API."
                : "Thiếu giá trị API tại \(path)."
        case .dataCorrupted(let context):
            return context.debugDescription
        @unknown default:
            break
        }
        return "Phản hồi API không đúng định dạng từ \(AppConfig.apiURL)."
    }
    let text = error.localizedDescription.trimmingCharacters(in: .whitespacesAndNewlines)
    if !text.isEmpty { return text }
    return fallback
}
