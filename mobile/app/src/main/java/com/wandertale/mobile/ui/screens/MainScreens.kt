package com.wandertale.mobile.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.calculateEndPadding
import androidx.compose.foundation.layout.calculateStartPadding
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import coil.compose.AsyncImage
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Apartment
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.CardTravel
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Help
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.MonetizationOn
import androidx.compose.material.icons.outlined.Route
import androidx.compose.material.icons.filled.Place
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.Spacer
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import com.wandertale.mobile.data.DashboardHomeCache
import com.wandertale.mobile.WanderTaleApp
import com.wandertale.mobile.data.api.ApiClient
import com.wandertale.mobile.data.model.DashboardStats
import com.wandertale.mobile.data.model.Promotion
import com.wandertale.mobile.data.model.PromotionHomePayload
import com.wandertale.mobile.data.model.PromotionPost
import com.wandertale.mobile.data.model.TripRecord
import com.wandertale.mobile.data.model.UserSubscriptionOverview
import com.wandertale.mobile.R
import com.wandertale.mobile.ui.components.AppScaffold
import com.wandertale.mobile.ui.components.DashboardHeroCard
import com.wandertale.mobile.ui.components.DashboardPageHeader
import com.wandertale.mobile.ui.components.ErrorText
import com.wandertale.mobile.ui.components.FavoriteChip
import com.wandertale.mobile.ui.components.InfoCard
import com.wandertale.mobile.ui.components.OrangeLoadingSpinner
import com.wandertale.mobile.ui.components.TripDetailSkeleton
import com.wandertale.mobile.ui.components.PremiumAccentButton
import com.wandertale.mobile.ui.components.FavoritesEmptyState
import com.wandertale.mobile.ui.components.premiumPressScale
import com.wandertale.mobile.ui.components.PremiumPullRefreshBox
import com.wandertale.mobile.ui.components.TripsListSkeleton
import com.wandertale.mobile.ui.components.PastTripsEmptyState
import com.wandertale.mobile.ui.components.PremiumMetricCard
import com.wandertale.mobile.ui.components.PremiumSurfaceCard
import com.wandertale.mobile.ui.components.TallTripListCard
import com.wandertale.mobile.ui.components.TripSegmentControl
import com.wandertale.mobile.ui.components.DotPatternBackground
import com.wandertale.mobile.ui.components.TripGallerySection
import com.wandertale.mobile.ui.components.TripPlannerPromoCard
import com.wandertale.mobile.ui.components.WanderTaleBottomNavDark
import com.wandertale.mobile.ui.components.WanderTaleBottomNavLight
import com.wandertale.mobile.ui.components.WanderTaleBottomNavOverlayHeight
import com.wandertale.mobile.ui.navigation.Routes
import com.wandertale.mobile.ui.theme.PremiumColors
import com.wandertale.mobile.ui.theme.PremiumDesign
import com.wandertale.mobile.util.FormatUtils
import com.wandertale.mobile.util.TripPhase
import com.wandertale.mobile.util.getTripPhase
import kotlinx.coroutines.launch
import androidx.compose.ui.layout.ContentScale

@Composable
fun MainShell(
    darkTheme: Boolean,
    currentTab: String,
    onTab: (String) -> Unit,
    onNavigate: (String) -> Unit,
    onCreateTrip: () -> Unit,
    content: @Composable (PaddingValues) -> Unit,
) {
    val currentRoute = Routes.tabToNavRoute(currentTab)
    val showNav = currentTab != "create"
    val navBgColor by animateColorAsState(
        targetValue = if (darkTheme) Color(0xFF1A1A1A) else Color.White,
        animationSpec = tween(durationMillis = 300),
        label = "nav_bg",
    )
    val statusBarsPadding = WindowInsets.statusBars.asPaddingValues()
    val navBarsPadding = WindowInsets.navigationBars.asPaddingValues()
    val scrollPadding = PaddingValues(
        top = statusBarsPadding.calculateTopPadding() + 8.dp,
        bottom = if (showNav) {
            WanderTaleBottomNavOverlayHeight + 4.dp
        } else {
            navBarsPadding.calculateBottomPadding() + 8.dp
        },
    )

    Box(modifier = Modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background),
        ) {
            content(scrollPadding)
        }

        if (showNav) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .offset(y = PremiumDesign.BottomNavDrop),
            ) {
                if (darkTheme) {
                    WanderTaleBottomNavDark(
                        currentRoute = currentRoute,
                        onNavigate = { route -> onTab(Routes.navRouteToTab(route)) },
                        onCreateClick = onCreateTrip,
                        backgroundColor = navBgColor,
                    )
                } else {
                    WanderTaleBottomNavLight(
                        currentRoute = currentRoute,
                        onNavigate = { route -> onTab(Routes.navRouteToTab(route)) },
                        onCreateClick = onCreateTrip,
                        backgroundColor = navBgColor,
                    )
                }
            }
        }
    }
}

