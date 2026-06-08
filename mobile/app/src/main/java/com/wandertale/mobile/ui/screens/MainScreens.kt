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
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.ui.graphics.Brush
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
import androidx.compose.foundation.Canvas
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
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
import android.graphics.Bitmap
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.wandertale.mobile.data.model.UserSubscriptionOverview
import com.wandertale.mobile.data.model.UserSubscriptionPurchaseResponse
import androidx.compose.ui.graphics.asImageBitmap
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
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
    PremiumColors.darkModeEnabled = false
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
    val isPremium = DashboardHomeCache.accountInfo?.profile?.is_premium == true
        || DashboardHomeCache.accountInfo?.profile?.subscription_tier.equals("pro", ignoreCase = true)

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
                    PromotionVoucherCard(
                        voucher = voucher,
                        carousel = true,
                        onToggle = { onToggleVoucher(voucher) },
                    )
                }
            }
        }
        if (posts.isNotEmpty()) {
            PromotionPostMasonry(posts = posts, onPostClick = onPostClick)
        }
        if (vouchers.isEmpty() && posts.isEmpty() && isPremium) {
            Text(
                "Chưa có ưu đãi mới. Quay lại sau nhé!",
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = PremiumColors.TextMuted,
            )
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
private fun PromotionVoucherCard(voucher: Promotion, carousel: Boolean = false, onToggle: () -> Unit) {
    val accent = PremiumColors.Accent
    val cardWidth = if (carousel) 300.dp else Dp.Unspecified

    Box(
        modifier = Modifier
            .then(if (carousel) Modifier.width(cardWidth) else Modifier.fillMaxWidth())
            .shadow(4.dp, RoundedCornerShape(14.dp))
            .clip(VoucherTicketShape())
            .background(Color.White)
            .border(1.dp, Color.Black.copy(alpha = 0.06f), VoucherTicketShape()),
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(46.dp)
                    .background(accent, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = voucherIcon(voucher),
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(22.dp),
                )
            }
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Row(verticalAlignment = Alignment.Top) {
                    Text(
                        voucherHeadline(voucher),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = PremiumColors.Ink,
                        modifier = Modifier.weight(1f),
                    )
                    Icon(
                        imageVector = if (voucher.is_saved == true) Icons.Filled.Bookmark else Icons.Filled.BookmarkBorder,
                        contentDescription = null,
                        tint = PremiumColors.TextMuted,
                        modifier = Modifier
                            .size(24.dp)
                            .clickable(onClick = onToggle)
                            .padding(2.dp),
                    )
                }
                Text(
                    voucherDetailText(voucher),
                    fontSize = 12.sp,
                    color = PremiumColors.Muted,
                    lineHeight = 17.sp,
                )
                Canvas(Modifier.fillMaxWidth().height(1.dp)) {
                    drawLine(
                        color = Color(0xFFE8884A),
                        start = Offset(0f, 0f),
                        end = Offset(size.width, 0f),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(8f, 8f), 0f),
                        strokeWidth = 2f,
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(voucher.code, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = accent)
                    Text(" · ", fontSize = 11.sp, color = PremiumColors.TextMuted)
                    Text(
                        promotionApplicabilityText(voucher),
                        fontSize = 11.sp,
                        color = PremiumColors.TextMuted,
                        modifier = Modifier.weight(1f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        promotionDiscountText(voucher),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = accent,
                    )
                }
            }
        }
    }
}

