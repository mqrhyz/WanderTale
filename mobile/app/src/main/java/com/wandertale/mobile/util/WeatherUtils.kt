package com.wandertale.mobile.util

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.double
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.util.Locale

enum class WeatherCondition { SUNNY, RAINY, CLOUDY, STORMY, HOT, COOL }

data class WeatherDaySummary(
    val date: String,
    val label: String,
    val tempMin: Int,
    val tempMax: Int,
    val icon: String,
    val condition: WeatherCondition,
    val activityHint: String,
)

private val activityHints = mapOf(
    WeatherCondition.SUNNY to "Nắng đẹp — ưu tiên bãi biển, đi bộ, viewpoint",
    WeatherCondition.RAINY to "Có mưa — ưu tiên bảo tàng, cafe, ẩm thực trong nhà",
    WeatherCondition.CLOUDY to "Nhiều mây — phố cổ, chợ địa phương, tour nhẹ",
    WeatherCondition.STORMY to "Mưa to/giông — hạn chế di chuyển xa",
    WeatherCondition.HOT to "Nắng nóng — sáng sớm/chiều mát cho ngoài trời",
    WeatherCondition.COOL to "Thời tiết mát — trekking nhẹ, cà phê view",
)

fun summarizeWeatherForecast(raw: JsonElement?, maxDays: Int = 8): List<WeatherDaySummary> {
    val list = raw?.jsonObject?.get("list")?.jsonArray ?: return emptyList()
    val byDay = linkedMapOf<String, DayBucket>()

    for (element in list) {
        val item = element.jsonObject
        val day = item["dt_txt"]?.jsonPrimitive?.content?.take(10) ?: continue
        val main = item["main"]?.jsonObject ?: continue
        val min = main.double("temp_min") ?: main.double("temp") ?: continue
        val max = main.double("temp_max") ?: main.double("temp") ?: continue
        val weather = item["weather"]?.jsonArray?.firstOrNull()?.jsonObject
        val desc = weather?.get("description")?.jsonPrimitive?.content.orEmpty()
        val icon = weather?.get("icon")?.jsonPrimitive?.content ?: "01d"
        val bucket = byDay.getOrPut(day) { DayBucket() }
        bucket.mins.add(min)
        bucket.maxs.add(max)
        if (desc.isNotBlank()) bucket.desc = desc
        if (icon.isNotBlank()) bucket.icon = icon
    }

    return byDay.entries
        .sortedBy { it.key }
        .take(maxDays)
        .map { (date, bucket) ->
            val tempMin = bucket.mins.minOrNull()?.toInt() ?: 0
            val tempMax = bucket.maxs.maxOrNull()?.toInt() ?: 0
            val condition = classifyWeather(bucket.icon, tempMin, tempMax)
            WeatherDaySummary(
                date = date,
                label = bucket.desc.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale("vi")) else it.toString() },
                tempMin = tempMin,
                tempMax = tempMax,
                icon = bucket.icon,
                condition = condition,
                activityHint = activityHints[condition].orEmpty(),
            )
        }
}

fun weatherForTripRange(days: List<WeatherDaySummary>, startDate: String, endDate: String): List<WeatherDaySummary> =
    days.filter { it.date in startDate..endDate }

fun buildTripWeatherOverview(days: List<WeatherDaySummary>): String? {
    if (days.isEmpty()) return null
    val rainy = days.count { it.condition == WeatherCondition.RAINY || it.condition == WeatherCondition.STORMY }
    val sunny = days.count { it.condition == WeatherCondition.SUNNY || it.condition == WeatherCondition.HOT }
    val parts = buildList {
        if (sunny > 0) add("$sunny ngày thuận lợi cho hoạt động ngoài trời")
        if (rainy > 0) add("$rainy ngày nên ưu tiên địa điểm trong nhà")
    }
    return when {
        parts.isEmpty() -> "Thời tiết trung bình — AI cân bằng giữa trong nhà và ngoài trời."
        else -> "${parts.joinToString(" · ")}. AI sẽ gợi ý chỗ chơi phù hợp từng ngày."
    }
}

fun openWeatherIconUrl(icon: String): String = "https://openweathermap.org/img/wn/${icon}@2x.png"

private data class DayBucket(
    val mins: MutableList<Double> = mutableListOf(),
    val maxs: MutableList<Double> = mutableListOf(),
    var desc: String = "",
    var icon: String = "01d",
)

private fun JsonObject.double(key: String): Double? =
    get(key)?.jsonPrimitive?.content?.toDoubleOrNull()

private fun classifyWeather(icon: String, tempMin: Int, tempMax: Int): WeatherCondition {
    if (icon.contains("11") || icon.startsWith("09")) return WeatherCondition.STORMY
    if (icon.contains("10") || icon.contains("50") || icon.contains("13")) return WeatherCondition.RAINY
    if (tempMax >= 35) return WeatherCondition.HOT
    if (tempMax <= 20 && tempMin <= 16) return WeatherCondition.COOL
    if (icon.contains("01") || icon.contains("02")) return WeatherCondition.SUNNY
    return WeatherCondition.CLOUDY
}