@Composable
fun DashboardScreen(
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(0.dp),
    stats: DashboardStats?,
    trips: List<TripRecord>,
    displayName: String,
    error: String?,
    animateMetrics: Boolean = false,
    onOpenTrip: (String) -> Unit,
    onNavigate: (String) -> Unit,
    isRefreshing: Boolean = false,
    onRefresh: (() -> Unit)? = null,
) {
    var promotionHome by remember { mutableStateOf<PromotionHomePayload?>(null) }
    var selectedPromotionPost by remember { mutableStateOf<PromotionPost?>(null) }
    val scope = rememberCoroutineScope()

    suspend fun loadPromotions() {
        promotionHome = runCatching { ApiClient.promotionHome() }.getOrNull()
    }

    LaunchedEffect(Unit) {
        loadPromotions()
    }

    val listContent: @Composable () -> Unit = {
        LazyColumn(
            modifier = modifier.padding(horizontal = PremiumDesign.ScreenPadding, vertical = 12.dp),
            contentPadding = contentPadding,
            verticalArrangement = Arrangement.spacedBy(PremiumDesign.SectionGap),
        ) {
            item {
                DashboardHeroCard(
                    greeting = displayName,
                    tripCount = stats?.total_trips ?: trips.size,
                    onCreateTrip = { onNavigate("planner") },
                )
            }
            error?.let { item { ErrorText(it) } }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        Modifier.fillMaxWidth().height(IntrinsicSize.Max),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        PremiumMetricCard(
                            label = "Chuyến đi",
                            value = stats?.total_trips?.toString() ?: "—",
                            iconBg = PremiumColors.StatTripBg,
                            icon = Icons.Outlined.CalendarMonth,
                            iconTint = PremiumColors.StatTripIcon,
                            modifier = Modifier.weight(1f),
                            animatedInt = if (animateMetrics) stats?.total_trips else null,
                        )
                        PremiumMetricCard(
                            label = "Điểm đến",
                            value = stats?.unique_destinations?.toString() ?: "—",
                            iconBg = PremiumColors.StatDestBg,
                            icon = Icons.Default.Place,
                            iconTint = PremiumColors.StatDestIcon,
                            modifier = Modifier.weight(1f),
                            animatedInt = if (animateMetrics) stats?.unique_destinations else null,
                        )
                    }
                    Row(
                        Modifier.fillMaxWidth().height(IntrinsicSize.Max),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        PremiumMetricCard(
                            label = "Ngân sách",
                            value = stats?.let { FormatUtils.formatCompactVnd(it.total_budget_planned) } ?: "—",
                            iconBg = PremiumColors.StatBudgetBg,
                            icon = Icons.Outlined.MonetizationOn,
                            iconTint = PremiumColors.StatBudgetIcon,
                            modifier = Modifier.weight(1f),
                        )
                        PremiumMetricCard(
                            label = "Hoạt động",
                            value = stats?.places_in_itineraries?.toString() ?: "—",
                            iconBg = PremiumColors.StatActivityBg,
                            icon = Icons.Outlined.Route,
                            iconTint = PremiumColors.StatActivityIcon,
                            modifier = Modifier.weight(1f),
                            animatedInt = if (animateMetrics) stats?.places_in_itineraries else null,
                        )
                    }
                }
            }
            item {
                TripGallerySection(
                    trips = trips.take(6),
                    onOpenTrip = onOpenTrip,
                    onCreateTrip = { onNavigate("planner") },
                )
            }
            item {
                PromotionHomeSection(
                    payload = promotionHome,
                    onPostClick = { selectedPromotionPost = it },
                    onToggleVoucher = { voucher ->
                        scope.launch {
                            if (voucher.is_saved == true) {
                                runCatching { ApiClient.unsavePromotionVoucher(voucher.id) }
                            } else {
                                runCatching { ApiClient.savePromotionVoucher(voucher.id) }
                            }
                            loadPromotions()
                        }
                    },
                )
            }
            item { Spacer(Modifier.height(8.dp)) }
        }
    }

    selectedPromotionPost?.let { post ->
        PromotionPostDialog(
            post = post,
            onDismiss = { selectedPromotionPost = null },
            onSaveVoucher = { voucher ->
                scope.launch {
                    runCatching { ApiClient.savePromotionVoucher(voucher.id) }
                    loadPromotions()
                    selectedPromotionPost = selectedPromotionPost?.copy(voucher = voucher.copy(is_saved = true))
                }
            },
        )
    }

    if (onRefresh != null) {
        PremiumPullRefreshBox(
            refreshing = isRefreshing,
            onRefresh = onRefresh,
            modifier = modifier,
        ) { listContent() }
    } else {
        listContent()
    }
}

