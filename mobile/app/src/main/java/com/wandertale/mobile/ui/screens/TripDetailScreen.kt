package com.wandertale.mobile.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.outlined.EditNote
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material.icons.outlined.WbSunny
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.wandertale.mobile.WanderTaleApp
import com.wandertale.mobile.data.api.ApiClient
import com.wandertale.mobile.data.model.BookingSuggestion
import com.wandertale.mobile.data.model.ItineraryDayPlan
import com.wandertale.mobile.data.model.ItinerarySlot
import com.wandertale.mobile.data.model.TripRecord
import com.wandertale.mobile.ui.components.AppScaffold
import com.wandertale.mobile.ui.components.ErrorText
import com.wandertale.mobile.ui.components.ImageCarousel
import com.wandertale.mobile.ui.components.OrangeLoadingSpinner
import com.wandertale.mobile.ui.components.PremiumAccentButton
import com.wandertale.mobile.ui.components.PremiumGhostButton
import com.wandertale.mobile.ui.components.PremiumSurfaceCard
import com.wandertale.mobile.ui.components.TripDetailSkeleton
import com.wandertale.mobile.ui.components.InfoCard
import com.wandertale.mobile.ui.theme.PremiumColors
import com.wandertale.mobile.ui.theme.PremiumDesign
import com.wandertale.mobile.util.FormatUtils
import com.wandertale.mobile.util.dedupeRoomAmenities
import com.wandertale.mobile.util.formatSlotClock
import com.wandertale.mobile.util.formatTimeRange
import com.wandertale.mobile.util.getDayActivities
import com.wandertale.mobile.util.hotelImages
import com.wandertale.mobile.util.parseHotelRating
import com.wandertale.mobile.util.siteLabel
import com.wandertale.mobile.util.slotFirstImage
import com.wandertale.mobile.util.slotMapsQueryUrl
import com.wandertale.mobile.util.tripNeedsOtaPolling
import com.wandertale.mobile.util.tripNeedsPolling
import com.wandertale.mobile.util.withSlotImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