@Composable
fun SavedOffersScreen(onBack: () -> Unit) {
    var vouchers by remember { mutableStateOf<List<Promotion>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    suspend fun load() {
        loading = true
        runCatching { ApiClient.savedPromotionVouchers() }
            .onSuccess {
                vouchers = it
                message = null
            }
            .onFailure { message = it.message ?: "Không tải được ưu đãi đã lưu" }
        loading = false
    }

    LaunchedEffect(Unit) { load() }

    AppScaffold(title = "Ưu đãi", onBack = onBack) { padding ->
        when {
            loading -> Box(
                Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center,
            ) { OrangeLoadingSpinner() }
            vouchers.isEmpty() -> Column(
                Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(PremiumDesign.ScreenPadding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Spacer(Modifier.height(48.dp))
                Icon(Icons.Filled.LocalOffer, contentDescription = null, tint = PremiumColors.Accent.copy(alpha = 0.75f), modifier = Modifier.size(40.dp))
                Text("Chưa lưu voucher nào", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = PremiumColors.Ink)
                Text(
                    "Khám phá ưu đãi trên Trang chủ và nhấn lưu để dùng khi đặt chỗ hoặc nâng cấp Pro.",
                    fontSize = 14.sp,
                    color = PremiumColors.Muted,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }
            else -> LazyColumn(
                Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(PremiumDesign.ScreenPadding),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(vouchers, key = { it.id }) { voucher ->
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (promotionIsExpired(voucher)) {
                            Text(
                                "Đã hết hạn",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = PremiumColors.LogoutRed,
                                modifier = Modifier
                                    .background(PremiumColors.LogoutRed.copy(alpha = 0.08f), RoundedCornerShape(999.dp))
                                    .padding(horizontal = 8.dp, vertical = 4.dp),
                            )
                        }
                        PromotionVoucherCard(voucher = voucher, onToggle = {
                            scope.launch {
                                if (voucher.is_saved == true) {
                                    runCatching { ApiClient.unsavePromotionVoucher(voucher.id) }
                                } else {
                                    runCatching { ApiClient.savePromotionVoucher(voucher.id) }
                                }
                                load()
                            }
                        })
                    }
                }
                message?.let { item { Text(it, color = PremiumColors.Accent, fontWeight = FontWeight.Bold, fontSize = 13.sp) } }
            }
        }
    }
}

private fun promotionIsExpired(voucher: Promotion): Boolean {
    val until = voucher.valid_until?.trim().orEmpty()
    if (until.isEmpty()) return false
    val today = java.time.LocalDate.now().toString()
    return until < today
}

private class VoucherTicketShape : Shape {
    override fun createOutline(size: Size, layoutDirection: LayoutDirection, density: Density): Outline {
        val corner = with(density) { 14.dp.toPx() }
        val notch = with(density) { 9.dp.toPx() }
        val path = Path().apply {
            val w = size.width
            val h = size.height
            val midY = h / 2f
            moveTo(corner, 0f)
            lineTo(w - corner, 0f)
            quadraticTo(w, 0f, w, corner)
            lineTo(w, midY - notch)
            arcTo(
                rect = androidx.compose.ui.geometry.Rect(w - notch * 2f, midY - notch, w, midY + notch),
                startAngleDegrees = -90f,
                sweepAngleDegrees = 180f,
                forceMoveTo = false,
            )
            lineTo(w, h - corner)
            quadraticTo(w, h, w - corner, h)
            lineTo(corner, h)
            quadraticTo(0f, h, 0f, h - corner)
            lineTo(0f, corner)
            quadraticTo(0f, 0f, corner, 0f)
            close()
        }
        return Outline.Generic(path)
    }
}

private fun voucherIcon(voucher: Promotion): ImageVector {
    return when (voucher.applicability ?: "hotel_places") {
        "user_subscription", "pro_plan" -> Icons.Filled.Star
        else -> Icons.Filled.Apartment
    }
}

private fun voucherHeadline(voucher: Promotion): String {
    val pct = voucher.discount_percent ?: 0.0
    val amt = voucher.discount_amount ?: 0.0
    return when {
        pct > 0 -> "Giảm ${pct.toInt()}% · ${voucher.title}"
        amt > 0 -> "Giảm đến ${FormatUtils.formatVnd(amt)} · ${voucher.title}"
        else -> voucher.title
    }
}

private fun voucherDetailText(voucher: Promotion): String {
    val desc = voucher.description?.trim().orEmpty()
    if (desc.isNotEmpty()) return desc
    return "Mã ${voucher.code} · ${promotionApplicabilityText(voucher)}"
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
    var isProMember by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    suspend fun refreshProStatus() {
        runCatching { WanderTaleApp.instance.profileRepository.getAccountInfo() }
            .onSuccess { info ->
                DashboardHomeCache.accountInfo = info
                profile = info.profile
                name = info.displayName
                email = info.email
                phone = info.phone
                if (info.displayName.isNotBlank()) {
                    DashboardHomeCache.displayName = info.displayName
                }
            }
        runCatching { ApiClient.userSubscription() }
            .onSuccess { isProMember = it.is_premium }
    }

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
        refreshProStatus()
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = PremiumDesign.ScreenPadding)
            .padding(contentPadding),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        ProfileCompactHeader(
            name = name.ifBlank { "Khách du lịch" },
            isPremium = profile?.is_premium == true
                || profile?.subscription_tier.equals("pro", ignoreCase = true)
                || isProMember,
            onUpgrade = { showUpgrade = true },
        )

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
                ProfileSettingsRow("Ưu đãi", Icons.Filled.LocalOffer) { onNavigate("saved_offers") }
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
                scope.launch { refreshProStatus() }
            },
        )
    }
}