@Composable
private fun PromotionHomeSection(
    payload: PromotionHomePayload?,
    onPostClick: (PromotionPost) -> Unit,
    onToggleVoucher: (Promotion) -> Unit,
) {
    val vouchers = payload?.let { it.vouchers.ifEmpty { it.items } } ?: emptyList()
    val posts = payload?.posts.orEmpty()
    if (vouchers.isEmpty() && posts.isEmpty()) return

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text(
            "Khám phá ưu đãi dành riêng cho bạn",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
        )
        if (vouchers.isNotEmpty()) {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                items(vouchers, key = { it.id }) { voucher ->
                    PromotionVoucherCard(voucher = voucher, onToggle = { onToggleVoucher(voucher) })
                }
            }
        }
        if (posts.isNotEmpty()) {
            PromotionPostMasonry(posts = posts, onPostClick = onPostClick)
        }
    }
}

@Composable
@OptIn(ExperimentalLayoutApi::class)
private fun PromotionPostMasonry(
    posts: List<PromotionPost>,
    onPostClick: (PromotionPost) -> Unit,
) {
    val primary = posts.filter { it.post_type == "main" }
    val secondary = posts.filter { it.post_type != "main" }
    if (primary.isEmpty() || secondary.isEmpty()) {
        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            maxItemsInEachRow = 2,
        ) {
            posts.forEach { post ->
                PromotionPostCard(
                    post = post,
                    onClick = { onPostClick(post) },
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                )
            }
        }
    } else {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                primary.forEach { post ->
                    PromotionPostCard(post = post, onClick = { onPostClick(post) })
                }
            }
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                secondary.forEach { post ->
                    PromotionPostCard(post = post, onClick = { onPostClick(post) })
                }
            }
        }
    }
}

@Composable
private fun PromotionVoucherCard(voucher: Promotion, onToggle: () -> Unit) {
    Box(
        modifier = Modifier
            .width(226.dp)
            .height(142.dp)
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(PremiumDesign.CardRadius))
            .border(1.dp, PremiumColors.Border.copy(alpha = 0.5f), RoundedCornerShape(PremiumDesign.CardRadius))
            .padding(14.dp),
    ) {
        Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                Icon(Icons.Filled.LocalOffer, contentDescription = null, tint = PremiumColors.Accent, modifier = Modifier.size(16.dp))
                Text(voucher.code, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = PremiumColors.Accent, maxLines = 1)
            }
            Text(voucher.title, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface, maxLines = 2)
            voucher.description?.takeIf { it.isNotBlank() }?.let {
                Text(it, fontSize = 12.sp, color = PremiumColors.Muted, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Text(
                promotionApplicabilityText(voucher),
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = PremiumColors.Muted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.weight(1f))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    promotionDiscountText(voucher),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    modifier = Modifier
                        .background(PremiumColors.Accent, RoundedCornerShape(999.dp))
                        .padding(horizontal = 9.dp, vertical = 4.dp),
                )
                Spacer(Modifier.weight(1f))
                Icon(
                    imageVector = if (voucher.is_saved == true) Icons.Filled.Bookmark else Icons.Filled.BookmarkBorder,
                    contentDescription = null,
                    tint = PremiumColors.Accent,
                    modifier = Modifier
                        .size(28.dp)
                        .clickable(onClick = onToggle)
                        .padding(4.dp),
                )
            }
        }
    }
}