@Composable
fun TripDetailScreen(
    tripId: String,
    onBack: () -> Unit,
    onDuplicated: (String) -> Unit,
    onDataChanged: () -> Unit = {},
    onOpenBooking: (String) -> Unit = {},
) {
    var trip by remember { mutableStateOf<TripRecord?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var imageProgress by remember { mutableStateOf<Pair<Int, Int>?>(null) }
    var sponsoredLocations by remember { mutableStateOf<List<com.wandertale.mobile.data.model.SponsoredLocation>>(emptyList()) }
    var selectedLocationId by remember { mutableStateOf<String?>(null) }
    val favIds by WanderTaleApp.instance.preferencesStore.favoriteTripIds.collectAsState(initial = emptySet())
    val isFav = tripId in favIds
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    suspend fun load() {
        runCatching { WanderTaleApp.instance.tripRepository.get(tripId) }
            .onSuccess { trip = it }
            .onFailure { error = it.message }
    }

    LaunchedEffect(tripId) {
        suspend fun refresh(): TripRecord? =
            runCatching { WanderTaleApp.instance.tripRepository.get(tripId) }
                .onSuccess { trip = it; error = null }
                .onFailure { error = it.message }
                .getOrNull()

        var current = refresh() ?: return@LaunchedEffect
        if (!tripNeedsPolling(current)) return@LaunchedEffect

        var streamFailed = false
        val streamJob = launch {
            runCatching {
                WanderTaleApp.instance.tripRepository.streamUpdates(tripId) { data ->
                    val root = runCatching { Json.parseToJsonElement(data).jsonObject }.getOrNull()
                        ?: return@streamUpdates
                    val type = root["type"]?.jsonPrimitive?.content
                    when (type) {
                        "slot_image" -> {
                            val payload = root["payload"]?.jsonObject ?: return@streamUpdates
                            val title = payload["title"]?.jsonPrimitive?.content ?: return@streamUpdates
                            val url = payload["image_preview_url"]?.jsonPrimitive?.content ?: return@streamUpdates
                            val imageUrls = (payload["image_preview_urls"] as? JsonArray)
                                ?.mapNotNull { it.jsonPrimitive.content.takeIf { s -> s.isNotBlank() } }
                                ?.takeIf { it.isNotEmpty() }
                            val filled = payload["filled"]?.jsonPrimitive?.content?.toIntOrNull()
                            val total = payload["total"]?.jsonPrimitive?.content?.toIntOrNull()
                            if (filled != null && total != null) imageProgress = filled to total
                            trip = trip?.withSlotImage(title, url, imageUrls)
                        }
                        "images_progress" -> {
                            val payload = root["payload"]?.jsonObject ?: return@streamUpdates
                            val filled = payload["filled"]?.jsonPrimitive?.content?.toIntOrNull()
                            val total = payload["total"]?.jsonPrimitive?.content?.toIntOrNull()
                            if (filled != null && total != null) imageProgress = filled to total
                        }
                        in listOf(
                            "prices_ready", "images_ready", "hotel_images_ready",
                            "coords_ready", "complete", "trip_update",
                        ) -> launch { refresh() }
                    }
                }
            }.onFailure { streamFailed = true }
        }

        var elapsed = 0L
        while (isActive && elapsed < 240_000) {
            current = trip ?: current
            if (!tripNeedsPolling(current)) break
            if (!streamFailed && !streamJob.isCompleted) {
                delay(2500)
                elapsed += 2500
                continue
            }
            delay(2500)
            elapsed += 2500
            refresh()
        }
    }

    LaunchedEffect(trip?.destination) {
        val dest = trip?.destination ?: return@LaunchedEffect
        sponsoredLocations = runCatching { ApiClient.sponsoredLocations(dest, trip?.budget) }.getOrDefault(emptyList())
    }

    val t = trip
    val locId = selectedLocationId
    if (locId != null) {
        LocationDetailScreen(
            locationId = locId,
            tripId = tripId,
            onBack = { selectedLocationId = null },
            onOpenBooking = onOpenBooking,
        )
        return
    }
    AppScaffold(
        title = t?.destination ?: "Chi tiết chuyến đi",
        onBack = onBack,
        actions = {
            IconButton(onClick = { scope.launch { WanderTaleApp.instance.preferencesStore.toggleFavorite(tripId) } }) {
                Icon(if (isFav) Icons.Default.Favorite else Icons.Default.FavoriteBorder, "Yêu thích")
            }
        },
    ) { padding ->
        when {
            t == null && error == null -> TripDetailSkeleton(padding)
            error != null && t == null -> ErrorText(error!!, padding)
            t != null -> TripDetailContent(
                trip = t,
                imageProgress = imageProgress,
                sponsored = sponsoredLocations,
                onOpenLocation = { selectedLocationId = it },
                modifier = padding,
                onMaps = { url -> context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) },
                onDuplicate = {
                    scope.launch {
                        runCatching { WanderTaleApp.instance.tripRepository.duplicate(tripId) }
                            .onSuccess {
                                onDataChanged()
                                onDuplicated(it.id)
                            }
                    }
                },
                onDelete = {
                    scope.launch {
                        WanderTaleApp.instance.tripRepository.delete(tripId)
                        onDataChanged()
                        onBack()
                    }
                },
            )
        }
    }
}