@Composable
private fun ProfileCompactHeader(name: String, isPremium: Boolean, onUpgrade: () -> Unit) {
    Row(
        Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        ProfileAvatarCompact(name)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.weight(1f),
        ) {
            Text(
                text = name,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (isPremium) {
                ProMemberBadge()
            }
        }
        if (!isPremium) {
            Image(
                painter = painterResource(id = R.drawable.up),
                contentDescription = "Nâng cấp Pro",
                modifier = Modifier
                    .width(128.dp)
                    .height(58.dp)
                    .clickable(onClick = onUpgrade),
                contentScale = ContentScale.Fit,
            )
        }
    }
}

@Composable
private fun ProMemberBadge() {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(
                Brush.linearGradient(
                    listOf(Color(0xFF7D52EB), Color(0xFF9461FA)),
                ),
            )
            .border(0.8.dp, Color.White.copy(alpha = 0.28f), RoundedCornerShape(50))
            .padding(horizontal = 9.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text("👑", fontSize = 10.sp)
        Text(
            "PRO",
            color = Color.White,
            fontSize = 11.sp,
            fontWeight = FontWeight.ExtraBold,
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
    val scope = rememberCoroutineScope()
    var overview by remember { mutableStateOf<UserSubscriptionOverview?>(null) }
    var selectedPackageId by remember { mutableStateOf("pro_monthly") }
    var selectedVoucherId by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    var paying by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var payInfo by remember { mutableStateOf<UserSubscriptionPurchaseResponse?>(null) }
    var proActivated by remember { mutableStateOf(false) }

    suspend fun load() {
        loading = true
        runCatching { ApiClient.userSubscription() }
            .onSuccess {
                overview = it
                selectedPackageId = it.packages.firstOrNull()?.id ?: "pro_monthly"
                message = null
            }
            .onFailure { message = it.message ?: "Không tải được gói Pro." }
        loading = false
    }

    LaunchedEffect(Unit) { load() }
    LaunchedEffect(selectedPackageId) { selectedVoucherId = "" }

    LaunchedEffect(payInfo) {
        val info = payInfo ?: return@LaunchedEffect
        var n = 0
        while (isActive && n < 150 && !proActivated) {
            delay(4000)
            runCatching { ApiClient.userSubscription() }
                .onSuccess { if (it.is_premium) proActivated = true }
            n++
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("Đóng") }
        },
        dismissButton = {},
        title = {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Image(painter = painterResource(id = R.drawable.up), contentDescription = null, modifier = Modifier.size(38.dp))
                Text("WanderTale Pro", fontWeight = FontWeight.Bold)
            }
        },
        text = {
            when {
                loading -> Box(Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) { OrangeLoadingSpinner() }
                payInfo != null -> SubscriptionPaymentContent(
                    info = payInfo!!,
                    activated = proActivated,
                    onDone = {
                        onPurchased()
                        onDismiss()
                    },
                )
                else -> {
                    val data = overview
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.height(460.dp)) {
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
                                Text("Voucher đã lưu", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                                Text(
                                    "Lưu voucher Pro ở mục Khám phá ưu đãi trên Trang chủ trước khi áp dụng.",
                                    color = PremiumColors.TextMuted,
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(top = 4.dp),
                                )
                                val applicable = applicableUpgradeVouchers(data, selectedPackageId)
                                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                                    FilterChip(selected = selectedVoucherId.isBlank(), onClick = { selectedVoucherId = "" }, label = { Text("Không áp dụng") })
                                    applicable.forEach { voucher ->
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
                                val original = selectedPackage?.price_vnd ?: 0.0
                                val voucher = applicableUpgradeVouchers(data, selectedPackageId).firstOrNull { it.id == selectedVoucherId }
                                val discount = upgradeDiscountAmount(voucher, original)
                                val finalAmount = (original - discount).coerceAtLeast(0.0)
                                PremiumSurfaceCard {
                                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text("Tạm tính", fontWeight = FontWeight.Bold)
                                        Row(Modifier.fillMaxWidth()) {
                                            Text("Giá gói", fontSize = 13.sp, color = PremiumColors.Muted, modifier = Modifier.weight(1f))
                                            Text(FormatUtils.formatVnd(original), fontSize = 13.sp)
                                        }
                                        if (discount > 0) {
                                            Row(Modifier.fillMaxWidth()) {
                                                Text("Voucher", fontSize = 13.sp, color = PremiumColors.Muted, modifier = Modifier.weight(1f))
                                                Text("-${FormatUtils.formatVnd(discount)}", fontSize = 13.sp, color = PremiumColors.Accent)
                                            }
                                        }
                                        Row(Modifier.fillMaxWidth()) {
                                            Text("Thanh toán", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                            Text(
                                                if (finalAmount <= 0) "Miễn phí" else FormatUtils.formatVnd(finalAmount),
                                                fontWeight = FontWeight.Bold,
                                                color = PremiumColors.Accent,
                                            )
                                        }
                                    }
                                }
                            }
                            item {
                                Text("Quyền lợi", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                                Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    selectedPackage?.benefits.orEmpty().forEach { benefit ->
                                        Text("✓ $benefit", color = MaterialTheme.colorScheme.onSurface, fontSize = 13.sp)
                                    }
                                }
                            }
                            item {
                                val selectedPackage = data.packages.firstOrNull { it.id == selectedPackageId }
                                val voucher = applicableUpgradeVouchers(data, selectedPackageId).firstOrNull { it.id == selectedVoucherId }
                                val finalAmount = ((selectedPackage?.price_vnd ?: 0.0) - upgradeDiscountAmount(voucher, selectedPackage?.price_vnd ?: 0.0)).coerceAtLeast(0.0)
                                val buttonLabel = when {
                                    paying -> "Đang xử lý..."
                                    data.is_premium -> "Đang dùng Pro"
                                    finalAmount <= 0 -> "Nâng cấp miễn phí"
                                    else -> "Thanh toán / nâng cấp"
                                }
                                Button(
                                    onClick = {
                                        scope.launch {
                                            paying = true
                                            message = null
                                            runCatching {
                                                ApiClient.purchaseUserSubscription(selectedPackageId, selectedVoucherId.ifBlank { null })
                                            }.onSuccess { result ->
                                                when {
                                                    result.payment_status == "paid" -> {
                                                        message = "Đã nâng cấp Pro."
                                                        onPurchased()
                                                        load()
                                                    }
                                                    !result.qr_code.isNullOrBlank() || !result.account_number.isNullOrBlank() -> {
                                                        payInfo = result
                                                    }
                                                    else -> message = "Không tạo được thông tin thanh toán."
                                                }
                                            }.onFailure {
                                                message = it.message ?: "Không tạo được thanh toán."
                                            }
                                            paying = false
                                        }
                                    },
                                    enabled = !paying && !data.is_premium,
                                    colors = ButtonDefaults.buttonColors(containerColor = PremiumColors.Accent),
                                    modifier = Modifier.fillMaxWidth(),
                                ) { Text(buttonLabel) }
                            }
                        }
                        message?.let { item { Text(it, color = PremiumColors.Accent, fontWeight = FontWeight.Bold, fontSize = 13.sp) } }
                    }
                }
            }
        },
    )
}