@Composable
private fun PromotionPostCard(post: PromotionPost, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val ratio = if (post.post_type == "main") 3f / 4f else 1f
    Box(
        modifier
            .fillMaxWidth()
            .aspectRatio(ratio)
            .clip(RoundedCornerShape(18.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.BottomStart,
    ) {
        AsyncImage(
            model = post.cover_image_url,
            contentDescription = post.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )
        Box(
            Modifier
                .matchParentSize()
                .background(Color.Black.copy(alpha = 0.34f)),
        )
        Column(
            Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            if (post.voucher != null) {
                Text(
                    "Có voucher",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    modifier = Modifier
                        .background(PremiumColors.Accent, RoundedCornerShape(999.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                )
            }
            Text(post.title, fontSize = if (post.post_type == "main") 22.sp else 18.sp, fontWeight = FontWeight.Bold, color = Color.White, maxLines = 2)
            post.subtitle?.takeIf { it.isNotBlank() }?.let {
                Text(it, fontSize = 13.sp, color = Color.White.copy(alpha = 0.88f), maxLines = 2)
            }
        }
    }
}

@Composable
private fun PromotionPostDialog(
    post: PromotionPost,
    onDismiss: () -> Unit,
    onSaveVoucher: (Promotion) -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            post.voucher?.let { voucher ->
                Button(onClick = { onSaveVoucher(voucher) }, colors = ButtonDefaults.buttonColors(containerColor = PremiumColors.Accent)) {
                    Text(if (voucher.is_saved == true) "Đã lưu" else "Lưu voucher")
                }
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Đóng") } },
        title = { Text(post.title, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                AsyncImage(
                    model = post.cover_image_url,
                    contentDescription = post.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(if (post.post_type == "main") 3f / 4f else 1f)
                        .clip(RoundedCornerShape(14.dp)),
                )
                post.subtitle?.takeIf { it.isNotBlank() }?.let { Text(it, fontWeight = FontWeight.SemiBold) }
                post.body?.takeIf { it.isNotBlank() }?.let { Text(it) }
                post.voucher?.let { voucher ->
                    Text("${voucher.code} · ${promotionDiscountText(voucher)}", fontWeight = FontWeight.Bold, color = PremiumColors.Accent)
                }
            }
        },
    )
}

private fun promotionDiscountText(voucher: Promotion): String {
    voucher.discount_percent?.takeIf { it > 0 }?.let { return "Giảm ${it.toInt()}%" }
    voucher.discount_amount?.takeIf { it > 0 }?.let { return "Giảm ${FormatUtils.formatVnd(it)}" }
    return "Ưu đãi"
}

private fun promotionApplicabilityText(voucher: Promotion): String =
    when (voucher.applicability ?: "hotel_places") {
        "user_subscription" -> "Dùng cho subscription"
        "pro_plan" -> when (voucher.billing_cycle ?: "both") {
            "monthly" -> "Pro theo tháng"
            "yearly" -> "Pro theo năm"
            else -> "Pro tháng/năm"
        }
        else -> "Khách sạn/địa điểm"
    }

@Composable
private fun ProfileSettingsRow(label: String, icon: ImageVector, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .premiumPressScale(onClick = onClick)
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = PremiumColors.Accent,
            modifier = Modifier.size(18.dp),
        )
        Text(
            label,
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.weight(1f),
        )
        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            tint = PremiumColors.TextMuted,
            modifier = Modifier.size(16.dp),
        )
    }
}

@Composable
private fun SettingsDivider() {
    Box(
        Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(PremiumColors.Divider),
    )
}

@Composable
fun TripsListScreen(
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(0.dp),
    trips: List<TripRecord>,
    error: String?,
    isRefreshing: Boolean = false,
    onRefresh: (() -> Unit)? = null,
    onOpenTrip: (String) -> Unit,
    onCreateTrip: () -> Unit,
) {
    val activeTrips = trips.filter { getTripPhase(it.start_date, it.end_date) != TripPhase.COMPLETED }
    val pastTrips = trips.filter { getTripPhase(it.start_date, it.end_date) == TripPhase.COMPLETED }
    var segmentIndex by remember { mutableStateOf(0) }
    var promotionHome by remember { mutableStateOf<PromotionHomePayload?>(null) }
    var selectedPromotionPost by remember { mutableStateOf<PromotionPost?>(null) }
    val scope = rememberCoroutineScope()

    suspend fun loadPromotions() {
        promotionHome = runCatching { ApiClient.promotionHome() }.getOrNull()
    }

    LaunchedEffect(Unit) {
        loadPromotions()
    }

    val segmentTrips = when (segmentIndex) {
        0 -> activeTrips
        else -> pastTrips
    }

    val content: @Composable () -> Unit = {
            Column(Modifier.fillMaxSize()) {
                FixedTabHeader(
                    title = "Chuyến đi",
                    description = "Quản lý mọi hành trình của bạn.",
                    contentPadding = contentPadding,
                )
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = PremiumDesign.ScreenPadding, vertical = 12.dp),
                    contentPadding = PaddingValues(bottom = contentPadding.calculateBottomPadding()),
                    verticalArrangement = Arrangement.spacedBy(PremiumDesign.SectionGap),
                ) {
                    item { TripPlannerPromoCard(onCreateTrip) }
                    error?.let { item { ErrorText(it) } }
                    item {
                        TripSegmentControl(
                            segments = listOf("Sắp tới", "Đã qua"),
                            selectedIndex = segmentIndex,
                            onSelect = { segmentIndex = it },
                        )
                    }
                    if (segmentTrips.isEmpty()) {
                        item {
                            if (segmentIndex == 1) {
                                PastTripsEmptyState()
                            } else {
                                Column(
                                    Modifier.fillMaxWidth().padding(vertical = 32.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                ) {
                                    Text("Chưa có chuyến đi", fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                                    Text(
                                        "Tạo hành trình mới với AI.",
                                        color = PremiumColors.TextMuted,
                                        fontSize = 14.sp,
                                        modifier = Modifier.padding(top = 8.dp),
                                    )
                                    Spacer(Modifier.height(16.dp))
                                    PremiumAccentButton("✦ Tạo chuyến AI", onCreateTrip, modifier = Modifier.fillMaxWidth(0.7f))
                                }
                            }
                        }
                    } else {
                        items(segmentTrips.size, key = { segmentTrips[it].id }) { index ->
                            val trip = segmentTrips[index]
                            val dupes = segmentTrips.filter { it.destination == trip.destination && it.start_date == trip.start_date }
                            val bookingLabel = if (dupes.size > 1) {
                                "Booking #${dupes.indexOf(trip) + 1}"
                            } else null
                            TallTripListCard(
                                trip = trip,
                                index = index,
                                onClick = { onOpenTrip(trip.id) },
                                bookingLabel = bookingLabel,
                            )
                        }
                    }
                    item {
                        PromotionHomeSection(
                            payload = promotionHome,
                            onPostClick = { selectedPromotionPost = it },
                            onToggleVoucher = { voucher ->
                                scope.launch {
                                    if (voucher.is_saved == true) {
                                        runCatching { ApiClient.unsavePromotionVoucher(voucher.id) }
                                    } else {
                                        runCatching { ApiClient.savePromotionVoucher(voucher.id) }
                                    }
                                    loadPromotions()
                                }
                            },
                        )
                    }
                    item { Spacer(Modifier.height(8.dp)) }
                }
            }
    }

    if (onRefresh != null) {
        PremiumPullRefreshBox(
            refreshing = isRefreshing,
            onRefresh = onRefresh,
            modifier = modifier,
        ) { content() }
    } else {
        Box(modifier) { content() }
    }

    selectedPromotionPost?.let { post ->
        PromotionPostDialog(
            post = post,
            onDismiss = { selectedPromotionPost = null },
            onSaveVoucher = { voucher ->
                scope.launch {
                    runCatching { ApiClient.savePromotionVoucher(voucher.id) }
                    loadPromotions()
                    selectedPromotionPost = selectedPromotionPost?.copy(voucher = voucher.copy(is_saved = true))
                }
            },
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FavoritesScreen(
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(0.dp),
    trips: List<TripRecord>,
    onOpenTrip: (String) -> Unit,
    onCreateTrip: () -> Unit,
) {
    val favIds by WanderTaleApp.instance.preferencesStore.favoriteTripIds.collectAsState(initial = emptySet())
    var selectedId by remember { mutableStateOf<String?>(null) }
    val favoriteTrips = trips.filter { it.id in favIds }

    LaunchedEffect(favoriteTrips.map { it.id }) {
        if (selectedId !in favoriteTrips.map { it.id }) selectedId = favoriteTrips.firstOrNull()?.id
    }

    val visibleTrips = selectedId?.let { id -> favoriteTrips.filter { it.id == id } } ?: favoriteTrips

    Column(modifier.fillMaxSize()) {
        FixedTabHeader(
            title = "Yêu thích",
            description = "Chuyến đi bạn đã đánh dấu yêu thích trên thiết bị này.",
            contentPadding = contentPadding,
        )
        if (favoriteTrips.isEmpty()) {
            Box(Modifier.weight(1f).fillMaxWidth()) {
                DotPatternBackground(Modifier.matchParentSize())
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = PremiumDesign.ScreenPadding)
                        .padding(bottom = contentPadding.calculateBottomPadding()),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    FavoritesEmptyState(onCreateTrip)
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = PremiumDesign.ScreenPadding, vertical = 12.dp),
                contentPadding = PaddingValues(bottom = contentPadding.calculateBottomPadding()),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                item {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        favoriteTrips.forEach { trip ->
                            FavoriteChip(
                                label = trip.destination,
                                selected = trip.id == (selectedId ?: favoriteTrips.first().id),
                                onClick = { selectedId = trip.id },
                            )
                        }
                    }
                }
                items(visibleTrips.size, key = { visibleTrips[it].id }) { index ->
                    val trip = visibleTrips[index]
                    TallTripListCard(
                        trip = trip,
                        index = index,
                        onClick = { onOpenTrip(trip.id) },
                        showFavoriteHeart = true,
                    )
                }
                item { Spacer(Modifier.height(8.dp)) }
            }
        }
    }
}

@Composable
private fun FixedTabHeader(
    title: String,
    description: String,
    contentPadding: PaddingValues,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = PremiumDesign.ScreenPadding)
            .padding(
                top = contentPadding.calculateTopPadding() + 12.dp,
                bottom = 12.dp,
            ),
    ) {
        DashboardPageHeader(title = title, description = description)
    }
}