@Composable
private fun TripDetailContent(
    trip: TripRecord,
    imageProgress: Pair<Int, Int>? = null,
    sponsored: List<com.wandertale.mobile.data.model.SponsoredLocation> = emptyList(),
    onOpenLocation: (String) -> Unit = {},
    modifier: Modifier = Modifier,
    onMaps: (String) -> Unit,
    onDuplicate: () -> Unit,
    onDelete: () -> Unit,
) {
    val it = trip.itinerary_json
    val days = it?.days.orEmpty()
    var selectedDayIndex by remember(days) { mutableStateOf(0) }
    var selectedTab by remember { mutableStateOf(TripDetailTab.Itinerary) }
    val activeDayIndex = selectedDayIndex.coerceIn(0, (days.size - 1).coerceAtLeast(0))
    val activeDay = days.getOrNull(activeDayIndex)
    val pending = tripNeedsPolling(trip)
    val otaPending = tripNeedsOtaPolling(trip)
    val pendingMessage = when {
        imageProgress != null && imageProgress.first < imageProgress.second ->
            "Đang lấy ảnh ${imageProgress.first}/${imageProgress.second}…"
        otaPending -> "Đang cập nhật giá OTA & ảnh Maps…"
        pending -> "Đang cập nhật ảnh Maps…"
        else -> null
    }

    LazyColumn(
        modifier.padding(horizontal = PremiumDesign.ScreenPadding, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(PremiumDesign.SectionGap),
    ) {
        item {
            pendingMessage?.let { message ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(PremiumDesign.InputRadius))
                        .background(PremiumColors.AccentLight)
                        .padding(12.dp),
                ) {
                    OrangeLoadingSpinner()
                    Text(
                        message,
                        fontSize = 13.sp,
                        color = PremiumColors.Muted,
                    )
                }
            }
            PremiumSurfaceCard {
                Column(Modifier.padding(PremiumDesign.CardPadding), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        FormatUtils.formatDateRange(trip.start_date, trip.end_date),
                        fontSize = 15.sp,
                        color = PremiumColors.Ink,
                    )
                    Text("Ngân sách: ${FormatUtils.formatVnd(trip.budget)}", fontSize = 15.sp, color = PremiumColors.Ink)
                }
            }
        }

        item {
            DetailTabSelector(selectedTab = selectedTab, onSelect = { selectedTab = it })
        }

        if (selectedTab == TripDetailTab.Itinerary) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Agenda theo ngày", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = PremiumColors.Ink)
                    Text(
                        "Chọn ngày để xem lịch trình chi tiết theo khung giờ.",
                        fontSize = 14.sp,
                        color = PremiumColors.Muted,
                    )
                }
            }
            if (days.isNotEmpty()) {
                item {
                    DaySchedulePicker(
                        days = days,
                        selectedIndex = activeDayIndex,
                        onSelect = { selectedDayIndex = it },
                    )
                }
            }
            activeDay?.let { day ->
                item(key = "agenda-${day.day}-${day.date}") {
                    DayBlock(day, trip.destination, onMaps)
                }
            }
        } else {
            if (sponsored.isNotEmpty()) {
                item {
                    Text("Đề xuất từ đối tác", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = PremiumColors.Ink)
                }
                items(sponsored, key = { "sp-${it.id}" }) { loc ->
                    SponsoredLocationCard(loc) { onOpenLocation(loc.id) }
                }
            }
            item {
                Text("Khách sạn", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = PremiumColors.Ink)
            }
            val hotels = it?.hotel_suggestions.orEmpty()
            if (hotels.isEmpty()) {
                item {
                    if (otaPending) {
                        HotelLoadingProgress()
                    } else {
                        Text(
                            "Chưa có khách sạn đề xuất.",
                            fontSize = 14.sp,
                            color = PremiumColors.Muted,
                        )
                    }
                }
            } else {
                items(hotels, key = { "${it.name}-${it.site}" }) { hotel ->
                    HotelCard(hotel, onMaps)
                }
            }

            it?.voucher_suggestions?.takeIf { it.isNotEmpty() }?.let { vouchers ->
                item { Text("Voucher gợi ý", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = PremiumColors.Ink) }
                items(vouchers, key = { it.voucher_id }) { v ->
                    InfoCard("${v.code} — ${v.title}", v.partner_name)
                }
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                PremiumAccentButton("Nhân bản", onDuplicate, modifier = Modifier.weight(1f), icon = Icons.Default.ContentCopy, height = 44.dp)
                PremiumGhostButton("Xóa", onDelete, modifier = Modifier.weight(1f))
            }
        }
    }
}

private enum class TripDetailTab { Itinerary, Suggestions }

@Composable
private fun DetailTabSelector(
    selectedTab: TripDetailTab,
    onSelect: (TripDetailTab) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(PremiumColors.InputBg)
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        DetailTabButton("Lịch trình", selectedTab == TripDetailTab.Itinerary, Modifier.weight(1f)) {
            onSelect(TripDetailTab.Itinerary)
        }
        DetailTabButton("Đề xuất", selectedTab == TripDetailTab.Suggestions, Modifier.weight(1f)) {
            onSelect(TripDetailTab.Suggestions)
        }
    }
}

@Composable
private fun DetailTabButton(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Box(
        modifier = modifier
            .height(38.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(if (selected) PremiumColors.Accent else Color.Transparent)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (selected) Color.White else PremiumColors.Muted,
        )
    }
}