@Composable
private fun SubscriptionPaymentContent(
    info: UserSubscriptionPurchaseResponse,
    activated: Boolean,
    onDone: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (activated) {
            Text("✅", fontSize = 44.sp)
            Text("Nâng cấp Pro thành công!", fontWeight = FontWeight.Bold)
            Button(onClick = onDone, colors = ButtonDefaults.buttonColors(containerColor = PremiumColors.Accent), modifier = Modifier.fillMaxWidth()) {
                Text("Xong")
            }
        } else {
            Text("Quét QR hoặc chuyển khoản trong app", fontWeight = FontWeight.SemiBold)
            info.qr_code?.let { qr ->
                subscriptionQrBitmap(qr)?.let { bmp ->
                    Image(
                        bmp.asImageBitmap(),
                        contentDescription = "QR thanh toán",
                        modifier = Modifier.size(200.dp).clip(RoundedCornerShape(12.dp)).background(Color.White).padding(8.dp),
                    )
                }
            }
            PremiumSurfaceCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    subscriptionInfoLine("Số tiền", FormatUtils.formatVnd(info.amount))
                    info.original_amount?.takeIf { (info.discount_amount ?: 0.0) > 0 }?.let {
                        subscriptionInfoLine("Giá gốc", FormatUtils.formatVnd(it))
                        subscriptionInfoLine("Giảm giá", "-${FormatUtils.formatVnd(info.discount_amount)}")
                    }
                    info.account_number?.let { subscriptionInfoLine("Số tài khoản", it) }
                    info.account_name?.let { subscriptionInfoLine("Chủ tài khoản", it) }
                    info.transfer_content?.let { subscriptionInfoLine("Nội dung CK", it) }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OrangeLoadingSpinner()
                Text("Đang chờ xác nhận thanh toán…", fontSize = 13.sp, color = PremiumColors.Muted)
            }
        }
    }
}