@Composable
fun ProfileScreen(
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(0.dp),
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
    onDisplayNameUpdated: (String) -> Unit = {},
) {
    var profile by remember { mutableStateOf(DashboardHomeCache.accountInfo?.profile) }
    var name by remember { mutableStateOf(DashboardHomeCache.accountInfo?.displayName.orEmpty()) }
    var email by remember { mutableStateOf(DashboardHomeCache.accountInfo?.email.orEmpty()) }
    var phone by remember { mutableStateOf(DashboardHomeCache.accountInfo?.phone.orEmpty()) }
    var saved by remember { mutableStateOf(false) }
    var saveError by remember { mutableStateOf<String?>(null) }
    var showUpgrade by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        DashboardHomeCache.accountInfo?.let { info ->
            profile = info.profile
            name = info.displayName
            email = info.email
            phone = info.phone
        } ?: runCatching {
            WanderTaleApp.instance.profileRepository.getAccountInfo()
        }.onSuccess { info ->
            DashboardHomeCache.accountInfo = info
            profile = info.profile
            name = info.displayName
            email = info.email
            phone = info.phone
            if (info.displayName.isNotBlank()) {
                DashboardHomeCache.displayName = info.displayName
            }
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = PremiumDesign.ScreenPadding)
            .padding(contentPadding),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        ProfileCompactHeader(name = name.ifBlank { "Khách du lịch" }, onUpgrade = { showUpgrade = true })

        PremiumSurfaceCard {
            Column(
                Modifier.padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                ProfileReadOnlyField("Tên hiển thị", name)
                ProfileReadOnlyField("Email", email)
                ProfilePhoneField(phone) { phone = it }
                PremiumAccentButton(
                    text = "Lưu thay đổi",
                    onClick = {
                        scope.launch {
                            saveError = null
                            saved = false
                            runCatching {
                                WanderTaleApp.instance.profileRepository.updatePhone(phone.ifBlank { null })
                                DashboardHomeCache.updateAccountPhone(phone.trim())
                                saved = true
                            }.onFailure {
                                saveError = "Không thể lưu số điện thoại. Vui lòng thử lại."
                            }
                        }
                    },
                    height = 40.dp,
                )
                if (saved) {
                    Text("Đã lưu.", color = PremiumColors.StatDestIcon, fontSize = 12.sp)
                }
                saveError?.let {
                    Text(it, color = PremiumColors.LogoutRed, fontSize = 12.sp)
                }
            }
        }

        PremiumSurfaceCard {
            Column(Modifier.padding(horizontal = 12.dp, vertical = 4.dp)) {
                ProfileSettingsRow("Cài đặt", Icons.Filled.Settings) { onNavigate("settings") }
                SettingsDivider()
                ProfileSettingsRow("Đặt chỗ & thanh toán", Icons.Filled.ShoppingCart) { onNavigate("booking") }
                SettingsDivider()
                ProfileSettingsRow("Thông báo", Icons.Filled.Notifications) { }
                SettingsDivider()
                ProfileSettingsRow("Trợ giúp & FAQ", Icons.Filled.Help) { }
                SettingsDivider()
                ProfileSettingsRow("Điều khoản sử dụng", Icons.Filled.Description) { }
                if (profile?.is_business == true) {
                    SettingsDivider()
                    ProfileSettingsRow("Doanh nghiệp", Icons.Filled.Apartment) { onNavigate("business") }
                }
                if (profile?.is_admin == true) {
                    SettingsDivider()
                    ProfileSettingsRow("Admin", Icons.Filled.Star) { onNavigate("admin") }
                }
            }
        }

        TextButton(
            onClick = {
                scope.launch {
                    DashboardHomeCache.clear()
                    WanderTaleApp.instance.authRepository.signOut()
                    onLogout()
                }
            },
            modifier = Modifier.padding(top = 2.dp),
        ) {
            Text("Đăng xuất", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = PremiumColors.LogoutRed)
        }

        Spacer(Modifier.weight(1f))
    }

    if (showUpgrade) {
        UserUpgradeDialog(
            onDismiss = { showUpgrade = false },
            onPurchased = {
                scope.launch {
                    runCatching { WanderTaleApp.instance.profileRepository.getAccountInfo() }
                        .onSuccess { info ->
                            DashboardHomeCache.accountInfo = info
                            profile = info.profile
                            name = info.displayName
                            email = info.email
                            phone = info.phone
                        }
                }
            },
        )
    }
}