@Composable
private fun DaySchedulePicker(
    days: List<ItineraryDayPlan>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyRow(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        itemsIndexed(days, key = { _, day -> "picker-${day.day}-${day.date}" }) { index, day ->
            val selected = index == selectedIndex
            val borderColor = if (selected) PremiumColors.Accent else PremiumColors.Border
            val backgroundColor = if (selected) PremiumColors.AccentLight else PremiumColors.Surface

            Column(
                modifier = Modifier
                    .width(80.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .border(1.dp, borderColor, RoundedCornerShape(12.dp))
                    .background(backgroundColor)
                    .clickable { onSelect(index) }
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    "NGÀY ${day.day}",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    color = if (selected) PremiumColors.Accent else PremiumColors.Muted,
                )
                Text(
                    FormatUtils.formatDayShort(day.date),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = PremiumColors.Ink,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
        }
    }
}

@Composable
private fun DayBlock(day: ItineraryDayPlan, destination: String, onMaps: (String) -> Unit) {
    val activities = getDayActivities(day)

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                "Ngày ${day.day}: ${day.date}",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
            )
            if (day.theme.isNotBlank()) {
                Text(day.theme, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            activities.forEachIndexed { index, slot ->
                TimelineAgendaRow(
                    slot = slot,
                    isLast = index == activities.lastIndex,
                    destination = destination,
                    onMaps = onMaps,
                )
            }
        }
    }
}

@Composable
private fun TimelineAgendaRow(
    slot: ItinerarySlot,
    isLast: Boolean,
    destination: String,
    onMaps: (String) -> Unit,
) {
    val start = slot.start_time?.trim()?.takeIf { it.isNotEmpty() } ?: "—"
    val end = slot.end_time?.trim()?.takeIf { it.isNotEmpty() } ?: "—"
    val clockLabel = if (start != "—") formatSlotClock(start) else "—"

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min),
    ) {
        Column(
            modifier = Modifier.width(56.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Surface(
                color = PremiumColors.Accent,
                shape = RoundedCornerShape(10.dp),
            ) {
                Text(
                    clockLabel,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White,
                )
            }
        }

        AgendaPlaceCard(
            slot = slot,
            start = start,
            end = end,
            destination = destination,
            modifier = Modifier
                .weight(1f)
                .padding(start = 10.dp, bottom = if (isLast) 0.dp else 16.dp),
            onMaps = onMaps,
        )
    }
}

