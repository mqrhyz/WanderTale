package com.wandertale.mobile.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.wandertale.mobile.R
import com.wandertale.mobile.data.model.TripRecord
import com.wandertale.mobile.ui.theme.PremiumColors
import com.wandertale.mobile.ui.theme.PremiumDesign
import com.wandertale.mobile.util.FormatUtils
import com.wandertale.mobile.util.TripPhase
import com.wandertale.mobile.util.getTripPhase
import com.wandertale.mobile.util.tripActivityCount
import com.wandertale.mobile.util.tripBudgetChip
import com.wandertale.mobile.util.tripCoverImageUrl
import com.wandertale.mobile.util.tripWeatherChip

@Composable
private fun premiumBorder(): Color =
    if (isSystemInDarkTheme()) PremiumColors.BorderDark else PremiumColors.Border

@Composable
fun DashboardPageHeader(
    kicker: String? = null,
    title: String,
    description: String? = null,
    modifier: Modifier = Modifier,
) {
    Column(modifier) {
        kicker?.let {
            Text(
                text = it.uppercase(),
                color = PremiumColors.TextMuted,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 0.72.sp,
            )
            Spacer(Modifier.height(6.dp))
        }
        Text(
            text = title,
            color = MaterialTheme.colorScheme.onSurface,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            lineHeight = 29.sp,
        )
        description?.let {
            Spacer(Modifier.height(6.dp))
            Text(
                text = it,
                color = PremiumColors.TextMuted,
                fontSize = 14.sp,
                lineHeight = 21.sp,
            )
        }
    }
}