@Composable
private fun ProfileCompactHeader(name: String, onUpgrade: () -> Unit) {
    Row(
        Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        ProfileAvatarCompact(name)
        Text(
            text = name,
            fontSize = 17.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        Image(
            painter = painterResource(id = R.drawable.up),
            contentDescription = "Nâng cấp Pro",
            modifier = Modifier
                .size(62.dp)
                .clickable(onClick = onUpgrade)
                .padding(2.dp),
        )
    }
}

@Composable
private fun ProfileAvatarCompact(name: String) {
    val initial = remember(name) {
        name.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "?"
    }
    Box(
        Modifier
            .size(52.dp)
            .clip(CircleShape)
            .background(PremiumColors.AccentLight),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = initial,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = PremiumColors.Accent,
        )
    }
}

@Composable
private fun ProfileReadOnlyField(label: String, value: String) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            label,
            color = PremiumColors.TextMuted,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            text = value,
            fontSize = 14.sp,
            color = PremiumColors.Ink,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .background(PremiumColors.InputBg)
                .padding(horizontal = 12.dp, vertical = 10.dp),
        )
    }
}

@Composable
private fun ProfilePhoneField(value: String, onChange: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            "Số điện thoại",
            color = PremiumColors.TextMuted,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
        )
        BasicTextField(
            value = value,
            onValueChange = onChange,
            singleLine = true,
            textStyle = TextStyle(fontSize = 14.sp, color = PremiumColors.Ink),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .background(PremiumColors.InputBg)
                .padding(horizontal = 12.dp, vertical = 10.dp),
        )
    }
}