@Composable
private fun subscriptionInfoLine(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(label, fontSize = 13.sp, color = PremiumColors.TextMuted, modifier = Modifier.weight(1f))
        Text(value, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = PremiumColors.Ink)
    }
}

private fun subscriptionQrBitmap(content: String): Bitmap? = runCatching {
    val size = 600
    val matrix = QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, size, size)
    val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565)
    for (x in 0 until size) for (y in 0 until size) {
        bmp.setPixel(x, y, if (matrix[x, y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
    }
    bmp
}.getOrNull()

private fun applicableUpgradeVouchers(overview: UserSubscriptionOverview, packageId: String): List<Promotion> {
    val cycle = overview.packages.firstOrNull { it.id == packageId }?.billing_cycle
    return overview.vouchers.filter { voucherAppliesToUpgradePackage(it, cycle) }
}

private fun voucherAppliesToUpgradePackage(voucher: Promotion, billingCycle: String?): Boolean {
    return when (voucher.applicability ?: "hotel_places") {
        "user_subscription" -> true
        "pro_plan" -> {
            val cycle = voucher.billing_cycle ?: "both"
            cycle == "both" || cycle == billingCycle
        }
        else -> false
    }
}

private fun upgradeDiscountAmount(voucher: Promotion?, original: Double): Double {
    if (voucher == null) return 0.0
    val byPercent = if ((voucher.discount_percent ?: 0.0) > 0) original * (voucher.discount_percent ?: 0.0) / 100 else 0.0
    val byAmount = voucher.discount_amount ?: 0.0
    return minOf(original, maxOf(byPercent, byAmount))
}

@Composable
fun SettingsScreen(onBack: () -> Unit) {
    var overview by remember { mutableStateOf<UserSubscriptionOverview?>(null) }
    var autoRenew by remember { mutableStateOf(true) }
    var loading by remember { mutableStateOf(true) }
    var saving by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    suspend fun load() {
        loading = true
        runCatching { ApiClient.userSubscription() }
            .onSuccess {
                overview = it
                autoRenew = it.auto_renew
            }
        loading = false
    }

    LaunchedEffect(Unit) { load() }

    com.wandertale.mobile.ui.components.AppScaffold(title = "Cài đặt", onBack = onBack) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .padding(PremiumDesign.ScreenPadding),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            PremiumSurfaceCard {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Gói WanderTale Pro", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    when {
                        loading -> OrangeLoadingSpinner()
                        overview?.is_premium == true -> {
                            Text("Bạn đang dùng Pro.", color = PremiumColors.Muted, fontSize = 14.sp)
                            overview?.subscription_expires_at?.let {
                                Text(
                                    "Hết hạn: ${it.take(10)}",
                                    color = PremiumColors.Accent,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text("Tự động gia hạn", fontSize = 15.sp)
                                androidx.compose.material3.Switch(
                                    checked = autoRenew,
                                    onCheckedChange = { enabled ->
                                        scope.launch {
                                            saving = true
                                            message = null
                                            val previous = autoRenew
                                            autoRenew = enabled
                                            runCatching { ApiClient.updateUserSubscriptionAutoRenew(enabled) }
                                                .onSuccess {
                                                    autoRenew = it.auto_renew
                                                    message = if (enabled) "Đã bật tự động gia hạn." else "Đã tắt tự động gia hạn."
                                                }
                                                .onFailure {
                                                    autoRenew = previous
                                                    message = it.message ?: "Không cập nhật được gia hạn"
                                                }
                                            saving = false
                                        }
                                    },
                                    enabled = !saving,
                                )
                            }
                            Text(
                                "Khi bật, gói sẽ tự gia hạn khi hết hạn. Tắt nếu bạn không muốn gia hạn thêm.",
                                color = PremiumColors.TextMuted,
                                fontSize = 13.sp,
                            )
                        }
                        else -> Text(
                            "Bạn đang dùng gói Free. Nâng cấp Pro tại tab Hồ sơ.",
                            color = PremiumColors.Muted,
                            fontSize = 14.sp,
                        )
                    }
                    message?.let {
                        Text(it, color = PremiumColors.Accent, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
            PremiumSurfaceCard {
                Text("Thông báo chuyến đi — sắp ra mắt", style = MaterialTheme.typography.bodyMedium)
            }
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