@Composable
private fun AgendaPlaceCard(
    slot: ItinerarySlot,
    start: String,
    end: String,
    destination: String,
    modifier: Modifier = Modifier,
    onMaps: (String) -> Unit,
) {
    val title = slot.title?.trim()?.takeIf { it.isNotEmpty() } ?: "—"
    val imageUrl = slotFirstImage(slot)
    val thumbFallback = title.firstOrNull()?.uppercaseChar()?.toString() ?: "?"

    Card(
        modifier = modifier
            .fillMaxWidth()
            .shadow(PremiumDesign.CardElevation, RoundedCornerShape(PremiumDesign.CardRadius), ambientColor = PremiumDesign.SoftShadowColor),
        shape = RoundedCornerShape(PremiumDesign.CardRadius),
        colors = CardDefaults.cardColors(containerColor = PremiumColors.Surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.Top,
            ) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                    slot.summary?.takeIf { it.isNotBlank() }?.let {
                        Text(
                            it,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 4,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    if (start != "—" || end != "—") {
                        Text(
                            formatTimeRange(start, end),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                PlaceThumbnail(
                    imageUrl = imageUrl,
                    fallback = thumbFallback,
                    contentDescription = title,
                )
            }

            slot.weather_note?.trim()?.takeIf { it.isNotEmpty() }?.let { weather ->
                val isWarning = weather.contains("⚠️")
                val cleaned = weather.replace("⚠️", "").trim()
                val tint = if (isWarning) Color(0xFFE08A00) else MaterialTheme.colorScheme.onSurfaceVariant
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(tint.copy(alpha = 0.12f))
                        .padding(horizontal = 8.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    Icon(
                        if (isWarning) Icons.Outlined.WarningAmber else Icons.Outlined.WbSunny,
                        contentDescription = null,
                        modifier = Modifier.height(16.dp),
                        tint = tint,
                    )
                    Text(
                        cleaned,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = if (isWarning) FontWeight.SemiBold else FontWeight.Normal,
                        color = tint,
                    )
                }
            }

            val mapsQueryUrl = slotMapsQueryUrl(slot, destination)
            if (mapsQueryUrl != null || slot.notes?.isNotBlank() == true) {
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
                mapsQueryUrl?.let { url ->
                    OutlinedButton(
                        onClick = { onMaps(url) },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.Outlined.Place, contentDescription = null, modifier = Modifier.height(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Maps")
                    }
                }
                slot.notes?.takeIf { it.isNotBlank() }?.let { notes ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.Top,
                    ) {
                        Icon(
                            Icons.Outlined.EditNote,
                            contentDescription = null,
                            modifier = Modifier.height(18.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Column {
                            Text("Ghi chú", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Medium)
                            Text(notes, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PlaceThumbnail(
    imageUrl: String?,
    fallback: String,
    contentDescription: String,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(10.dp)
    var failed by remember(imageUrl) { mutableStateOf(false) }
    Box(
        modifier = modifier
            .width(96.dp)
            .height(96.dp)
            .clip(shape)
            .background(MaterialTheme.colorScheme.surfaceVariant),
        contentAlignment = Alignment.Center,
    ) {
        if (imageUrl != null && !failed) {
            AsyncImage(
                model = imageUrl,
                contentDescription = contentDescription,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
                onError = { failed = true },
            )
        } else {
            Text(
                fallback,
                style = MaterialTheme.typography.headlineSmall,
                color = PremiumColors.Accent,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun HotelCard(hotel: BookingSuggestion, onMaps: (String) -> Unit) {
    val images = hotelImages(hotel)
    val context = LocalContext.current
    val stars = parseHotelRating(hotel.reason, hotel.price_level)
    val mapsUrl = hotel.maps_url ?: hotel.name

    PremiumSurfaceCard(Modifier.fillMaxWidth()) {
        Row(Modifier.padding(PremiumDesign.CardPadding), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(Modifier.weight(1f)) {
                Text(hotel.name, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                Text(
                    siteLabel(hotel.site),
                    fontSize = 12.sp,
                    color = PremiumColors.TextMuted,
                    modifier = Modifier.padding(top = 4.dp),
                )
                Row(modifier = Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(1.dp)) {
                    repeat(5) { i ->
                        Text(
                            text = if (i < stars) "★" else "☆",
                            fontSize = 14.sp,
                            color = if (i < stars) Color(0xFFEAB308) else Color(0xFFD4D4D4),
                        )
                    }
                }
                hotel.room_name?.takeIf { it.isNotBlank() }?.let { room ->
                    Text(
                        room,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = PremiumColors.Ink,
                        modifier = Modifier.padding(top = 6.dp),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                dedupeRoomAmenities(hotel.room_amenities, hotel.room_name).takeIf { it.isNotEmpty() }?.let { amenities ->
                    FlowRow(
                        modifier = Modifier.padding(top = 6.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        amenities.forEach { tag ->
                            Text(
                                tag,
                                fontSize = 11.sp,
                                color = PremiumColors.Ink,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .border(1.dp, PremiumColors.Border, RoundedCornerShape(8.dp))
                                    .padding(horizontal = 8.dp, vertical = 4.dp),
                            )
                        }
                    }
                }
                hotel.avg_distance_km?.let { avg ->
                    Text(
                        "Khoảng cách TB: $avg km",
                        fontSize = 12.sp,
                        color = PremiumColors.Ink,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
                hotel.price_vnd?.let {
                    Text(
                        FormatUtils.formatVnd(it),
                        color = PremiumColors.Accent,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
                Row(
                    modifier = Modifier.padding(top = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    hotel.url?.let { url ->
                        Text(
                            "Xem phòng",
                            color = PremiumColors.Accent,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.clickable {
                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                            },
                        )
                    }
                    Text(
                        "Maps",
                        color = PremiumColors.Accent,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.clickable {
                            hotel.maps_url?.let { onMaps(it) }
                                ?: context.startActivity(
                                    Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/search/?api=1&query=${Uri.encode(mapsUrl)}"))
                                )
                        },
                    )
                }
            }
            ImageCarousel(images, hotel.name, modifier = Modifier.height(120.dp).width(120.dp), fallback = hotel.name.firstOrNull()?.toString() ?: "H")
        }
    }
}

@Composable
private fun InfoCardSimple(title: String, subtitle: String) {
    InfoCard(title, subtitle)
}

/** Lazy-load text xoay vòng cho biết AI đang làm gì khi quét khách sạn/đề xuất. */
@Composable
private fun HotelLoadingProgress() {
    val messages = listOf(
        "Đang quét khách sạn từ các trang đặt phòng…",
        "So sánh giá phòng theo ngân sách của bạn…",
        "Lấy ảnh & vị trí từng khách sạn…",
        "Chọn lọc gợi ý phù hợp nhất…",
        "Sắp hoàn tất, chuẩn bị hiển thị…",
    )
    var step by remember { mutableStateOf(0) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(1800)
            step += 1
        }
    }
    PremiumSurfaceCard(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(PremiumDesign.CardPadding), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OrangeLoadingSpinner()
                Text(
                    messages[step % messages.size],
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = PremiumColors.Ink,
                )
            }
            Text(
                "AI đang tổng hợp đề xuất, thường mất 10–20 giây…",
                fontSize = 12.sp,
                color = PremiumColors.Muted,
            )
        }
    }
}