@Composable
private fun UserUpgradeDialog(onDismiss: () -> Unit, onPurchased: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var overview by remember { mutableStateOf<UserSubscriptionOverview?>(null) }
    var selectedPackageId by remember { mutableStateOf("pro_monthly") }
    var selectedVoucherId by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    var paying by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }

    suspend fun load() {
        loading = true
        runCatching { ApiClient.userSubscription() }
            .onSuccess {
                overview = it
                selectedPackageId = it.packages.firstOrNull()?.id ?: "pro_monthly"
            }
            .onFailure { message = "Không tải được gói Pro." }
        loading = false
    }

    LaunchedEffect(Unit) { load() }

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {},
        dismissButton = {},
        title = {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Image(painter = painterResource(id = R.drawable.up), contentDescription = null, modifier = Modifier.size(34.dp))
                Text("WanderTale Pro", fontWeight = FontWeight.Bold)
            }
        },
        text = {
            if (loading) {
                Box(Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) { OrangeLoadingSpinner() }
            } else {
                val data = overview
                LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.height(430.dp)) {
                    if (data != null) {
                        item {
                            PremiumSurfaceCard {
                                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text(if (data.is_premium) "Bạn đang dùng Pro" else "Bạn đang dùng Free", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                                    val limit = data.monthly_trip_limit ?: 5
                                    val remaining = (limit - data.monthly_trip_count).coerceAtLeast(0)
                                    Text(
                                        if (data.is_premium) "Tạo chuyến đi AI không giới hạn."
                                        else "Free còn $remaining/$limit chuyến trong tháng này.",
                                        color = PremiumColors.Muted,
                                        fontSize = 13.sp,
                                    )
                                    data.subscription_expires_at?.let { Text("Hết hạn: ${it.take(10)}", color = PremiumColors.Accent, fontSize = 13.sp, fontWeight = FontWeight.Bold) }
                                }
                            }
                        }
                        item { Text("Chọn gói", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface) }
                        items(data.packages, key = { it.id }) { pkg ->
                            Column(
                                Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(MaterialTheme.colorScheme.surface)
                                    .border(1.dp, if (selectedPackageId == pkg.id) PremiumColors.Accent else PremiumColors.Border.copy(alpha = 0.5f), RoundedCornerShape(14.dp))
                                    .clickable { selectedPackageId = pkg.id }
                                    .padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Text(pkg.name, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                                Text("${FormatUtils.formatVnd(pkg.price_vnd)} · ${if (pkg.billing_cycle == "yearly") "theo năm" else "theo tháng"}", color = PremiumColors.Muted, fontSize = 13.sp)
                            }
                        }
                        item {
                            Text("Voucher của bạn", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                                FilterChip(selected = selectedVoucherId.isBlank(), onClick = { selectedVoucherId = "" }, label = { Text("Không áp dụng") })
                                data.vouchers.forEach { voucher ->
                                    FilterChip(
                                        selected = selectedVoucherId == voucher.id,
                                        onClick = { selectedVoucherId = voucher.id },
                                        label = { Text("${voucher.code} · ${promotionDiscountText(voucher)}") },
                                    )
                                }
                            }
                        }
                        val selectedPackage = data.packages.firstOrNull { it.id == selectedPackageId } ?: data.packages.firstOrNull()
                        item {
                            Text("Quyền lợi", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                            Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                selectedPackage?.benefits.orEmpty().forEach { benefit ->
                                    Text("✓ $benefit", color = MaterialTheme.colorScheme.onSurface, fontSize = 13.sp)
                                }
                            }
                        }
                        item {
                            Button(
                                onClick = {
                                    scope.launch {
                                        paying = true
                                        message = null
                                        runCatching {
                                            ApiClient.purchaseUserSubscription(selectedPackageId, selectedVoucherId.ifBlank { null })
                                        }.onSuccess { result ->
                                            result.checkout_url?.let { url ->
                                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                                                message = "Đã mở cổng thanh toán."
                                            } ?: run {
                                                message = "Đã nâng cấp Pro."
                                                onPurchased()
                                                load()
                                            }
                                        }.onFailure {
                                            message = "Không tạo được thanh toán."
                                        }
                                        paying = false
                                    }
                                },
                                enabled = !paying,
                                colors = ButtonDefaults.buttonColors(containerColor = PremiumColors.Accent),
                                modifier = Modifier.fillMaxWidth(),
                            ) { Text(if (paying) "Đang tạo thanh toán..." else "Thanh toán / nâng cấp") }
                        }
                    }
                    message?.let { item { Text(it, color = PremiumColors.Accent, fontWeight = FontWeight.Bold, fontSize = 13.sp) } }
                }
            }
        },
    )
}