@Composable
fun PremiumAccentButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    enabled: Boolean = true,
    loading: Boolean = false,
    height: androidx.compose.ui.unit.Dp = 48.dp,
    shimmer: Boolean = true,
) {
    val shape = RoundedCornerShape(PremiumDesign.ButtonRadius)
    val interactive = enabled && !loading
    Button(
        onClick = onClick,
        enabled = interactive,
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .shadow(8.dp, shape, ambientColor = PremiumColors.Accent.copy(0.35f))
            .ctaShimmerIdle(shape, enabled = interactive && shimmer),
        shape = shape,
        colors = ButtonDefaults.buttonColors(
            containerColor = PremiumColors.Accent,
            contentColor = Color.White,
            disabledContainerColor = Color(0xFFC4C4C4),
            disabledContentColor = Color.White.copy(alpha = 0.9f),
        ),
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(22.dp),
                color = Color.White,
                strokeWidth = 2.dp,
            )
        } else {
            if (icon != null) {
                Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
            }
            Text(text, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
fun PremiumSurfaceCard(
    modifier: Modifier = Modifier,
    elevated: Boolean = false,
    content: @Composable () -> Unit,
) {
    val elevation = if (elevated) PremiumDesign.ElevatedElevation else PremiumDesign.CardElevation
    Card(
        modifier = modifier
            .fillMaxWidth()
            .shadow(elevation, RoundedCornerShape(PremiumDesign.CardRadius), ambientColor = PremiumDesign.SoftShadowColor),
        shape = RoundedCornerShape(PremiumDesign.CardRadius),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = androidx.compose.foundation.BorderStroke(1.dp, premiumBorder().copy(alpha = 0.5f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        content()
    }
}

@Composable
fun PremiumMetricCard(
    label: String,
    value: String,
    iconBg: Color,
    icon: ImageVector,
    iconTint: Color,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    animatedInt: Int? = null,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.98f else 1f,
        animationSpec = tween(120),
        label = "metric_scale",
    )

    Card(
        modifier = modifier
            .fillMaxWidth()
            .scale(scale)
            .shadow(PremiumDesign.CardElevation, RoundedCornerShape(PremiumDesign.CardRadius), ambientColor = PremiumDesign.SoftShadowColor)
            .then(
                if (onClick != null) {
                    Modifier.clickable(interactionSource = interactionSource, indication = null, onClick = onClick)
                } else Modifier,
            ),
        shape = RoundedCornerShape(PremiumDesign.CardRadius),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(PremiumDesign.CardPadding),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(PremiumDesign.IconContainerRadius))
                    .background(iconBg),
                contentAlignment = Alignment.Center,
            ) {
                Icon(imageVector = icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(20.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(
                    label,
                    color = PremiumColors.TextMuted,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(4.dp))
                if (animatedInt != null) {
                    CountUpIntDisplay(target = animatedInt) { display ->
                        Text(
                            display,
                            color = MaterialTheme.colorScheme.onSurface,
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            lineHeight = 32.sp,
                        )
                    }
                } else {
                    Text(
                        value,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        lineHeight = 32.sp,
                    )
                }
            }
        }
    }
}

@Composable
fun DashboardHeroCard(
    greeting: String,
    tripCount: Int,
    onCreateTrip: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(200.dp)
            .shadow(PremiumDesign.ElevatedElevation, RoundedCornerShape(PremiumDesign.HeroRadius), ambientColor = PremiumDesign.SoftShadowColor)
            .clip(RoundedCornerShape(PremiumDesign.HeroRadius)),
    ) {
        Image(
            painter = painterResource(R.drawable.dashboard_bg),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.matchParentSize(),
        )
        Box(
            Modifier
                .matchParentSize()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color.Black.copy(alpha = 0.10f),
                            Color.Black.copy(alpha = 0.65f),
                        ),
                    ),
                ),
        )
        Column(
            Modifier
                .fillMaxSize()
                .padding(16.dp),
        ) {
            Text(
                "BẢNG ĐIỀU KHIỂN",
                color = Color.White.copy(alpha = 0.75f),
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 0.72.sp,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Chào, $greeting! 👋",
                color = Color.White,
                fontSize = 26.sp,
                lineHeight = 31.sp,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                if (tripCount > 0) "Bạn đang quản lý $tripCount hành trình." else "Bắt đầu hành trình đầu tiên của bạn.",
                color = Color.White.copy(alpha = 0.85f),
                fontSize = 14.sp,
                lineHeight = 20.sp,
            )
            Spacer(Modifier.weight(1f))
            Button(
                onClick = onCreateTrip,
                shape = RoundedCornerShape(PremiumDesign.ButtonRadius),
                colors = ButtonDefaults.buttonColors(containerColor = PremiumColors.Accent),
                modifier = Modifier
                    .height(44.dp)
                    .shadow(6.dp, RoundedCornerShape(PremiumDesign.ButtonRadius), ambientColor = PremiumColors.Accent.copy(0.4f)),
                contentPadding = PaddingValues(horizontal = 18.dp),
            ) {
                Text("✦ Tạo chuyến AI", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun PhaseBadge(phase: TripPhase, modifier: Modifier = Modifier) {
    val bg = when (phase) {
        TripPhase.UPCOMING -> PremiumColors.BadgeUpcoming
        TripPhase.ONGOING -> PremiumColors.BadgeActive
        TripPhase.COMPLETED -> PremiumColors.BadgePast
    }
    val label = when (phase) {
        TripPhase.UPCOMING -> "SẮP TỚI"
        TripPhase.ONGOING -> "ĐANG ĐI"
        TripPhase.COMPLETED -> "ĐÃ QUA"
    }
    Text(
        text = label,
        color = Color.White,
        fontSize = 10.sp,
        fontWeight = FontWeight.SemiBold,
        letterSpacing = 0.5.sp,
        modifier = modifier
            .clip(CircleShape)
            .background(bg)
            .padding(horizontal = 10.dp, vertical = 5.dp),
    )
}

@Composable
fun CompactTripCard(
    trip: TripRecord,
    index: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val phase = getTripPhase(trip.start_date, trip.end_date)
    val gradient = PremiumColors.TripGradients[index % PremiumColors.TripGradients.size]
    val coverUrl = tripCoverImageUrl(trip)
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.98f else 1f, tween(120), label = "trip_scale")

    Box(
        modifier = modifier
            .width(160.dp)
            .height(200.dp)
            .scale(scale)
            .shadow(PremiumDesign.CardElevation, RoundedCornerShape(PremiumDesign.CardRadius), ambientColor = PremiumDesign.SoftShadowColor)
            .clip(RoundedCornerShape(PremiumDesign.CardRadius))
            .clickable(interactionSource = interactionSource, indication = null, onClick = onClick),
    ) {
        if (coverUrl != null) {
            AsyncImage(model = coverUrl, contentDescription = trip.destination, contentScale = ContentScale.Crop, modifier = Modifier.matchParentSize())
        } else {
            Box(Modifier.matchParentSize().background(Brush.linearGradient(gradient)))
        }
        Box(
            Modifier
                .matchParentSize()
                .background(
                    Brush.verticalGradient(listOf(Color.Black.copy(0.15f), Color.Black.copy(0.75f))),
                ),
        )
        PhaseBadge(phase, Modifier.align(Alignment.TopStart).padding(10.dp))
        Column(Modifier.align(Alignment.BottomStart).padding(12.dp)) {
            Text(trip.destination, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text(
                FormatUtils.formatDateRange(trip.start_date, trip.end_date),
                color = Color.White.copy(alpha = 0.8f),
                fontSize = 11.sp,
                modifier = Modifier.padding(top = 4.dp),
                maxLines = 1,
                softWrap = false,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
fun TallTripListCard(
    trip: TripRecord,
    index: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    showFavoriteHeart: Boolean = false,
    bookingLabel: String? = null,
) {
    val phase = getTripPhase(trip.start_date, trip.end_date)
    val gradient = PremiumColors.TripGradients[index % PremiumColors.TripGradients.size]
    val coverUrl = tripCoverImageUrl(trip)
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.98f else 1f, tween(120), label = "tall_trip_scale")
    val translateY by animateFloatAsState(if (pressed) -4f else 0f, tween(120), label = "tall_trip_y")

    val places = tripActivityCount(trip).takeIf { it > 0 } ?: trip.travelers
    val chips = listOf(
        "📍 $places điểm",
        "💰 ${tripBudgetChip(trip)}",
        tripWeatherChip(trip),
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(220.dp)
            .offset(y = translateY.dp)
            .scale(scale)
            .shadow(
                if (pressed) PremiumDesign.ElevatedElevation else PremiumDesign.CardElevation,
                RoundedCornerShape(PremiumDesign.HeroRadius),
                ambientColor = PremiumDesign.SoftShadowColor,
            )
            .clip(RoundedCornerShape(PremiumDesign.HeroRadius))
            .clickable(interactionSource = interactionSource, indication = null, onClick = onClick),
    ) {
        if (coverUrl != null) {
            AsyncImage(model = coverUrl, contentDescription = trip.destination, contentScale = ContentScale.Crop, modifier = Modifier.matchParentSize())
        } else {
            Box(Modifier.matchParentSize().background(Brush.linearGradient(gradient)))
        }
        Box(
            Modifier
                .matchParentSize()
                .background(
                    Brush.verticalGradient(
                        0f to Color.Transparent,
                        0.3f to Color.Transparent,
                        1f to Color.Black.copy(alpha = 0.75f),
                    ),
                ),
        )
        PhaseBadge(phase, Modifier.align(Alignment.TopEnd).padding(14.dp))
        if (showFavoriteHeart) {
            Icon(
                Icons.Default.Favorite,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 14.dp, end = if (phase != TripPhase.COMPLETED) 90.dp else 14.dp)
                    .size(20.dp),
            )
        }
        bookingLabel?.let {
            Text(
                it,
                color = Color.White,
                fontSize = 10.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(14.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.2f))
                    .padding(horizontal = 8.dp, vertical = 4.dp),
            )
        }
        Column(Modifier.align(Alignment.BottomStart).padding(16.dp)) {
            Text(trip.destination, color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text(
                FormatUtils.formatDateRange(trip.start_date, trip.end_date),
                color = Color.White.copy(alpha = 0.8f),
                fontSize = 13.sp,
                modifier = Modifier.padding(top = 4.dp),
            )
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                chips.forEach { chip ->
                    Text(
                        chip,
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.18f))
                            .padding(horizontal = 10.dp, vertical = 5.dp),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}

@Composable
private fun HorizontalScrollFade(modifier: Modifier = Modifier) {
    Box(
        modifier
            .width(40.dp)
            .fillMaxHeight()
            .background(
                Brush.horizontalGradient(
                    listOf(Color.Transparent, MaterialTheme.colorScheme.background),
                ),
            ),
    )
}

@Composable
fun TripGallerySection(
    trips: List<TripRecord>,
    onOpenTrip: (String) -> Unit,
    onCreateTrip: () -> Unit,
    showSectionHeader: Boolean = true,
    sectionTitle: String = "Chuyến đi gần đây",
    showViewAll: Boolean = true,
    compactCards: Boolean = true,
) {
    if (showSectionHeader) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(sectionTitle, color = MaterialTheme.colorScheme.onSurface, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
            if (showViewAll && trips.isNotEmpty()) {
                Text(
                    "Xem tất cả →",
                    color = PremiumColors.Accent,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier
                        .premiumPressScale(onClick = onCreateTrip),
                )
            }
        }
        Spacer(Modifier.height(12.dp))
    }

    if (trips.isEmpty()) return

    Box(Modifier.fillMaxWidth()) {
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(end = 32.dp),
        ) {
            itemsIndexed(trips, key = { _, trip -> trip.id }) { index, trip ->
                if (compactCards) {
                    CompactTripCard(trip, index, onClick = { onOpenTrip(trip.id) })
                } else {
                    TallTripListCard(trip, index, onClick = { onOpenTrip(trip.id) })
                }
            }
        }
        HorizontalScrollFade(Modifier.align(Alignment.CenterEnd))
    }
}

@Composable
fun TripSegmentControl(
    segments: List<String>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(PremiumColors.SegmentBg)
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        segments.forEachIndexed { index, label ->
            val selected = index == selectedIndex
            val bg = if (selected) MaterialTheme.colorScheme.surface else Color.Transparent
            val interactionSource = remember { MutableInteractionSource() }
            Box(
                Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(10.dp))
                    .then(
                        if (selected) {
                            Modifier.shadow(2.dp, RoundedCornerShape(10.dp), ambientColor = PremiumDesign.SoftShadowColor)
                        } else Modifier,
                    )
                    .background(bg)
                    .clickable(
                        interactionSource = interactionSource,
                        indication = null,
                        enabled = !selected,
                    ) { onSelect(index) }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    label,
                    fontSize = 13.sp,
                    fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                    color = if (selected) PremiumColors.Ink else PremiumColors.Muted,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
fun PastTripsEmptyState(modifier: Modifier = Modifier) {
    Column(
        modifier
            .fillMaxWidth()
            .padding(vertical = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("🗺️", fontSize = 48.sp)
        Spacer(Modifier.height(16.dp))
        Text("Chưa có hành trình nào", fontSize = 17.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
        Text(
            "Hoàn thành chuyến đầu tiên và nó sẽ xuất hiện ở đây.",
            color = PremiumColors.TextMuted,
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 8.dp, start = 24.dp, end = 24.dp),
        )
    }
}

@Composable
fun FavoritesEmptyState(onCreateTrip: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier
            .fillMaxWidth()
            .padding(vertical = 48.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            TravelEmptyIllustration()
            Spacer(Modifier.height(24.dp))
            Text(
                "Chưa có hành trình yêu thích",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
            )
            Text(
                "Đánh dấu yêu thích những chuyến đi để truy cập nhanh sau này.",
                color = PremiumColors.TextMuted,
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .padding(top = 10.dp)
                    .width(260.dp),
            )
            Spacer(Modifier.height(24.dp))
            PremiumAccentButton(
                text = "✦ Tạo hành trình mới",
                onClick = onCreateTrip,
                modifier = Modifier.width(240.dp),
                height = 48.dp,
            )
        }
    }
}

@Composable
fun PremiumGhostButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier
            .fillMaxWidth()
            .height(48.dp)
            .premiumPressScale(enabled),
        shape = RoundedCornerShape(PremiumDesign.ButtonRadius),
        border = androidx.compose.foundation.BorderStroke(1.dp, premiumBorder()),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = Color.Transparent,
            contentColor = MaterialTheme.colorScheme.onSurface,
        ),
    ) {
        Text(text, fontSize = 15.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
fun FavoriteChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val bg by animateColorAsState(
        if (selected) PremiumColors.AccentTint else MaterialTheme.colorScheme.surface,
        tween(200),
        label = "fav_chip_bg",
    )
    val borderColor by animateColorAsState(
        if (selected) PremiumColors.Accent else premiumBorder(),
        tween(200),
        label = "fav_chip_border",
    )

    Row(
        modifier = Modifier
            .clip(CircleShape)
            .border(
                if (selected) 1.5.dp else 1.dp,
                borderColor,
                CircleShape,
            )
            .background(bg)
            .premiumPressScale(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(
            if (selected) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder,
            contentDescription = null,
            tint = if (selected) PremiumColors.Accent else PremiumColors.Muted,
            modifier = Modifier.size(14.dp),
        )
        Text(label, color = if (selected) PremiumColors.Accent else PremiumColors.Muted, fontSize = 13.sp)
    }
}

@Composable
fun TripPlannerPromoCard(onCreateTrip: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.98f else 1f, tween(120), label = "promo_scale")

    PremiumSurfaceCard(elevated = true) {
        Row(
            Modifier
                .fillMaxWidth()
                .scale(scale)
                .clickable(interactionSource = interactionSource, indication = null, onClick = onCreateTrip)
                .padding(PremiumDesign.CardPadding),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("✦", color = PremiumColors.Accent, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("Lên kế hoạch với AI", fontSize = 17.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                Text(
                    "Nhập điểm đến, ngân sách — WanderTale lo lịch trình chi tiết.",
                    color = PremiumColors.TextMuted,
                    fontSize = 13.sp,
                    lineHeight = 18.sp,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = PremiumColors.TextMuted,
                modifier = Modifier.size(24.dp),
            )
        }
    }
}
