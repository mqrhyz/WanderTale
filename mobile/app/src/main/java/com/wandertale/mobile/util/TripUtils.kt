package com.wandertale.mobile.util

import com.wandertale.mobile.data.model.GeneratedItinerary
import com.wandertale.mobile.data.model.ItineraryDayPlan
import com.wandertale.mobile.data.model.ItinerarySlot
import com.wandertale.mobile.data.model.TripRecord
import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

object FormatUtils {
    private val vnd = NumberFormat.getCurrencyInstance(Locale("vi", "VN"))

    fun formatVnd(n: Double?): String {
        if (n == null || !n.isFinite()) return "—"
        return vnd.format(n)
    }

    /** Compact VND for dashboard metrics — e.g. 24.011.976 → "24tr". */
    fun formatCompactVnd(n: Double?): String {
        if (n == null || !n.isFinite()) return "—"
        val abs = kotlin.math.abs(n)
        return when {
            abs >= 1_000_000_000 -> {
                val v = n / 1_000_000_000
                "${trimOneDecimal(v)} tỷ"
            }
            abs >= 1_000_000 -> {
                val v = n / 1_000_000
                "${trimOneDecimal(v)}tr ₫"
            }
            abs >= 1_000 -> "${kotlin.math.round(n / 1_000).toInt()}k"
            else -> NumberFormat.getIntegerInstance(Locale("vi", "VN")).format(n.toLong())
        }
    }

    private fun trimOneDecimal(v: Double): String {
        val rounded = (kotlin.math.round(v * 10) / 10.0)
        return if (rounded % 1.0 == 0.0) {
            rounded.toLong().toString()
        } else {
            String.format(Locale.US, "%.1f", rounded)
        }
    }

    fun formatDateRange(start: String, end: String): String {
        val fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale("vi"))
        return runCatching {
            "${LocalDate.parse(start).format(fmt)} - ${LocalDate.parse(end).format(fmt)}"
        }.getOrElse { "$start - $end" }
    }

    fun formatDayShort(date: String): String =
        runCatching {
            LocalDate.parse(date).format(DateTimeFormatter.ofPattern("d MMM", Locale("vi")))
        }.getOrElse { date }
}

enum class TripPhase { UPCOMING, ONGOING, COMPLETED }

fun getTripPhase(startDate: String, endDate: String): TripPhase {
    val today = LocalDate.now()
    val start = runCatching { LocalDate.parse(startDate) }.getOrNull()
    val end = runCatching { LocalDate.parse(endDate) }.getOrNull()
    if (start == null || end == null) return TripPhase.UPCOMING
    return when {
        today.isBefore(start) -> TripPhase.UPCOMING
        today.isAfter(end) -> TripPhase.COMPLETED
        else -> TripPhase.ONGOING
    }
}

fun tripPhaseLabel(phase: TripPhase): String = when (phase) {
    TripPhase.UPCOMING -> "Sắp tới"
    TripPhase.ONGOING -> "Đang diễn ra"
    TripPhase.COMPLETED -> "Đã qua"
}

private val GENERIC_TITLE = Regex(
    "^(buổi sáng|buổi chiều|buổi tối|tham quan|khám phá|ăn trưa|phố đi bộ|check-in|điểm check-in|công viên|thư giãn|ẩm thực)",
    RegexOption.IGNORE_CASE,
)

fun isGenericAgendaTitle(title: String?): Boolean {
    val t = title?.trim().orEmpty()
    if (t.isEmpty() || t == "—") return true
    if (GENERIC_TITLE.containsMatchIn(t)) return true
    if (Regex("buổi (sáng|chiều|tối)", RegexOption.IGNORE_CASE).containsMatchIn(t)) return true
    if (Regex("tham quan.*(sáng|chiều|tối)", RegexOption.IGNORE_CASE).containsMatchIn(t)) return true
    if (Regex("ăn (trưa|tối).*(&|và|/)", RegexOption.IGNORE_CASE).containsMatchIn(t)) return true
    return false
}