@Composable
fun SettingsScreen(onBack: () -> Unit) {
    val dark by WanderTaleApp.instance.preferencesStore.darkMode.collectAsState(initial = false)
    val scope = rememberCoroutineScope()

    com.wandertale.mobile.ui.components.AppScaffold(title = "Cài đặt", onBack = onBack) { padding ->
        Column(padding.padding(PremiumDesign.ScreenPadding)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Giao diện tối")
                androidx.compose.material3.Switch(checked = dark, onCheckedChange = { scope.launch { WanderTaleApp.instance.preferencesStore.setDarkMode(it) } })
            }
            Spacer(Modifier.height(16.dp))
            Text("Thông báo chuyến đi — sắp ra mắt", style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
fun AdminScreen(onBack: () -> Unit) {
    var isAdmin by remember { mutableStateOf<Boolean?>(null) }
    var partners by remember { mutableStateOf<List<com.wandertale.mobile.data.model.PartnerRow>>(emptyList()) }
    var vouchers by remember { mutableStateOf<List<com.wandertale.mobile.data.model.VoucherRow>>(emptyList()) }

    LaunchedEffect(Unit) {
        val admin = WanderTaleApp.instance.adminRepository.isAdmin()
        isAdmin = admin
        if (admin) {
            partners = WanderTaleApp.instance.adminRepository.listPartners()
            vouchers = WanderTaleApp.instance.adminRepository.listVouchersAdmin()
        }
    }

    com.wandertale.mobile.ui.components.AppScaffold(title = "Admin", onBack = onBack) { padding ->
        when (isAdmin) {
            null -> Box(padding.fillMaxSize(), contentAlignment = Alignment.Center) { OrangeLoadingSpinner() }
            false -> Text("Không có quyền admin.", padding.padding(PremiumDesign.ScreenPadding))
            true -> LazyColumn(padding.padding(PremiumDesign.ScreenPadding), verticalArrangement = Arrangement.spacedBy(PremiumDesign.SectionGap)) {
                item { Text("Đối tác", style = MaterialTheme.typography.titleMedium) }
                items(partners, key = { it.id }) { InfoCard(it.name, it.website) }
                item { Text("Voucher", style = MaterialTheme.typography.titleMedium) }
                items(vouchers, key = { it.id }) { InfoCard(it.code, "${it.title} · ${it.valid_from} → ${it.valid_until}") }
            }
        }
    }
}