fun slotHasContent(slot: ItinerarySlot): Boolean {
    val title = slot.title?.trim().orEmpty()
    return title.isNotEmpty() && title != "—"
}

private fun parseTimeToMinutes(time: String?): Int {
    if (time.isNullOrBlank()) return 24 * 60
    val match = Regex("""^(\d{1,2}):(\d{2})""").find(time.trim()) ?: return 24 * 60
    val (h, m) = match.destructured
    return h.toInt() * 60 + m.toInt()
}

fun getDayActivities(day: ItineraryDayPlan): List<ItinerarySlot> {
    val fromArray = day.activities?.filter { slotHasContent(it) }.orEmpty()
    if (fromArray.isNotEmpty()) {
        return fromArray.sortedBy { parseTimeToMinutes(it.start_time) }
    }
    return listOfNotNull(
        day.morning.takeIf { slotHasContent(it) },
        day.afternoon.takeIf { slotHasContent(it) },
        day.evening.takeIf { slotHasContent(it) },
    )
}

fun agendaNeedsSpecificPlaces(itinerary: GeneratedItinerary?): Boolean {
    if (itinerary?.days.isNullOrEmpty()) return false
    return itinerary!!.days.any { day ->
        getDayActivities(day).any { slot -> isGenericAgendaTitle(slot.title) }
    }
}

fun slotImages(slot: ItinerarySlot): List<String> {
    slot.image_preview_urls?.filter { it.isNotBlank() }?.takeIf { it.isNotEmpty() }?.let { return it }
    slot.image_preview_url?.takeIf { it.isNotBlank() }?.let { return listOf(it) }
    return emptyList()
}

fun slotFirstImage(slot: ItinerarySlot): String? = slotImages(slot).firstOrNull()

/** Patch ảnh một slot khi nhận SSE `slot_image` — không cần refetch cả trip. */
fun TripRecord.withSlotImage(title: String, imageUrl: String, imageUrls: List<String>? = null): TripRecord {
    val itinerary = itinerary_json ?: return this
    val target = title.trim()
    if (target.isEmpty()) return this
    val urls = imageUrls?.filter { it.isNotBlank() }?.takeIf { it.isNotEmpty() }
        ?: listOfNotNull(imageUrl.takeIf { it.isNotBlank() })
    if (urls.isEmpty()) return this

    fun patchSlot(slot: ItinerarySlot): ItinerarySlot {
        if (slot.title?.trim() != target) return slot
        return slot.copy(image_preview_url = urls.first(), image_preview_urls = urls)
    }

    fun patchDay(day: ItineraryDayPlan): ItineraryDayPlan {
        val activities = day.activities?.map { patchSlot(it) }
        return day.copy(
            activities = activities,
            morning = patchSlot(day.morning),
            afternoon = patchSlot(day.afternoon),
            evening = patchSlot(day.evening),
        )
    }

    return copy(itinerary_json = itinerary.copy(days = itinerary.days.map { patchDay(it) }))
}

fun formatSlotClock(time: String): String {
    val trimmed = time.trim()
    if (trimmed.length >= 5 && trimmed[2] == ':') return trimmed.take(5)
    return trimmed
}

fun formatTimeRange(start: String, end: String): String = "$start – $end"

fun hotelImages(hotel: com.wandertale.mobile.data.model.BookingSuggestion): List<String> {
    hotel.image_preview_urls?.filter { it.isNotBlank() }?.firstOrNull()?.let { return listOf(it) }
    hotel.image_preview_url?.takeIf { it.isNotBlank() }?.let { return listOf(it) }
    return emptyList()
}

/** Ảnh cover thành phố từ Pexels (backend), không dùng ảnh khách sạn/lịch trình. */
fun tripCoverImageUrl(trip: TripRecord): String? {
    return trip.cover_image_url?.takeIf { it.isNotBlank() }
}

/** Google Maps URL tìm theo TÊN địa điểm (không dùng toạ độ). */
fun slotMapsQueryUrl(slot: ItinerarySlot, destination: String? = null): String? {
    val title = slot.title?.trim()?.takeIf { it.isNotEmpty() }
    if (title != null) {
        val query = if (!destination.isNullOrBlank()) "$title $destination" else title
        return "https://www.google.com/maps/search/?api=1&query=${android.net.Uri.encode(query)}"
    }
    return slot.maps_url?.trim()?.takeIf { it.isNotEmpty() }
}

fun parseHotelRating(reason: String?, priceLevel: Int? = null): Int {
    val match = Regex("★([\\d.]+)").find(reason.orEmpty())
    if (match != null) {
        val value = match.groupValues[1].toDoubleOrNull()?.toInt() ?: 4
        return value.coerceIn(1, 5)
    }
    return priceLevel?.let { (it + 2).coerceIn(3, 5) } ?: 4
}

fun siteLabel(site: String?): String = when (site?.lowercase()) {
    "booking" -> "Booking"
    "agoda" -> "Agoda"
    "vntrip" -> "Vntrip"
    else -> site?.replaceFirstChar { it.uppercase() } ?: "OTA"
}

private fun normalizeAmenityKey(text: String): String =
    text.trim()
        .lowercase()
        .replace('đ', 'd')
        .replace(Regex("\\p{M}+"), "")
        .replace(Regex("\\s+"), " ")

private fun isAmenityNoise(text: String): Boolean {
    val t = text.trim()
    if (t.length < 2) return true
    if (Regex("^\\+\\s*\\d").containsMatchIn(t)) return true
    if (Regex("^\\d+\\s*tiện (?:nghi|ích)", RegexOption.IGNORE_CASE).containsMatchIn(t)) return true
    if (Regex("^(\\+\\d|xem th(?:êm|em)|show more|see all|more amenities)$", RegexOption.IGNORE_CASE).containsMatchIn(t)) return true
    return false
}

/** Khử trùng + tách "39 m² | Wi-Fi" — hiển thị đủ tiện nghi phòng. */
fun dedupeRoomAmenities(items: List<String>?, roomName: String? = null): List<String> {
    if (items.isNullOrEmpty()) return emptyList()
    val seen = mutableSetOf<String>()
    val out = mutableListOf<String>()
    roomName?.let { name ->
        for (part in name.split(Regex("\\s*[|•·]\\s*"))) {
            val key = normalizeAmenityKey(part.trim())
            if (key.isNotBlank()) seen.add(key)
        }
    }
    for (raw in items) {
        for (part in raw.split(Regex("\\s*[|•·]\\s*"))) {
            val cleaned = part.trim().replace(Regex("\\s+"), " ")
            if (cleaned.length < 2 || isAmenityNoise(cleaned)) continue
            val key = normalizeAmenityKey(cleaned)
            if (key.isBlank() || seen.contains(key)) continue
            seen.add(key)
            out.add(cleaned)
        }
    }
    return out
}

private const val OTA_BACKGROUND_MAX_MS = 30 * 60 * 1000L

private fun tripWithinEnrichmentWindow(trip: TripRecord): Boolean {
    val status = trip.generation_status
    if (status == "ready" || status == "failed") return false
    val ts = tripTimestampMs(trip) ?: return false
    return System.currentTimeMillis() - ts < OTA_BACKGROUND_MAX_MS
}

fun tripNeedsOtaPolling(trip: TripRecord): Boolean {
    val status = trip.generation_status
    if (status == "ready" || status == "failed") return false
    val otaActive = status in listOf("pricing_pending", "generating") ||
        trip.hotel_pricing_status == "pending"
    if (!otaActive) return false
    return tripWithinEnrichmentWindow(trip)
}

private fun tripTimestampMs(trip: TripRecord): Long? {
    val raw = trip.updated_at ?: trip.created_at ?: return null
    return runCatching { java.time.Instant.parse(raw).toEpochMilli() }.getOrNull()
}

private fun tripNeedsMediaPolling(trip: TripRecord): Boolean {
    if (!tripWithinEnrichmentWindow(trip)) return false
    val hotels = trip.itinerary_json?.hotel_suggestions.orEmpty()
    val waitingGallery = hotels.isNotEmpty() && hotels.any { hotelImages(it).isEmpty() }
    val waitingAgenda = agendaNeedsSpecificPlaces(trip.itinerary_json)
    val waitingMedia = trip.itinerary_json?.days.orEmpty().any { day ->
        getDayActivities(day).any { slot ->
            !isGenericAgendaTitle(slot.title) && slotImages(slot).isEmpty()
        }
    }
    return waitingGallery || waitingAgenda || waitingMedia
}

fun tripNeedsPolling(trip: TripRecord): Boolean {
    return tripNeedsOtaPolling(trip) || tripNeedsMediaPolling(trip)
}

val PREFERENCE_OPTIONS = listOf(
    "nature" to "🌿 Thiên nhiên",
    "food" to "🍜 Ẩm thực",
    "culture" to "🏛 Văn hóa",
    "shopping" to "🛍 Mua sắm",
    "adventure" to "🧗 Phiêu lưu",
    "relaxation" to "🛁 Thư giãn",
)

val PACE_OPTIONS = listOf(
    "relaxed" to "😌\nThư thả",
    "balanced" to "⚖️\nCân bằng",
    "packed" to "🚀\nDày đặc",
)

val PACE_DESCRIPTIONS = mapOf(
    "relaxed" to "Ít hoạt động, nhiều thời gian tự do",
    "balanced" to "Xen kẽ tham quan và nghỉ ngơi",
    "packed" to "Tối ưu điểm đến, ít thời gian chờ",
)

data class AccommodationOption(
    val id: String,
    val icon: String,
    val label: String,
    val subtitle: String,
)

val ACCOMMODATION_OPTIONS = listOf(
    AccommodationOption("budget", "🏩", "Tiết kiệm", "Hostel, homestay"),
    AccommodationOption("standard", "🏨", "Tiêu chuẩn", "Khách sạn 3★"),
    AccommodationOption("premium", "🏰", "Cao cấp", "Resort, boutique"),
)

/** Count distinct activity slots across itinerary days. */
fun tripActivityCount(trip: TripRecord): Int {
    val days = trip.itinerary_json?.days.orEmpty()
    if (days.isEmpty()) return 0
    return days.sumOf { day -> getDayActivities(day).size }
}

fun tripBudgetChip(trip: TripRecord): String {
    val budget = trip.budget.takeIf { it > 0 } ?: trip.total_estimated_cost
    return FormatUtils.formatCompactVnd(budget)
}

fun tripWeatherChip(trip: TripRecord): String {
    val summary = trip.summary?.trim().orEmpty()
    return when {
        summary.contains("mây", ignoreCase = true) -> "🌤 Nhiều mây"
        summary.contains("mưa", ignoreCase = true) -> "🌧 Có mưa"
        summary.contains("nắng", ignoreCase = true) -> "☀ Nắng đẹp"
        summary.isNotBlank() -> "🌤 ${summary.take(12)}"
        else -> "🌤 —"
    }
}

val ROOM_TYPES = listOf(
    "" to "Bất kỳ",
    "Dorm Room" to "Dorm / Phòng tập thể",
    "Single Room" to "Phòng đơn (Single)",
    "Superior Double Room" to "Phòng đôi tiêu chuẩn",
    "Deluxe Double Room" to "Phòng đôi cao cấp",
    "Superior Family Room" to "Phòng gia đình",
    "Suite" to "Suite / Villa",
)

fun defaultPlannerStartDate(): String = LocalDate.now().plusDays(2).toString()
fun defaultPlannerEndDate(): String = LocalDate.now().plusDays(5).toString()

fun formatPlannerDate(iso: String): String {
    if (!iso.matches(Regex("\\d{4}-\\d{2}-\\d{2}"))) return iso
    return LocalDate.parse(iso).format(DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale("vi")))
}

fun formatPlannerDateRange(start: String, end: String): String =
    "${formatPlannerDate(start)} – ${formatPlannerDate(end)}"
