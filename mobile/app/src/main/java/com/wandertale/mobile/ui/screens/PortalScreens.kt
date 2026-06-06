package com.wandertale.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.Image
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.material3.Icon
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.wandertale.mobile.data.DashboardHomeCache
import com.wandertale.mobile.data.api.ApiClient
import androidx.compose.ui.text.style.TextOverflow
import com.wandertale.mobile.data.model.AccountInfo
import com.wandertale.mobile.data.model.AdminBusinessRow
import com.wandertale.mobile.data.model.AdminOverview
import com.wandertale.mobile.data.model.AdminUserCreate
import com.wandertale.mobile.data.model.AdminUserDetail
import com.wandertale.mobile.data.model.AdminUserRow
import com.wandertale.mobile.data.model.AdPackage
import com.wandertale.mobile.data.model.AiConfigRow
import com.wandertale.mobile.data.model.BusinessCampaignCreate
import com.wandertale.mobile.data.model.BusinessCampaignRow
import com.wandertale.mobile.data.model.BusinessLocationCreate
import com.wandertale.mobile.data.model.BusinessLocationRow
import com.wandertale.mobile.data.model.BusinessMediaCreate
import com.wandertale.mobile.data.model.BusinessMediaRow
import com.wandertale.mobile.data.model.BusinessOverview
import com.wandertale.mobile.data.model.BusinessReviewRow
import com.wandertale.mobile.data.model.BusinessVoucherCreate
import com.wandertale.mobile.data.model.BusinessVoucherRow
import com.wandertale.mobile.data.model.PayoutRecord
import com.wandertale.mobile.data.model.PlatformTransaction
import com.wandertale.mobile.data.model.SystemLogRow
import com.wandertale.mobile.data.model.UserRolePatch
import com.wandertale.mobile.ui.components.AppScaffold
import com.wandertale.mobile.ui.components.OrangeLoadingSpinner
import com.wandertale.mobile.ui.components.PremiumAccentButton
import com.wandertale.mobile.ui.components.PremiumSurfaceCard
import com.wandertale.mobile.ui.theme.PremiumColors
import com.wandertale.mobile.ui.theme.PremiumDesign
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonPrimitive
import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private data class PortalPalette(
    val bg: Color,
    val card: Color,
    val stroke: Color,
    val text: Color,
    val muted: Color,
)

private val PortalDarkPalette = PortalPalette(
    bg = Color(0xFF2D2F2B),
    card = Color(0xFF20211F),
    stroke = Color.White.copy(alpha = 0.12f),
    text = Color.White.copy(alpha = 0.94f),
    muted = Color.White.copy(alpha = 0.58f),
)

private val PortalLightPalette = PortalPalette(
    bg = PremiumColors.Bg,
    card = PremiumColors.Surface,
    stroke = PremiumColors.Border,
    text = PremiumColors.Ink,
    muted = PremiumColors.Muted,
)

private val LocalPortalPalette = staticCompositionLocalOf { PortalDarkPalette }

@Composable private fun portalBg() = LocalPortalPalette.current.bg
@Composable private fun portalCard() = LocalPortalPalette.current.card
@Composable private fun portalStroke() = LocalPortalPalette.current.stroke
@Composable private fun portalText() = LocalPortalPalette.current.text
@Composable private fun portalMuted() = LocalPortalPalette.current.muted

private val PortalGreen = Color(0xFF13C59A)
private val PortalPurple = Color(0xFF6653EB)
private val PortalDanger = Color(0xFFFFE8E8)

private fun formatPlatformVnd(value: Double?): String {
    if (value == null) return "—"
    val fmt = NumberFormat.getNumberInstance(Locale("vi", "VN"))
    return "${fmt.format(value)} đ"
}

@Composable
fun BusinessPortalScreen(onBack: (() -> Unit)? = null, onLogout: (() -> Unit)? = null, darkTheme: Boolean = true, onToggleTheme: (() -> Unit)? = null) {
    var tab by remember { mutableIntStateOf(0) }
    var overview by remember { mutableStateOf<BusinessOverview?>(null) }
    var transactions by remember { mutableStateOf<List<PlatformTransaction>>(emptyList()) }
    var packages by remember { mutableStateOf<List<AdPackage>>(emptyList()) }
    var campaigns by remember { mutableStateOf<List<BusinessCampaignRow>>(emptyList()) }
    var vouchers by remember { mutableStateOf<List<BusinessVoucherRow>>(emptyList()) }
    var locations by remember { mutableStateOf<List<BusinessLocationRow>>(emptyList()) }
    var reviews by remember { mutableStateOf<List<BusinessReviewRow>>(emptyList()) }
    var payouts by remember { mutableStateOf<List<com.wandertale.mobile.data.model.PayoutRecord>>(emptyList()) }
    var media by remember { mutableStateOf<List<com.wandertale.mobile.data.model.BusinessMediaRow>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var purchaseMessage by remember { mutableStateOf<String?>(null) }
    var adPayInfo by remember { mutableStateOf<com.wandertale.mobile.data.model.AdPurchaseResponse?>(null) }
    var showCampaignForm by remember { mutableStateOf(false) }
    var showVoucherForm by remember { mutableStateOf(false) }
    var showLocationForm by remember { mutableStateOf(false) }
    var showMediaForm by remember { mutableStateOf(false) }
    var replyTarget by remember { mutableStateOf<BusinessReviewRow?>(null) }
    var showBusinessMenu by remember { mutableStateOf(false) }
    var showBusinessAccountInfo by remember { mutableStateOf(false) }
    var voucherFilter by remember { mutableStateOf("active") }
    var reviewFilter by remember { mutableStateOf("all") }
    val scope = rememberCoroutineScope()
    val tabs = listOf("Dashboard", "Quảng cáo", "Voucher", "Hồ sơ")

    suspend fun load() {
        loading = true
        error = null
        runCatching {
            coroutineScope {
                val o = async { ApiClient.businessOverview() }
                val t = async { ApiClient.businessTransactions() }
                val p = async { ApiClient.businessAdPackages() }
                val c = async { ApiClient.businessCampaigns() }
                val v = async { ApiClient.businessVouchers() }
                val loc = async { ApiClient.businessLocations() }
                val r = async { ApiClient.businessReviews() }
                val pay = async { ApiClient.businessPayouts() }
                val med = async { ApiClient.businessMedia() }
                overview = o.await()
                transactions = t.await().items
                packages = p.await().items
                campaigns = c.await().items
                vouchers = v.await().items
                locations = loc.await().items
                reviews = r.await().items
                payouts = pay.await().items
                media = med.await().items
            }
        }.onFailure {
            error = it.message ?: "Không tải được dữ liệu doanh nghiệp"
        }
        loading = false
    }

    LaunchedEffect(Unit) { load() }

    CompositionLocalProvider(LocalPortalPalette provides if (darkTheme) PortalDarkPalette else PortalLightPalette) {
    Column(
        Modifier
            .fillMaxSize()
            .background(portalBg())
            .statusBarsPadding(),
    ) {
        PortalHeader(
            title = when (tab) {
                1 -> "Quảng cáo"
                2 -> "Voucher"
                3 -> "Hồ sơ"
                else -> "Dashboard"
            },
            onBack = onBack,
            rightIcon = when (tab) {
                1 -> Icons.Filled.Add
                2 -> Icons.Filled.Add
                3 -> Icons.Filled.Edit
                else -> Icons.Outlined.Notifications
            },
            onRight = {
                when (tab) {
                    1 -> showCampaignForm = true
                    2 -> showVoucherForm = true
                    3 -> showLocationForm = true
                    else -> purchaseMessage = reviews.firstOrNull { it.reply.isNullOrBlank() }?.content ?: "Chưa có thông báo mới."
                }
            },
            onMenu = { showBusinessMenu = true },
            darkTheme = darkTheme,
            onToggleTheme = onToggleTheme,
        )
        Column(
            Modifier.fillMaxSize(),
        ) {
            when {
                loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { OrangeLoadingSpinner() }
                error != null -> Text(error!!, color = PremiumColors.LogoutRed, modifier = Modifier.padding(PremiumDesign.ScreenPadding))
                else -> {
                    LazyColumn(
                        Modifier
                            .weight(1f)
                            .padding(horizontal = 24.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        purchaseMessage?.let { msg ->
                            item { Text(msg, fontSize = 12.sp, color = PortalGreen) }
                        }
                        when (tab) {
                            0 -> {
                                item { BusinessIdentityCard(overview?.business) }
                                item { PortalSectionTitle("DOANH THU BOOKING") }
                                item {
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        overview?.let {
                                            PortalMetricCard("Doanh thu (net)", compactVnd(it.net_revenue_vnd), "sau hoa hồng", Modifier.weight(1f))
                                            PortalMetricCard("Tổng booking", "${it.booking_count}", "đã xác nhận", Modifier.weight(1f))
                                        }
                                    }
                                }
                                overview?.ad_package_expiry?.let { exp ->
                                    item { PortalInfoLine("Hạn gói quảng bá", exp.take(10)) }
                                }
                                item { PortalSectionTitle("HIỆU QUẢ HÔM NAY") }
                                item {
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        overview?.let {
                                            PortalMetricCard("Lượt hiển thị", compactNumber(it.impressions), "đã đồng bộ", Modifier.weight(1f))
                                            PortalMetricCard("Lượt click ads", compactNumber(it.clicks), "CTR ${"%.1f".format(it.ctr)}%", Modifier.weight(1f))
                                        }
                                    }
                                }
                                item {
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        overview?.let {
                                            PortalMetricCard("Trong trip AI", compactNumber(it.suggested_count), "lượt được gợi ý", Modifier.weight(1f))
                                            PortalMetricCard("Ngân sách còn", compactVnd(it.remaining_budget_vnd), "${it.active_ad_campaigns} chiến dịch chạy", Modifier.weight(1f))
                                        }
                                    }
                                }
                                item { PortalSectionTitle("LƯỢT HIỂN THỊ 7 NGÀY") }
                                item { BusinessImpressionChart(campaigns, overview) }
                                item { PortalSectionTitle("VOUCHER ĐANG CHẠY") }
                                if (vouchers.isEmpty()) item { EmptyPortalText("Chưa có voucher đang chạy.") }
                                items(vouchers.take(2), key = { it.id }) { voucher -> BusinessVoucherCompactRow(voucher) }
                                item { PortalSectionTitle("REVIEW GẦN NHẤT") }
                                if (reviews.isEmpty()) item { EmptyPortalText("Chưa có review.") }
                                items(reviews.take(2), key = { it.id }) { review -> BusinessReviewCompactRow(review, onReply = { replyTarget = review }) }
                            }
                            1 -> {
                                item {
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        overview?.let {
                                            PortalMetricCard("Tổng hiển thị", compactNumber(it.impressions), "đã đồng bộ", Modifier.weight(1f))
                                            PortalMetricCard("Ngân sách còn", compactVnd(it.remaining_budget_vnd), "${it.active_ad_campaigns} chiến dịch", Modifier.weight(1f))
                                        }
                                    }
                                }
                                item { PortalSectionTitle("CHIẾN DỊCH ĐANG CHẠY") }
                                item { PremiumAccentButton("+  Tạo chiến dịch mới", onClick = { showCampaignForm = true }, height = 48.dp) }
                                if (campaigns.isEmpty()) item { EmptyPortalText("Chưa có chiến dịch quảng cáo.") }
                                items(campaigns, key = { it.id }) { campaign -> BusinessCampaignCard(campaign) }
                                if (packages.isNotEmpty()) {
                                    item { PortalSectionTitle("GÓI QUẢNG CÁO") }
                                    items(packages, key = { it.id }) { pkg ->
                                        BusinessAdPackageCard(
                                            pkg = pkg,
                                            onPurchase = {
                                                scope.launch {
                                                    runCatching {
                                                        val res = ApiClient.purchaseAdPackage(pkg.id)
                                                        if (!res.checkout_url.isNullOrBlank()) {
                                                            adPayInfo = res
                                                            purchaseMessage = "Thanh toán để kích hoạt gói ${pkg.name}."
                                                        } else {
                                                            purchaseMessage = "Đã kích hoạt gói ${pkg.name}."
                                                            load()
                                                        }
                                                    }.onFailure {
                                                        purchaseMessage = it.message ?: "Không mua được gói"
                                                    }
                                                }
                                            },
                                        )
                                    }
                                }
                            }
                            2 -> {
                                val filteredVouchers = filteredBusinessVouchers(vouchers, voucherFilter)
                                item {
                                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        PortalFilterChip("Đang chạy", selected = voucherFilter == "active") { voucherFilter = "active" }
                                        PortalFilterChip("Sắp hết", selected = voucherFilter == "ending") { voucherFilter = "ending" }
                                        PortalFilterChip("Đã kết thúc", selected = voucherFilter == "ended") { voucherFilter = "ended" }
                                    }
                                }
                                if (filteredVouchers.isEmpty()) item { EmptyPortalText("Chưa có voucher trong nhóm này.") }
                                items(filteredVouchers, key = { it.id }) { voucher -> BusinessVoucherCard(voucher) }
                                item { PremiumAccentButton("+  Tạo voucher mới", onClick = { showVoucherForm = true }, height = 48.dp) }
                            }
                            else -> {
                                val filteredReviews = filteredBusinessReviews(reviews, reviewFilter)
                                item { BusinessProfileCard(overview?.business) }
                                item { PortalSectionTitle("ĐỊA ĐIỂM ĐÃ ĐĂNG KÝ") }
                                if (locations.isEmpty()) item { EmptyPortalText("Chưa có địa điểm.") }
                                items(locations, key = { it.id }) { loc -> BusinessLocationCard(loc) }
                                item { PremiumAccentButton("+  Thêm địa điểm mới", onClick = { showLocationForm = true }, height = 48.dp) }

                                item { PortalSectionTitle("MEDIA (ẢNH/VIDEO)") }
                                item { PremiumAccentButton("+  Thêm media (URL)", onClick = { showMediaForm = true }, height = 48.dp) }
                                if (media.isEmpty()) item { EmptyPortalText("Chưa có media. Thêm ảnh/video cho địa điểm — admin sẽ duyệt.") }
                                items(media, key = { it.id }) { m -> BusinessMediaCard(m) }

                                item { PortalSectionTitle("GIAO DỊCH GẦN ĐÂY") }
                                if (transactions.isEmpty()) item { EmptyPortalText("Chưa có giao dịch.") }
                                items(transactions.take(20), key = { it.id }) { tx -> BusinessTransactionRow(tx) }

                                item { PortalSectionTitle("PAYOUT (THỰC NHẬN)") }
                                if (payouts.isEmpty()) item { EmptyPortalText("Chưa có khoản payout nào.") }
                                items(payouts, key = { it.id }) { p -> BusinessPayoutRow(p) }

                                item { PortalSectionTitle("ĐÁNH GIÁ") }
                                item {
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        val avg = overview?.business?.rating_avg ?: 0.0
                                        PortalMetricCard("Rating trung bình", "★ ${"%.1f".format(avg)}", "${reviews.size} đánh giá", Modifier.weight(1f))
                                        PortalMetricCard("Chưa phản hồi", "${reviews.count { it.reply.isNullOrBlank() }}", "cần xử lý", Modifier.weight(1f))
                                    }
                                }
                                item {
                                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        PortalFilterChip("Tất cả", selected = reviewFilter == "all") { reviewFilter = "all" }
                                        PortalFilterChip("5 sao", selected = reviewFilter == "five") { reviewFilter = "five" }
                                        PortalFilterChip("Chưa reply", selected = reviewFilter == "unreplied") { reviewFilter = "unreplied" }
                                        PortalFilterChip("Xấu", selected = reviewFilter == "bad") { reviewFilter = "bad" }
                                    }
                                }
                                if (filteredReviews.isEmpty()) item { EmptyPortalText("Chưa có đánh giá trong nhóm này.") }
                                items(filteredReviews, key = { it.id }) { review -> BusinessReviewCard(review, onReply = { replyTarget = review }) }
                            }
                        }
                        item { Spacer(Modifier.height(16.dp)) }
                    }
                    PortalBottomBar(sections = tabs, selected = tab, onSelect = { tab = it })
                }
            }
        }
    }
    if (showCampaignForm) {
        BusinessCampaignDialog(
            onDismiss = { showCampaignForm = false },
            onSave = { body ->
                scope.launch {
                    runCatching {
                        ApiClient.createBusinessCampaign(body)
                        showCampaignForm = false
                        load()
                    }.onFailure { error = it.message }
                }
            },
        )
    }
    if (showVoucherForm) {
        BusinessVoucherDialog(
            onDismiss = { showVoucherForm = false },
            onSave = { body ->
                scope.launch {
                    runCatching {
                        ApiClient.createBusinessVoucher(body)
                        showVoucherForm = false
                        load()
                    }.onFailure { error = it.message }
                }
            },
        )
    }
    if (showLocationForm) {
        BusinessLocationDialog(
            onDismiss = { showLocationForm = false },
            onSave = { body ->
                scope.launch {
                    runCatching {
                        ApiClient.createBusinessLocation(body)
                        showLocationForm = false
                        load()
                    }.onFailure { error = it.message }
                }
            },
        )
    }
    if (showMediaForm) {
        BusinessMediaDialog(
            onDismiss = { showMediaForm = false },
            onSave = { body ->
                scope.launch {
                    runCatching {
                        ApiClient.uploadBusinessMedia(body)
                        showMediaForm = false
                        purchaseMessage = "Đã gửi media. Chờ admin duyệt."
                        load()
                    }.onFailure { error = it.message }
                }
            },
        )
    }
    replyTarget?.let { review ->
        ReviewReplyDialog(
            onDismiss = { replyTarget = null },
            onSave = { reply ->
                scope.launch {
                    runCatching {
                        ApiClient.replyBusinessReview(review.id, reply)
                        replyTarget = null
                        load()
                    }.onFailure { error = it.message }
                }
            },
        )
    }
    if (showBusinessMenu) {
        PortalAccountMenuDialog(
            darkTheme = darkTheme,
            accountInfo = DashboardHomeCache.accountInfo,
            businessName = overview?.business?.name,
            onDismiss = { showBusinessMenu = false },
            onAccountInfo = {
                showBusinessMenu = false
                showBusinessAccountInfo = true
            },
            onToggleTheme = {
                onToggleTheme?.invoke()
                showBusinessMenu = false
            },
            onLogout = {
                showBusinessMenu = false
                onLogout?.invoke()
            },
        )
    }
    if (showBusinessAccountInfo) {
        PortalAccountInfoDialog(
            accountInfo = DashboardHomeCache.accountInfo,
            businessName = overview?.business?.name,
            onDismiss = { showBusinessAccountInfo = false },
        )
    }
    adPayInfo?.let { info ->
        AdPackagePaymentOverlay(
            info = info,
            onDone = { adPayInfo = null; scope.launch { load() } },
            onCancel = { adPayInfo = null },
        )
    }
    }
}

@Composable
private fun BusinessIdentityCard(business: com.wandertale.mobile.data.model.BusinessProfileRow?) {
    Row(
        Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            Modifier
                .size(62.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(Color(0xFFD8FFF0)),
            contentAlignment = Alignment.Center,
        ) {
            Text(initials(business?.name ?: "BT"), color = Color(0xFF00705C), fontWeight = FontWeight.Bold, fontSize = 20.sp)
        }
        Column {
            Text(business?.name ?: "Doanh nghiệp", color = portalText(), fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text("⊙ ${businessStatusText(business?.status)}", color = PortalGreen, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
        }
    }
}

@Composable
private fun BusinessImpressionChart(campaigns: List<BusinessCampaignRow>, overview: BusinessOverview?) {
    val base = overview?.impressions ?: 0
    val values = if (campaigns.isNotEmpty()) campaigns.takeLast(7).map { it.impressions.coerceAtLeast(0) } else listOf(base)
    val padded = List(7) { index -> values.getOrNull(index) ?: values.lastOrNull() ?: 0 }
    val maxValue = padded.maxOrNull()?.coerceAtLeast(1) ?: 1
    DarkPortalCard {
        Row(
            Modifier
                .fillMaxWidth()
                .height(92.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.Bottom,
        ) {
            padded.forEachIndexed { index, value ->
                Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height(((value.toFloat() / maxValue) * 58).dp.coerceAtLeast(8.dp))
                            .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                            .background(PortalGreen.copy(alpha = if (index == padded.lastIndex) 0.95f else 0.35f)),
                    )
                    Text(listOf("T2", "T3", "T4", "T5", "T6", "T7", "CN")[index], color = portalMuted(), fontSize = 11.sp)
                }
            }
        }
    }
}

@Composable
private fun BusinessVoucherCompactRow(voucher: BusinessVoucherRow) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.size(46.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFEDEAFF)),
            contentAlignment = Alignment.Center,
        ) { Icon(Icons.Filled.ConfirmationNumber, contentDescription = null, tint = PortalPurple, modifier = Modifier.size(22.dp)) }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(voucher.code ?: "Voucher", color = portalText(), fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(voucherSubtitle(voucher), color = portalMuted(), fontSize = 13.sp)
        }
        BusinessStatusPill(voucherStatusText(voucher.status))
    }
}

@Composable
private fun BusinessCampaignCard(campaign: BusinessCampaignRow) {
    DarkPortalCard {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Filled.Campaign, contentDescription = null, tint = PortalGreen, modifier = Modifier.size(20.dp))
                    Text(campaign.name ?: "Chiến dịch", color = portalText(), fontWeight = FontWeight.Bold, fontSize = 17.sp)
                }
                BusinessStatusPill(campaign.status ?: "—")
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("${compactNumber(campaign.impressions)}", color = portalText(), fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text("hiển thị", color = portalMuted(), fontSize = 11.sp)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("${compactNumber(campaign.clicks)}", color = portalText(), fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text("click", color = portalMuted(), fontSize = 11.sp)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("${compactNumber(campaign.suggested_count)}", color = portalText(), fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text("gợi ý", color = portalMuted(), fontSize = 11.sp)
                }
            }
            HorizontalDivider(color = portalStroke(), thickness = 0.5.dp)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("${campaign.target_type ?: "Target"} · ${campaign.region ?: "Khu vực"} · ${campaign.season ?: ""}", color = portalMuted(), fontSize = 12.sp)
            }
            Text("${formatPortalDate(campaign.starts_at)} — ${formatPortalDate(campaign.ends_at)} · ${formatPlatformVnd(campaign.budget_vnd)}", color = PortalGreen, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
        }
    }
}

@Composable
private fun BusinessVoucherCard(voucher: BusinessVoucherRow) {
    DarkPortalCard {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(voucher.code ?: "Voucher", color = portalText(), fontWeight = FontWeight.Bold, fontSize = 20.sp)
                BusinessStatusPill(voucherStatusText(voucher.status))
            }
            Text(voucherSubtitle(voucher), color = portalMuted(), fontSize = 13.sp)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Hết hạn", color = portalMuted(), fontWeight = FontWeight.SemiBold)
                Text(formatPortalDate(voucher.valid_until), color = portalText(), fontWeight = FontWeight.Bold)
            }
            val limit = voucher.usage_limit ?: voucher.used_count.coerceAtLeast(1)
            val ratio = (voucher.used_count.toFloat() / limit.coerceAtLeast(1)).coerceIn(0f, 1f)
            Box(Modifier.fillMaxWidth().height(5.dp).clip(RoundedCornerShape(50)).background(portalBg())) {
                Box(Modifier.fillMaxWidth(ratio).height(5.dp).clip(RoundedCornerShape(50)).background(if (ratio > 0.8f) Color(0xFFFFA51F) else PortalGreen))
            }
            Text("${voucher.used_count}/$limit lượt dùng", color = portalMuted(), fontSize = 12.sp, modifier = Modifier.align(Alignment.End))
        }
    }
}

@Composable
private fun BusinessProfileCard(business: com.wandertale.mobile.data.model.BusinessProfileRow?) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        BusinessIdentityCard(business)
        PortalSectionTitle("THÔNG TIN DOANH NGHIỆP")
        UserInfoRow("Loại hình", business?.business_type ?: "—")
        UserInfoRow("Khu vực", business?.region ?: "—")
        UserInfoRow("Hotline", business?.hotline ?: "—")
        UserInfoRow("Rating", "★ ${"%.1f".format(business?.rating_avg ?: 0.0)} (${business?.rating_count ?: 0} đánh giá)")
    }
}

@Composable
private fun BusinessLocationCard(location: BusinessLocationRow) {
    DarkPortalCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(54.dp).clip(RoundedCornerShape(12.dp)).background(portalCard()), contentAlignment = Alignment.Center) {
                Icon(Icons.Filled.Place, contentDescription = null, tint = PortalGreen, modifier = Modifier.size(26.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(location.name ?: "Địa điểm", color = portalText(), fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(listOfNotNull(location.address, location.category).joinToString(" · ").ifBlank { "—" }, color = portalMuted(), fontSize = 13.sp)
            }
            BusinessStatusPill(location.status ?: "Live")
        }
    }
}

@Composable
private fun BusinessReviewCompactRow(review: BusinessReviewRow, onReply: () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        Box(Modifier.size(42.dp).clip(CircleShape).background(Color(0xFFD8FFF0)), contentAlignment = Alignment.Center) {
            Text(initials(review.user_name ?: "U"), color = Color(0xFF006B58), fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(review.user_name ?: "Người dùng", color = portalText(), fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(stars(review.rating), color = Color(0xFFD4820A), fontSize = 13.sp)
            Text(review.content ?: "—", color = portalMuted(), fontSize = 13.sp)
            if (review.reply.isNullOrBlank()) {
                Text("Phản hồi", color = PortalGreen, fontWeight = FontWeight.Bold, fontSize = 12.sp, modifier = Modifier.clickable(onClick = onReply))
            }
        }
    }
}

@Composable
private fun BusinessReviewCard(review: BusinessReviewRow, onReply: () -> Unit) {
    DarkPortalCard {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(review.user_name ?: "Người dùng", color = portalText(), fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(stars(review.rating), color = Color(0xFFD4820A), fontSize = 14.sp)
            }
            Text(formatPortalDate(review.created_at), color = portalMuted(), fontSize = 12.sp)
            Text(review.content ?: "—", color = portalMuted(), fontSize = 13.sp)
            if (review.reply.isNullOrBlank()) {
                OutlinedButton(onClick = onReply) { Text("Phản hồi ngay", fontSize = 12.sp) }
            } else {
                Text("✓ Đã phản hồi", color = PortalGreen, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            }
        }
    }
}

private fun compactNumber(value: Int): String = when {
    value >= 1_000_000 -> "${"%.1f".format(value / 1_000_000.0)}M"
    value >= 1_000 -> "${"%.1f".format(value / 1_000.0)}K"
    else -> "$value"
}

private fun filteredBusinessVouchers(items: List<BusinessVoucherRow>, filter: String): List<BusinessVoucherRow> = items.filter {
    businessVoucherDisplayStatus(it) == filter
}

private fun businessVoucherDisplayStatus(voucher: BusinessVoucherRow): String {
    val status = voucher.status?.lowercase(Locale.ROOT)
    if (status == "ended" || status == "expired") return "ended"
    val limit = voucher.usage_limit
    val usageRatio = if (limit == null || limit <= 0) 0f else voucher.used_count.toFloat() / limit
    return when {
        status == "ending" || usageRatio >= 0.85f -> "ending"
        status == "active" || status == "live" || status == null -> "active"
        else -> status
    }
}

private fun filteredBusinessReviews(items: List<BusinessReviewRow>, filter: String): List<BusinessReviewRow> = when (filter) {
    "five" -> items.filter { it.rating == 5 }
    "unreplied" -> items.filter { it.reply.isNullOrBlank() }
    "bad" -> items.filter { it.rating <= 3 }
    else -> items
}

private fun businessStatusText(status: String?): String = when (status?.lowercase(Locale.ROOT)) {
    "active", "verified", "live" -> "Đối tác xác minh"
    "pending" -> "Chờ duyệt"
    "suspended" -> "Tạm dừng"
    else -> status ?: "Chưa xác minh"
}

private fun voucherStatusText(status: String?): String = when (status?.lowercase(Locale.ROOT)) {
    "active", "live" -> "Đang chạy"
    "ending" -> "Sắp hết"
    "ended", "expired" -> "Kết thúc"
    else -> status ?: "—"
}

@Composable
private fun BusinessAdPackageCard(pkg: AdPackage, onPurchase: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .border(1.dp, portalStroke(), RoundedCornerShape(16.dp))
            .background(portalCard())
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(pkg.name, color = portalText(), fontWeight = FontWeight.Bold, fontSize = 18.sp)
        pkg.description?.let { Text(it, color = portalMuted(), fontSize = 13.sp) }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
            Text(formatPlatformVnd(pkg.price_vnd), color = PortalGreen, fontWeight = FontWeight.Bold, fontSize = 20.sp)
            Text("${pkg.duration_days ?: 0} ngày", color = portalMuted(), fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
        }
        Button(
            onClick = onPurchase,
            modifier = Modifier.fillMaxWidth().height(46.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = PortalGreen, contentColor = Color.White),
        ) {
            Icon(Icons.Filled.ShoppingCart, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("Mua gói", fontWeight = FontWeight.Bold, fontSize = 15.sp)
        }
    }
}

private fun voucherSubtitle(voucher: BusinessVoucherRow): String {
    val discount = if (voucher.discount_type == "percent") {
        "Giảm ${voucher.discount_value?.toInt() ?: 0}%"
    } else {
        "Giảm ${formatPlatformVnd(voucher.discount_value)}"
    }
    val limit = voucher.usage_limit?.let { "Còn ${(it - voucher.used_count).coerceAtLeast(0)}/$it lượt" }
    return listOfNotNull(discount, limit).joinToString(" · ")
}

private fun stars(rating: Int): String {
    val filled = rating.coerceIn(0, 5)
    return "★".repeat(filled) + "☆".repeat(5 - filled)
}

@Composable
fun AdminPortalScreen(onBack: (() -> Unit)? = null, onLogout: (() -> Unit)? = null, darkTheme: Boolean = true, onToggleTheme: (() -> Unit)? = null) {
    var section by remember { mutableIntStateOf(0) }
    var overview by remember { mutableStateOf<AdminOverview?>(null) }
    var transactions by remember { mutableStateOf<List<PlatformTransaction>>(emptyList()) }
    var users by remember { mutableStateOf<List<AdminUserRow>>(emptyList()) }
    var businesses by remember { mutableStateOf<List<AdminBusinessRow>>(emptyList()) }
    var aiConfigs by remember { mutableStateOf<List<AiConfigRow>>(emptyList()) }
    var logs by remember { mutableStateOf<List<SystemLogRow>>(emptyList()) }
    var media by remember { mutableStateOf<List<com.wandertale.mobile.data.model.BusinessMediaRow>>(emptyList()) }
    var payouts by remember { mutableStateOf<List<PayoutRecord>>(emptyList()) }
    var aiRules by remember { mutableStateOf<List<com.wandertale.mobile.data.model.AiRecommendationRule>>(emptyList()) }
    var selectedUser by remember { mutableStateOf<AdminUserDetail?>(null) }
    var userSearch by remember { mutableStateOf("") }
    var userFilter by remember { mutableStateOf("Tất cả") }
    var businessFilter by remember { mutableStateOf("Chờ duyệt") }
    var logFilter by remember { mutableStateOf("Tất cả") }
    var showCreateUser by remember { mutableStateOf(false) }
    var showAdminMenu by remember { mutableStateOf(false) }
    var showAdminAccountInfo by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var actionMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val sections = listOf("Dashboard", "Users", "Business", "Cài đặt")

    suspend fun load() {
        loading = true
        error = null
        runCatching {
            coroutineScope {
                val o = async { ApiClient.adminOverview() }
                val t = async { ApiClient.adminTransactions() }
                val u = async { ApiClient.adminUsers() }
                val b = async { ApiClient.adminBusinesses() }
                val a = async { ApiClient.adminAiConfig() }
                val l = async { ApiClient.adminSystemLogs() }
                val med = async { ApiClient.adminMedia() }
                val pay = async { ApiClient.adminPayouts() }
                val rules = async { ApiClient.adminAiRecommendationRules() }
                overview = o.await()
                transactions = t.await().items
                users = u.await().items
                businesses = b.await().items
                aiConfigs = a.await().items
                logs = l.await().items
                media = med.await().items
                payouts = pay.await().items
                aiRules = rules.await().items
            }
        }.onFailure {
            error = it.message ?: "Không tải được dữ liệu admin"
        }
        loading = false
    }

    LaunchedEffect(Unit) { load() }

    CompositionLocalProvider(LocalPortalPalette provides if (darkTheme) PortalDarkPalette else PortalLightPalette) {
    Column(
        Modifier
            .fillMaxSize()
            .background(portalBg())
            .statusBarsPadding(),
    ) {
        PortalHeader(
            title = when (section) {
                1 -> "Người dùng"
                2 -> "Duyệt business"
                3 -> "System logs"
                else -> "Dashboard"
            },
            onBack = onBack,
            rightIcon = when (section) {
                1 -> Icons.Filled.PersonAdd
                2 -> Icons.Filled.FilterList
                3 -> Icons.Filled.Download
                else -> Icons.Outlined.Notifications
            },
            onRight = {
                when (section) {
                    1 -> showCreateUser = true
                    2 -> businessFilter = if (businessFilter == "Chờ duyệt") "Đã duyệt" else if (businessFilter == "Đã duyệt") "Từ chối" else "Chờ duyệt"
                    3 -> actionMessage = "System logs đã sẵn sàng để tải xuống khi có endpoint export."
                    else -> actionMessage = logs.firstOrNull()?.message ?: "Chưa có thông báo mới."
                }
            },
            onMenu = { showAdminMenu = true },
            darkTheme = darkTheme,
            onToggleTheme = onToggleTheme,
        )
        Column(
            Modifier.fillMaxSize(),
        ) {
            when {
                loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { OrangeLoadingSpinner() }
                error != null -> Text(error!!, color = PremiumColors.LogoutRed, modifier = Modifier.padding(PremiumDesign.ScreenPadding))
                else -> {
                    LazyColumn(
                        Modifier
                            .weight(1f)
                            .padding(horizontal = 24.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        actionMessage?.let { msg ->
                            item { Text(msg, fontSize = 12.sp, color = PortalGreen) }
                        }
                        when (section) {
                            0 -> {
                                item { PortalSectionTitle("TỔNG QUAN HỆ THỐNG") }
                                item {
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        overview?.let {
                                            PortalMetricCard("Tổng user", "${it.user_count}", "đã đồng bộ", Modifier.weight(1f))
                                            PortalMetricCard("Trips tạo hôm nay", "${it.trips_today}", "đã đồng bộ", Modifier.weight(1f))
                                        }
                                    }
                                }
                                item {
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        overview?.let {
                                            PortalMetricCard("Doanh thu tháng", compactVnd(it.total_revenue_vnd), "đã đồng bộ", Modifier.weight(1f))
                                            PortalMetricCard("Business hoạt động", "${it.business_count}", "${it.pending_business_count} chờ duyệt", Modifier.weight(1f))
                                        }
                                    }
                                }
                                item {
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        overview?.let {
                                            PortalMetricCard("DT hoa hồng", compactVnd(it.commission_revenue_vnd), "booking", Modifier.weight(1f))
                                            PortalMetricCard("DT quảng cáo", compactVnd(it.ad_revenue_vnd), "ad package", Modifier.weight(1f))
                                        }
                                    }
                                }
                                item {
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        overview?.let {
                                            PortalMetricCard("Tổng booking", "${it.booking_count}", "toàn hệ thống", Modifier.weight(1f))
                                            PortalMetricCard("User bị ban", "${it.banned_user_count}", "", Modifier.weight(1f))
                                        }
                                    }
                                }
                                item { PortalSectionTitle("DOANH THU 7 NGÀY") }
                                item { RevenueBars(transactions) }
                                item { PortalSectionTitle("CẢNH BÁO HỆ THỐNG") }
                                val warningLogs = logs.filter { it.level == "error" || it.level == "warning" }.take(2)
                                if (warningLogs.isEmpty()) {
                                    item { EmptyPortalText("Chưa có cảnh báo hệ thống.") }
                                } else {
                                    items(warningLogs, key = { it.id }) { log -> AdminAlertCard(log) }
                                }
                                item { PortalSectionTitle("NGƯỜI DÙNG MỚI NHẤT") }
                                if (users.isEmpty()) item { EmptyPortalText("Chưa có người dùng.") }
                                items(users.take(3), key = { it.id }) { user -> AdminUserCompactRow(user) }
                            }
                            1 -> {
                                val filteredUsers = filteredAdminUsers(users, userSearch, userFilter)
                                item {
                                    PortalSearchField(
                                        value = userSearch,
                                        onValueChange = { userSearch = it },
                                        placeholder = "Tìm tên, email...",
                                    )
                                }
                                item {
                                    Row(
                                        Modifier.horizontalScroll(rememberScrollState()),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        listOf("Tất cả", "Active", "Banned", "Business").forEach { filter ->
                                            PortalFilterChip(filter, selected = userFilter == filter) { userFilter = filter }
                                        }
                                    }
                                }
                                item {
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        PortalMetricCard("Tổng user", "${overview?.user_count ?: users.size}", modifier = Modifier.weight(1f))
                                        PortalMetricCard("Bị banned", "${overview?.banned_user_count ?: users.count { it.status == "banned" }}", modifier = Modifier.weight(1f))
                                    }
                                }
                                item { PortalSectionTitle("DANH SÁCH") }
                                if (filteredUsers.isEmpty()) item { EmptyPortalText("Không có user phù hợp.") }
                                items(filteredUsers, key = { it.id }) { user ->
                                    AdminUserListRow(user) {
                                        scope.launch {
                                            runCatching {
                                                selectedUser = ApiClient.adminUserDetail(user.id)
                                            }.onFailure { actionMessage = it.message }
                                        }
                                    }
                                }
                            }
                            2 -> {
                                val filteredBusinesses = filteredAdminBusinesses(businesses, businessFilter)
                                item {
                                    Row(
                                        Modifier.horizontalScroll(rememberScrollState()),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        val pendingCount = businesses.count { normalizeBusinessStatus(it) == "pending" }
                                        PortalFilterChip("Chờ duyệt ($pendingCount)", selected = businessFilter == "Chờ duyệt") { businessFilter = "Chờ duyệt" }
                                        PortalFilterChip("Đã duyệt", selected = businessFilter == "Đã duyệt") { businessFilter = "Đã duyệt" }
                                        PortalFilterChip("Từ chối", selected = businessFilter == "Từ chối") { businessFilter = "Từ chối" }
                                    }
                                }
                                if (filteredBusinesses.isEmpty()) item { EmptyPortalText("Không có business phù hợp.") }
                                items(filteredBusinesses, key = { it.id }) { biz ->
                                    AdminBusinessApprovalCard(
                                        biz = biz,
                                        onApprove = {
                                            scope.launch {
                                                runCatching {
                                                    ApiClient.adminUpdateBusinessStatus(biz.id, "active")
                                                    actionMessage = "Đã kích hoạt doanh nghiệp."
                                                    load()
                                                }.onFailure { actionMessage = it.message }
                                            }
                                        },
                                        onReject = {
                                            scope.launch {
                                                runCatching {
                                                    ApiClient.adminUpdateBusinessStatus(biz.id, "suspended")
                                                    actionMessage = "Đã tạm dừng doanh nghiệp."
                                                    load()
                                                }.onFailure { actionMessage = it.message }
                                            }
                                        },
                                    )
                                }
                            }
                            else -> {
                                val filteredLogs = filteredSystemLogs(logs, logFilter)
                                item { PortalSectionTitle("DUYỆT MEDIA") }
                                if (media.isEmpty()) item { EmptyPortalText("Chưa có media chờ duyệt.") }
                                items(media, key = { it.id }) { m ->
                                    AdminMediaModerationCard(
                                        media = m,
                                        onApprove = {
                                            scope.launch {
                                                runCatching {
                                                    ApiClient.adminUpdateMediaStatus(m.id, "approved")
                                                    actionMessage = "Đã duyệt media."
                                                    load()
                                                }.onFailure { actionMessage = it.message }
                                            }
                                        },
                                        onReject = {
                                            scope.launch {
                                                runCatching {
                                                    ApiClient.adminUpdateMediaStatus(m.id, "rejected", "Không đạt yêu cầu")
                                                    actionMessage = "Đã từ chối media."
                                                    load()
                                                }.onFailure { actionMessage = it.message }
                                            }
                                        },
                                    )
                                }

                                item { PortalSectionTitle("PAYOUT") }
                                if (payouts.isEmpty()) item { EmptyPortalText("Chưa có khoản payout nào.") }
                                items(payouts, key = { it.id }) { p ->
                                    AdminPayoutRow(
                                        payout = p,
                                        onProcess = {
                                            scope.launch {
                                                runCatching {
                                                    ApiClient.adminProcessPayout(p.id)
                                                    actionMessage = "Đã xử lý payout."
                                                    load()
                                                }.onFailure { actionMessage = it.message }
                                            }
                                        },
                                    )
                                }

                                item { PortalSectionTitle("AI RECOMMENDATION RULES") }
                                if (aiRules.isEmpty()) item { EmptyPortalText("Chưa có rule nào.") }
                                items(aiRules, key = { it.id }) { rule ->
                                    AdminAiRuleRow(
                                        rule = rule,
                                        onToggle = {
                                            scope.launch {
                                                runCatching {
                                                    val next = if (rule.status == "active") "inactive" else "active"
                                                    ApiClient.adminUpdateAiRule(rule.id, com.wandertale.mobile.data.model.AiRecommendationRulePatch(status = next))
                                                    actionMessage = "Đã cập nhật rule."
                                                    load()
                                                }.onFailure { actionMessage = it.message }
                                            }
                                        },
                                    )
                                }

                                item {
                                    Row(
                                        Modifier.horizontalScroll(rememberScrollState()),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        listOf("Tất cả", "Error", "Warning", "Info").forEach { filter ->
                                            PortalFilterChip(filter, selected = logFilter == filter) { logFilter = filter }
                                        }
                                    }
                                }
                                item { PortalSectionTitle("TÀI NGUYÊN HỆ THỐNG") }
                                item { SystemResourceBar("AI API usage hôm nay", aiLogRatio(logs), Color(0xFFFFA51F)) }
                                item { SystemResourceBar("DB connections", dbLogRatio(logs), PortalGreen) }
                                item { PortalSectionTitle("LOG GẦN NHẤT") }
                                if (filteredLogs.isEmpty()) item { EmptyPortalText("Chưa có system log.") }
                                items(filteredLogs, key = { it.id }) { log -> SystemLogListRow(log) }
                            }
                    }
                    item { Spacer(Modifier.height(16.dp)) }
                }
                    PortalBottomBar(sections = sections, selected = section, onSelect = { section = it; actionMessage = null })
                }
            }
        }
    }
    selectedUser?.let { detail ->
        AdminUserDetailDialog(
            detail = detail,
            onDismiss = { selectedUser = null },
            onToggleRole = {
                scope.launch {
                    runCatching {
                        ApiClient.adminUpdateUserRole(detail.id, UserRolePatch(is_business = !detail.is_business))
                        selectedUser = ApiClient.adminUserDetail(detail.id)
                        load()
                    }.onFailure { actionMessage = it.message }
                }
            },
            onToggleBan = {
                scope.launch {
                    runCatching {
                        val next = if (detail.status == "banned") "active" else "banned"
                        ApiClient.adminUpdateUserStatus(detail.id, next)
                        selectedUser = ApiClient.adminUserDetail(detail.id)
                        load()
                    }.onFailure { actionMessage = it.message }
                }
            },
        )
    }
    if (showCreateUser) {
        AdminCreateUserDialog(
            onDismiss = { showCreateUser = false },
            onCreate = { input ->
                scope.launch {
                    runCatching {
                        ApiClient.adminCreateUser(input)
                        showCreateUser = false
                        actionMessage = "Đã tạo tài khoản ${input.email}."
                        load()
                    }.onFailure { actionMessage = it.message }
                }
            },
        )
    }
    if (showAdminMenu) {
        PortalAccountMenuDialog(
            darkTheme = darkTheme,
            accountInfo = DashboardHomeCache.accountInfo,
            onDismiss = { showAdminMenu = false },
            onAccountInfo = {
                showAdminMenu = false
                showAdminAccountInfo = true
            },
            onToggleTheme = {
                onToggleTheme?.invoke()
                showAdminMenu = false
            },
            onLogout = {
                showAdminMenu = false
                onLogout?.invoke()
            },
        )
    }
    if (showAdminAccountInfo) {
        PortalAccountInfoDialog(
            accountInfo = DashboardHomeCache.accountInfo,
            onDismiss = { showAdminAccountInfo = false },
        )
    }
    }
}

@Composable
private fun PortalHeader(
    title: String,
    onBack: (() -> Unit)?,
    rightIcon: ImageVector? = null,
    onRight: (() -> Unit)? = null,
    onMenu: (() -> Unit)? = null,
    darkTheme: Boolean = true,
    onToggleTheme: (() -> Unit)? = null,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(46.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(portalCard())
                .border(1.dp, portalStroke(), RoundedCornerShape(12.dp))
                .clickable { if (onBack != null) onBack() else onMenu?.invoke() },
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = if (onBack != null) Icons.AutoMirrored.Filled.ArrowBack else Icons.Filled.Menu,
                contentDescription = if (onBack != null) "Quay lại" else "Menu",
                tint = portalText(),
                modifier = Modifier.size(24.dp),
            )
        }
        Spacer(Modifier.weight(1f))
        Text(title, color = portalText(), fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.weight(1f))
        Box(
            modifier = Modifier
                .size(46.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(portalCard())
                .border(1.dp, portalStroke(), RoundedCornerShape(12.dp))
                .then(if (onRight != null) Modifier.clickable(onClick = onRight) else Modifier),
            contentAlignment = Alignment.Center,
        ) {
            if (rightIcon != null) {
                Icon(imageVector = rightIcon, contentDescription = null, tint = portalText(), modifier = Modifier.size(22.dp))
            }
        }
    }
}

@Composable
private fun PortalBottomBar(sections: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(portalBg())
            .border(1.dp, portalStroke())
            .navigationBarsPadding()
            .padding(start = 18.dp, top = 8.dp, end = 18.dp, bottom = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        sections.forEachIndexed { index, label ->
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(10.dp))
                    .clickable { onSelect(index) }
                    .padding(vertical = 2.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Icon(
                    imageVector = portalTabIcon(label),
                    contentDescription = label,
                    tint = if (selected == index) PortalPurple else portalMuted(),
                    modifier = Modifier.size(23.dp),
                )
                Text(
                    text = label,
                    color = if (selected == index) PortalPurple else portalMuted(),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

private fun portalTabIcon(label: String): ImageVector = when (label) {
    "Dashboard" -> Icons.Filled.GridView
    "Quảng cáo" -> Icons.Filled.Campaign
    "Voucher" -> Icons.Filled.ConfirmationNumber
    "Business" -> Icons.Filled.Storefront
    "Cài đặt" -> Icons.Filled.Settings
    "Users" -> Icons.Filled.Group
    "Hồ sơ" -> Icons.Filled.Person
    else -> Icons.Filled.GridView
}

@Composable
private fun PortalSectionTitle(text: String) {
    Text(
        text = text,
        color = portalMuted(),
        fontSize = 15.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(top = 4.dp),
    )
}

@Composable
private fun RevenueBars(transactions: List<PlatformTransaction>) {
    val today = java.time.LocalDate.now()
    val days = (0..6).map { today.minusDays((6 - it).toLong()) }
    val values = DoubleArray(7)
    transactions.forEach { tx ->
        val raw = tx.created_at?.take(10) ?: return@forEach
        val date = runCatching { java.time.LocalDate.parse(raw) }.getOrNull() ?: return@forEach
        val idx = days.indexOf(date)
        if (idx >= 0) values[idx] += (tx.net_amount ?: tx.gross_amount ?: 0.0)
    }
    val max = values.maxOrNull()?.takeIf { it > 0.0 } ?: 1.0
    fun viWeekday(d: java.time.LocalDate): String = when (d.dayOfWeek.value) {
        1 -> "T2"; 2 -> "T3"; 3 -> "T4"; 4 -> "T5"; 5 -> "T6"; 6 -> "T7"; else -> "CN"
    }
    DarkPortalCard {
        Row(
            Modifier
                .fillMaxWidth()
                .height(150.dp)
                .padding(horizontal = 18.dp, vertical = 18.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.Bottom,
        ) {
            values.forEachIndexed { index, value ->
                Column(
                    Modifier.weight(1f),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Bottom,
                ) {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height((28 + (value / max * 62)).dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(if (index == values.lastIndex) PortalPurple else Color(0xFFA9A0E8)),
                    )
                    Text(viWeekday(days[index]), color = portalMuted(), fontSize = 11.sp)
                }
            }
        }
    }
}

@Composable
private fun AdminAlertCard(log: SystemLogRow) {
    val isError = log.level == "error"
    Box(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (isError) Color(0xFFFFE8E8) else Color(0xFFFFF1D8))
            .border(1.dp, if (isError) Color(0xFFFF7777) else Color(0xFFFFA726), RoundedCornerShape(12.dp))
            .padding(16.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(log.message ?: "System alert", color = if (isError) Color(0xFF7A1717) else Color(0xFF5B3100), fontWeight = FontWeight.Bold)
            Text("${log.source ?: "system"} — ${log.created_at?.take(16)?.replace('T', ' ') ?: ""}", color = if (isError) Color(0xFF7A1717) else Color(0xFF5B3100), fontSize = 12.sp)
        }
    }
}

@Composable
private fun AdminUserCompactRow(user: AdminUserRow) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(
            text = initials(user.display_name ?: user.email),
            color = if (user.status == "banned") Color(0xFF8E2424) else PortalPurple,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(if (user.status == "banned") Color(0xFFFFE8E8) else Color(0xFFE7E4FF))
                .padding(top = 14.dp),
        )
        Column(Modifier.weight(1f)) {
            Text(user.display_name ?: user.email ?: user.id, color = portalText(), fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(user.email ?: "—", color = portalMuted(), fontSize = 13.sp)
        }
        RoleChip(if (user.status == "banned") "Banned" else "Active", user.status != "banned")
    }
}

@Composable
private fun PortalSearchField(value: String, onValueChange: (String) -> Unit, placeholder: String) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        singleLine = true,
        placeholder = { Text(placeholder, color = portalMuted()) },
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun PortalFilterChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        label,
        color = if (selected) PortalPurple else portalMuted(),
        fontSize = 13.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) Color(0xFFE7E4FF) else Color.Transparent)
            .border(1.dp, if (selected) Color.Transparent else portalStroke(), RoundedCornerShape(50))
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
    )
}

@Composable
private fun AdminUserListRow(user: AdminUserRow, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(
            text = initials(user.display_name ?: user.email),
            color = if (user.status == "banned") Color(0xFF8E2424) else if (user.is_business) PortalPurple else PortalGreen,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .size(52.dp)
                .clip(CircleShape)
                .background(
                    when {
                        user.status == "banned" -> Color(0xFFFFE8E8)
                        user.is_business -> Color(0xFFE7E4FF)
                        else -> Color(0xFFD8FFF0)
                    },
                )
                .padding(top = 16.dp),
        )
        Column(Modifier.weight(1f)) {
            Text(user.display_name ?: user.email ?: user.id, color = portalText(), fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(user.email ?: "—", color = portalMuted(), fontSize = 13.sp)
        }
        RoleChip(
            when {
                user.status == "banned" -> "Banned"
                user.is_business -> "Business"
                else -> "Active"
            },
            user.status != "banned",
        )
        Text("›", color = portalMuted(), fontSize = 24.sp)
    }
}

@Composable
private fun UserInfoRow(label: String, value: String) {
    Row(
        Modifier
            .fillMaxWidth()
            .border(0.5.dp, portalStroke())
            .padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, color = portalMuted(), fontWeight = FontWeight.SemiBold)
        Text(value, color = portalText(), fontWeight = FontWeight.Bold, textAlign = TextAlign.End)
    }
}

@Composable
private fun AdminBusinessApprovalCard(biz: AdminBusinessRow, onApprove: () -> Unit, onReject: () -> Unit) {
    DarkPortalCard {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(
                    initials(biz.name),
                    color = PortalGreen,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .size(58.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFFD8FFF0))
                        .padding(top = 18.dp),
                )
                Column(Modifier.weight(1f)) {
                    Text(biz.name ?: "—", color = portalText(), fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Text(relativePortalTime(biz.created_at), color = portalMuted(), fontSize = 13.sp)
                }
                BusinessStatusPill(businessStatusLabel(biz))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MiniMetaChip("⌖ ${biz.region ?: "—"}")
                MiniMetaChip("▦ ${biz.business_type ?: "—"}")
                biz.license_no?.takeIf { it.isNotBlank() }?.let { MiniMetaChip("▤ GPKD: $it") }
            }
            Text(
                biz.description ?: biz.contact_email ?: "Chưa có mô tả doanh nghiệp.",
                color = portalText().copy(alpha = 0.80f),
                fontSize = 13.sp,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = onReject,
                    colors = ButtonDefaults.buttonColors(containerColor = PortalDanger, contentColor = Color(0xFF8A1D1D)),
                    modifier = Modifier.weight(1f),
                ) { Text(if (normalizeBusinessStatus(biz) == "pending") "Từ chối" else "Tạm dừng") }
                Button(
                    onClick = onApprove,
                    colors = ButtonDefaults.buttonColors(containerColor = PortalPurple, contentColor = Color.White),
                    modifier = Modifier.weight(1f),
                ) { Text(if (normalizeBusinessStatus(biz) == "active") "Đã duyệt" else "Duyệt") }
            }
        }
    }
}

@Composable
private fun MiniMetaChip(text: String) {
    Text(
        text,
        color = portalText().copy(alpha = 0.76f),
        fontSize = 11.sp,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(Color.Black.copy(alpha = 0.16f))
            .padding(horizontal = 8.dp, vertical = 5.dp),
    )
}

@Composable
private fun BusinessStatusPill(label: String) {
    Text(
        label,
        color = Color(0xFF704000),
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(Color(0xFFFFF1D8))
            .padding(horizontal = 12.dp, vertical = 6.dp),
    )
}

@Composable
private fun SystemResourceBar(title: String, ratio: Double, tint: Color) {
    DarkPortalCard {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(title, color = portalMuted(), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                Text("${(ratio * 100).toInt()}%", color = tint, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            }
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(50))
                    .background(Color.Black.copy(alpha = 0.25f)),
            ) {
                Box(
                    Modifier
                        .fillMaxWidth(ratio.toFloat().coerceIn(0.02f, 1f))
                        .height(8.dp)
                        .clip(RoundedCornerShape(50))
                        .background(tint),
                )
            }
        }
    }
}

@Composable
private fun SystemLogListRow(log: SystemLogRow) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            Modifier
                .size(12.dp)
                .clip(CircleShape)
                .background(logLevelColor(log.level))
                .padding(top = 4.dp),
        )
        Column(Modifier.weight(1f)) {
            Text(log.message ?: "System log", color = portalText(), fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(listOfNotNull(log.source ?: "system", log.metadata?.toString()).filter { it.isNotBlank() }.joinToString(" · "), color = portalMuted(), fontSize = 12.sp)
            Text(log.created_at?.take(16)?.replace('T', ' ') ?: "", color = portalMuted(), fontSize = 12.sp)
        }
    }
}

private fun filteredAdminBusinesses(items: List<AdminBusinessRow>, filter: String): List<AdminBusinessRow> = items.filter {
    when (filter) {
        "Đã duyệt" -> normalizeBusinessStatus(it) == "active"
        "Từ chối" -> normalizeBusinessStatus(it) == "suspended"
        else -> normalizeBusinessStatus(it) == "pending"
    }
}

private fun normalizeBusinessStatus(biz: AdminBusinessRow): String = (biz.status ?: "pending").lowercase(Locale.ROOT)

private fun businessStatusLabel(biz: AdminBusinessRow): String = when (normalizeBusinessStatus(biz)) {
    "active" -> "Đã duyệt"
    "suspended" -> "Từ chối"
    else -> "Chờ duyệt"
}

private fun filteredSystemLogs(items: List<SystemLogRow>, filter: String): List<SystemLogRow> = items.filter {
    when (filter) {
        "Error" -> it.level == "error"
        "Warning" -> it.level == "warning"
        "Info" -> it.level != "error" && it.level != "warning"
        else -> true
    }
}

private fun aiLogRatio(logs: List<SystemLogRow>): Double {
    if (logs.isEmpty()) return 0.0
    val count = logs.count { listOf(it.source, it.message).any { s -> s?.contains("api", true) == true || s?.contains("ai", true) == true || s?.contains("gemini", true) == true } }
    return count.toDouble() / logs.size.toDouble()
}

private fun dbLogRatio(logs: List<SystemLogRow>): Double {
    if (logs.isEmpty()) return 0.0
    val count = logs.count { listOf(it.source, it.message).any { s -> s?.contains("db", true) == true || s?.contains("database", true) == true || s?.contains("supabase", true) == true } }
    return count.toDouble() / logs.size.toDouble()
}

private fun logLevelColor(level: String?): Color = when (level) {
    "error" -> Color(0xFFFF4D4D)
    "warning" -> Color(0xFFFFA51F)
    "success" -> PortalGreen
    else -> Color(0xFF42A5F5)
}

private fun relativePortalTime(raw: String?): String {
    return raw?.take(16)?.replace('T', ' ')?.let { "Gửi $it" } ?: "Chưa rõ thời gian"
}

private fun filteredAdminUsers(users: List<AdminUserRow>, query: String, filter: String): List<AdminUserRow> {
    val q = query.trim().lowercase(Locale.ROOT)
    return users.filter { user ->
        val filterMatches = when (filter) {
            "Active" -> user.status != "banned"
            "Banned" -> user.status == "banned"
            "Business" -> user.is_business
            else -> true
        }
        val queryMatches = q.isBlank() || listOf(user.display_name, user.email, user.phone, user.id)
            .filterNotNull()
            .any { it.lowercase(Locale.ROOT).contains(q) }
        filterMatches && queryMatches
    }
}

private fun formatPortalDate(raw: String?): String {
    val date = raw?.take(10) ?: return "—"
    val parts = date.split("-")
    return if (parts.size == 3) "${parts[2]}/${parts[1]}/${parts[0]}" else date
}

private fun ddmmyyyyToIso(raw: String): String {
    val trimmed = raw.trim()
    val parts = trimmed.split("/", "-")
    return if (parts.size == 3 && parts[2].length == 4) {
        "${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}"
    } else {
        trimmed
    }
}

private fun todayPortalDate(): String = LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))

private fun nextMonthPortalDate(): String = LocalDate.now().plusMonths(1).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))

private fun moneyDigits(raw: String): String = raw.filter { it.isDigit() }

private fun formatPortalDateTime(raw: String?): String {
    val date = formatPortalDate(raw)
    val time = raw?.drop(11)?.take(5).orEmpty()
    return if (time.isBlank()) date else "$date, $time"
}

private fun compactVnd(value: Double): String = when {
    value >= 1_000_000 -> "đ${"%.1f".format(value / 1_000_000)}M"
    value >= 1_000 -> "đ${"%.0f".format(value / 1_000)}K"
    else -> "đ${value.toInt()}"
}

private fun initials(name: String?): String {
    val parts = (name ?: "User").trim().split(Regex("\\s+")).filter { it.isNotBlank() }
    return parts.take(2).mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("").ifBlank { "U" }
}

@Composable
private fun PortalSectionButton(label: String, selected: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(
            containerColor = if (selected) Color(0xFFE7E4FF) else Color.Transparent,
            contentColor = if (selected) PortalPurple else portalMuted(),
        ),
        shape = RoundedCornerShape(50),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp, vertical = 4.dp),
        modifier = Modifier
            .height(36.dp)
            .border(1.dp, if (selected) Color.Transparent else portalStroke(), RoundedCornerShape(50)),
    ) {
        Text(label, fontSize = 13.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun EmptyPortalText(text: String) {
    Text(text, color = portalMuted(), fontSize = 13.sp, modifier = Modifier.padding(vertical = 8.dp))
}

@Composable
private fun BusinessCampaignDialog(onDismiss: () -> Unit, onSave: (BusinessCampaignCreate) -> Unit) {
    var name by remember { mutableStateOf("") }
    var target by remember { mutableStateOf("Cặp đôi") }
    var region by remember { mutableStateOf("Miền Nam") }
    var season by remember { mutableStateOf("") }
    var budget by remember { mutableStateOf("") }
    var start by remember { mutableStateOf(todayPortalDate()) }
    var end by remember { mutableStateOf(nextMonthPortalDate()) }
    var validationError by remember { mutableStateOf<String?>(null) }
    val budgetValue = moneyDigits(budget).toDoubleOrNull() ?: 0.0
    val estimateLow = (budgetValue / 240).toInt()
    val estimateHigh = (budgetValue / 145).toInt().coerceAtLeast(estimateLow)
    PortalInputDialog(
        title = "Tạo chiến dịch",
        onDismiss = onDismiss,
        onSave = {
            validationError = when {
                name.trim().isBlank() -> "Nhập tên chiến dịch."
                budgetValue <= 0 -> "Nhập ngân sách hợp lệ."
                start.trim().isBlank() || end.trim().isBlank() -> "Nhập thời gian chạy."
                else -> null
            }
            if (validationError != null) return@PortalInputDialog
            onSave(
                BusinessCampaignCreate(
                    name = name.trim(),
                    target_type = target,
                    region = region,
                    season = season,
                    budget_vnd = budgetValue,
                    starts_at = ddmmyyyyToIso(start),
                    ends_at = ddmmyyyyToIso(end),
                ),
            )
        },
    ) {
        validationError?.let { Text(it, color = PremiumColors.LogoutRed, fontSize = 12.sp) }
        PortalTextField("Tên chiến dịch", name, "Nhập tên chiến dịch...") { name = it }
        PortalChoiceGroup("Loại hình target", listOf("Cặp đôi", "Gia đình", "Solo", "Nhóm bạn"), target) { target = it }
        PortalChoiceGroup("Vùng địa lý", listOf("Miền Nam", "Miền Bắc", "Miền Trung", "Toàn quốc"), region) { region = it }
        PortalTextField("Mùa / dịp", season, "Ví dụ: Cuối tuần, hè, lễ...") { season = it }
        PortalTextField("Ngân sách (VNĐ)", budget, "Nhập ngân sách", KeyboardType.Number) { budget = it }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PortalTextField("Bắt đầu", start, "dd/mm/yyyy", modifier = Modifier.weight(1f)) { start = it }
            PortalTextField("Kết thúc", end, "dd/mm/yyyy", modifier = Modifier.weight(1f)) { end = it }
        }
        DarkPortalCard {
            Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Ước tính hiển thị", color = portalMuted(), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                Text("${NumberFormat.getNumberInstance(Locale("vi", "VN")).format(estimateLow)} - ${NumberFormat.getNumberInstance(Locale("vi", "VN")).format(estimateHigh)}", color = PortalGreen, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text("lượt / tháng · dựa trên ngân sách & target", color = portalMuted(), fontSize = 11.sp)
            }
        }
    }
}

@Composable
private fun BusinessVoucherDialog(onDismiss: () -> Unit, onSave: (BusinessVoucherCreate) -> Unit) {
    var code by remember { mutableStateOf("") }
    var title by remember { mutableStateOf("") }
    var discountType by remember { mutableStateOf("% phần trăm") }
    var discount by remember { mutableStateOf("") }
    var maxDiscount by remember { mutableStateOf("") }
    var audience by remember { mutableStateOf("User mới") }
    var limit by remember { mutableStateOf("") }
    var start by remember { mutableStateOf(todayPortalDate()) }
    var end by remember { mutableStateOf(nextMonthPortalDate()) }
    var validationError by remember { mutableStateOf<String?>(null) }
    val apiDiscountType = when (discountType) {
        "Số tiền cố định" -> "fixed"
        "Miễn phí" -> "free"
        else -> "percent"
    }
    val apiAudience = when (audience) {
        "Tất cả user" -> "all"
        "User premium" -> "premium"
        else -> "new_user"
    }
    PortalInputDialog(
        title = "Tạo voucher",
        onDismiss = onDismiss,
        onSave = {
            val discountValue = moneyDigits(discount).toDoubleOrNull() ?: 0.0
            validationError = when {
                code.trim().isBlank() -> "Nhập mã voucher."
                title.trim().isBlank() -> "Nhập tên voucher."
                discountValue <= 0.0 && apiDiscountType != "free" -> "Nhập giá trị giảm hợp lệ."
                start.trim().isBlank() || end.trim().isBlank() -> "Nhập thời hạn voucher."
                else -> null
            }
            if (validationError != null) return@PortalInputDialog
            onSave(
                BusinessVoucherCreate(
                    code = code.trim().uppercase(Locale.ROOT),
                    title = title.trim(),
                    discount_type = apiDiscountType,
                    discount_value = discountValue,
                    max_discount_vnd = moneyDigits(maxDiscount).toDoubleOrNull(),
                    audience = apiAudience,
                    usage_limit = limit.toIntOrNull(),
                    valid_from = ddmmyyyyToIso(start),
                    valid_until = ddmmyyyyToIso(end),
                ),
            )
        },
    ) {
        validationError?.let { Text(it, color = PremiumColors.LogoutRed, fontSize = 12.sp) }
        PortalTextField("Mã voucher", code, "Nhập mã voucher") { code = it }
        PortalTextField("Tên voucher", title, "Ví dụ: Giảm 20% cuối tuần") { title = it }
        PortalChoiceGroup("Loại giảm giá", listOf("% phần trăm", "Số tiền cố định", "Miễn phí"), discountType) { discountType = it }
        PortalTextField("Giá trị giảm", discount, "Nhập giá trị", KeyboardType.Number) { discount = it }
        PortalTextField("Giảm tối đa", maxDiscount, "Tuỳ chọn", KeyboardType.Number) { maxDiscount = it }
        PortalChoiceGroup("Điều kiện áp dụng", listOf("User mới", "Tất cả user", "User premium"), audience) { audience = it }
        PortalTextField("Số lượt tối đa", limit, "Tuỳ chọn", KeyboardType.Number) { limit = it }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PortalTextField("Bắt đầu", start, "dd/mm/yyyy", modifier = Modifier.weight(1f)) { start = it }
            PortalTextField("Kết thúc", end, "dd/mm/yyyy", modifier = Modifier.weight(1f)) { end = it }
        }
    }
}

@Composable
private fun BusinessLocationDialog(onDismiss: () -> Unit, onSave: (BusinessLocationCreate) -> Unit) {
    var name by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("Chi nhánh") }
    PortalInputDialog(
        title = "Thêm địa điểm",
        onDismiss = onDismiss,
        onSave = { onSave(BusinessLocationCreate(name.trim(), address.trim(), category.trim())) },
    ) {
        PortalTextField("Tên địa điểm", name) { name = it }
        PortalTextField("Địa chỉ", address) { address = it }
        PortalTextField("Loại hình", category) { category = it }
    }
}

@Composable
private fun ReviewReplyDialog(onDismiss: () -> Unit, onSave: (String) -> Unit) {
    var reply by remember { mutableStateOf("") }
    PortalInputDialog(
        title = "Phản hồi đánh giá",
        onDismiss = onDismiss,
        onSave = { onSave(reply.trim()) },
    ) {
        PortalTextField("Nội dung phản hồi", reply) { reply = it }
    }
}

@Composable
private fun BusinessMediaDialog(onDismiss: () -> Unit, onSave: (BusinessMediaCreate) -> Unit) {
    var url by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("Ảnh") }
    var validationError by remember { mutableStateOf<String?>(null) }
    PortalInputDialog(
        title = "Thêm media",
        onDismiss = onDismiss,
        onSave = {
            if (url.trim().isBlank()) {
                validationError = "Nhập URL ảnh/video."
                return@PortalInputDialog
            }
            onSave(BusinessMediaCreate(url = url.trim(), type = if (type == "Video") "video" else "image"))
        },
    ) {
        validationError?.let { Text(it, color = PremiumColors.LogoutRed, fontSize = 12.sp) }
        PortalTextField("URL ảnh/video", url, "https://...") { url = it }
        PortalChoiceGroup("Loại", listOf("Ảnh", "Video"), type) { type = it }
    }
}

private fun mediaStatusLabel(status: String?): String = when (status?.lowercase(Locale.ROOT)) {
    "approved" -> "Đã duyệt"
    "rejected" -> "Bị từ chối"
    else -> "Chờ duyệt"
}

@Composable
private fun BusinessMediaCard(media: BusinessMediaRow) {
    DarkPortalCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    (if (media.type == "video") "🎬 " else "🖼 ") + (media.url),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = PremiumColors.Ink,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                media.rejection_reason?.takeIf { it.isNotBlank() }?.let {
                    Text("Lý do: $it", fontSize = 11.sp, color = PremiumColors.LogoutRed)
                }
            }
            BusinessStatusPill(mediaStatusLabel(media.status))
        }
    }
}

@Composable
private fun BusinessTransactionRow(tx: PlatformTransaction) {
    DarkPortalCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(tx.description ?: tx.kind ?: "Giao dịch", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = PremiumColors.Ink)
                Text(
                    "${tx.kind ?: "-"} · ${tx.created_at?.take(10) ?: ""}",
                    fontSize = 11.sp,
                    color = portalMuted(),
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(compactVnd(tx.net_amount ?: tx.gross_amount ?: 0.0), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = PortalGreen)
                Text(tx.status ?: "", fontSize = 11.sp, color = portalMuted())
            }
        }
    }
}

@Composable
private fun BusinessPayoutRow(payout: PayoutRecord) {
    DarkPortalCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(compactVnd(payout.amount ?: 0.0), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = PremiumColors.Ink)
                Text(payout.created_at?.take(10) ?: "", fontSize = 11.sp, color = portalMuted())
            }
            BusinessStatusPill(payoutStatusLabel(payout.status))
        }
    }
}

private fun portalQrBitmap(content: String): android.graphics.Bitmap? = runCatching {
    val size = 600
    val matrix = com.google.zxing.qrcode.QRCodeWriter().encode(content, com.google.zxing.BarcodeFormat.QR_CODE, size, size)
    val bmp = android.graphics.Bitmap.createBitmap(size, size, android.graphics.Bitmap.Config.RGB_565)
    for (x in 0 until size) for (y in 0 until size) {
        bmp.setPixel(x, y, if (matrix[x, y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
    }
    bmp
}.getOrNull()

@Composable
private fun AdPackagePaymentOverlay(
    info: com.wandertale.mobile.data.model.AdPurchaseResponse,
    onDone: () -> Unit,
    onCancel: () -> Unit,
) {
    val context = LocalContext.current
    AlertDialog(
        onDismissRequest = onCancel,
        confirmButton = {
            TextButton(onClick = onDone) { Text("Đã thanh toán", fontWeight = FontWeight.Bold) }
        },
        dismissButton = {
            TextButton(onClick = onCancel) { Text("Huỷ", color = PremiumColors.LogoutRed) }
        },
        title = { Text("Thanh toán gói quảng cáo", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                info.qr_code?.let { qr ->
                    portalQrBitmap(qr)?.let { bmp ->
                        Image(bmp.asImageBitmap(), contentDescription = "QR thanh toán",
                            modifier = Modifier.size(200.dp).clip(RoundedCornerShape(12.dp)).background(Color.White).padding(8.dp))
                    }
                }
                info.account_number?.let { Row(Modifier.fillMaxWidth()) { Text("Số tài khoản", fontSize = 13.sp, color = portalMuted(), modifier = Modifier.weight(1f)); Text(it, fontSize = 14.sp, fontWeight = FontWeight.SemiBold) } }
                info.account_name?.let { Row(Modifier.fillMaxWidth()) { Text("Chủ tài khoản", fontSize = 13.sp, color = portalMuted(), modifier = Modifier.weight(1f)); Text(it, fontSize = 14.sp, fontWeight = FontWeight.SemiBold) } }
                Row(Modifier.fillMaxWidth()) { Text("Số tiền", fontSize = 13.sp, color = portalMuted(), modifier = Modifier.weight(1f)); Text(formatPlatformVnd(info.amount), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = PortalGreen) }
                info.transfer_content?.let { Row(Modifier.fillMaxWidth()) { Text("Nội dung CK", fontSize = 13.sp, color = portalMuted(), modifier = Modifier.weight(1f)); Text(it, fontSize = 14.sp, fontWeight = FontWeight.SemiBold) } }
                Text("Quét QR hoặc chuyển khoản. Gói sẽ kích hoạt sau khi nhận tiền.", fontSize = 12.sp, color = portalMuted())
                info.checkout_url?.let { url ->
                    TextButton(onClick = { context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))) }) {
                        Text("Mở trang PayOS", fontSize = 12.sp)
                    }
                }
            }
        },
    )
}

private fun payoutStatusLabel(status: String?): String = when (status?.lowercase(Locale.ROOT)) {
    "paid" -> "Đã chi trả"
    "processing" -> "Đang xử lý"
    "scheduled" -> "Đã lên lịch"
    "failed" -> "Thất bại"
    "cancelled" -> "Đã huỷ"
    else -> "Chờ chi trả"
}

@Composable
private fun AdminMediaModerationCard(
    media: BusinessMediaRow,
    onApprove: () -> Unit,
    onReject: () -> Unit,
) {
    DarkPortalCard {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                (if (media.type == "video") "🎬 " else "🖼 ") + media.url,
                fontSize = 13.sp,
                color = PremiumColors.Ink,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                BusinessStatusPill(mediaStatusLabel(media.status))
                Spacer(Modifier.weight(1f))
                if (media.status == "pending") {
                    Text(
                        "Từ chối",
                        color = PremiumColors.LogoutRed,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.clickable(onClick = onReject).padding(horizontal = 10.dp, vertical = 4.dp),
                    )
                    Text(
                        "Duyệt",
                        color = PortalGreen,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.clickable(onClick = onApprove).padding(horizontal = 10.dp, vertical = 4.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun AdminPayoutRow(payout: PayoutRecord, onProcess: () -> Unit) {
    DarkPortalCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(compactVnd(payout.amount ?: 0.0), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = PremiumColors.Ink)
                Text("Business ${payout.business_id?.take(8) ?: "-"} · ${payout.created_at?.take(10) ?: ""}", fontSize = 11.sp, color = portalMuted())
            }
            val canProcess = payout.status == "pending" || payout.status == "scheduled" || payout.status == "failed"
            if (canProcess) {
                Text(
                    "Chi trả",
                    color = PortalGreen,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clickable(onClick = onProcess).padding(horizontal = 10.dp, vertical = 4.dp),
                )
            } else {
                BusinessStatusPill(payoutStatusLabel(payout.status))
            }
        }
    }
}

@Composable
private fun AdminAiRuleRow(rule: com.wandertale.mobile.data.model.AiRecommendationRule, onToggle: () -> Unit) {
    DarkPortalCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(rule.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = PremiumColors.Ink)
                Text(if (rule.status == "active") "Đang bật" else "Đang tắt", fontSize = 11.sp, color = portalMuted())
            }
            Text(
                if (rule.status == "active") "Tắt" else "Bật",
                color = if (rule.status == "active") PremiumColors.LogoutRed else PortalGreen,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.clickable(onClick = onToggle).padding(horizontal = 10.dp, vertical = 4.dp),
            )
        }
    }
}

@Composable
private fun PortalAccountMenuDialog(
    darkTheme: Boolean,
    accountInfo: AccountInfo?,
    businessName: String? = null,
    onDismiss: () -> Unit,
    onAccountInfo: () -> Unit,
    onToggleTheme: () -> Unit,
    onLogout: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {},
        title = { Text("Tài khoản") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    accountInfo?.displayName?.takeIf { it.isNotBlank() } ?: businessName ?: "Tài khoản",
                    fontWeight = FontWeight.Bold,
                )
                accountInfo?.email?.takeIf { it.isNotBlank() }?.let {
                    Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                }
                TextButton(onClick = onAccountInfo) { Text("Thông tin cá nhân") }
                TextButton(onClick = onToggleTheme) { Text(if (darkTheme) "Chuyển sang Light mode" else "Chuyển sang Dark mode") }
                TextButton(onClick = onLogout) { Text("Đăng xuất", color = PremiumColors.LogoutRed) }
            }
        },
    )
}

@Composable
private fun PortalAccountInfoDialog(
    accountInfo: AccountInfo?,
    businessName: String? = null,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onDismiss) { Text("Đóng") } },
        title = { Text("Thông tin cá nhân") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                PortalInfoLine("Tên", accountInfo?.displayName?.takeIf { it.isNotBlank() } ?: "—")
                PortalInfoLine("Email", accountInfo?.email?.takeIf { it.isNotBlank() } ?: "—")
                PortalInfoLine("Số điện thoại", accountInfo?.phone?.takeIf { it.isNotBlank() } ?: "—")
                businessName?.takeIf { it.isNotBlank() }?.let { PortalInfoLine("Doanh nghiệp", it) }
                val role = when {
                    accountInfo?.profile?.is_admin == true -> "Admin"
                    accountInfo?.profile?.is_business == true -> "Business"
                    else -> "User"
                }
                PortalInfoLine("Role", role)
            }
        },
    )
}

@Composable
private fun PortalInfoLine(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
        Text(value, fontWeight = FontWeight.Bold, textAlign = TextAlign.End, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun AdminCreateUserDialog(onDismiss: () -> Unit, onCreate: (AdminUserCreate) -> Unit) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isAdmin by remember { mutableStateOf(false) }
    var isBusiness by remember { mutableStateOf(false) }
    var isBanned by remember { mutableStateOf(false) }
    PortalInputDialog(
        title = "Thêm user",
        onDismiss = onDismiss,
        onSave = {
            onCreate(
                AdminUserCreate(
                    email = email.trim(),
                    password = password,
                    display_name = name.trim(),
                    is_admin = isAdmin,
                    is_business = isBusiness,
                    status = if (isBanned) "banned" else "active",
                ),
            )
        },
    ) {
        PortalTextField("Tên hiển thị", name) { name = it }
        PortalTextField("Email", email) { email = it }
        PortalTextField("Mật khẩu", password) { password = it }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PortalFilterChip("Admin", isAdmin) { isAdmin = !isAdmin }
            PortalFilterChip("Business", isBusiness) { isBusiness = !isBusiness }
            PortalFilterChip("Banned", isBanned) { isBanned = !isBanned }
        }
    }
}

@Composable
private fun AdminUserDetailDialog(
    detail: AdminUserDetail,
    onDismiss: () -> Unit,
    onToggleRole: () -> Unit,
    onToggleBan: () -> Unit,
) {
    Dialog(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(22.dp))
                .background(portalBg())
                .border(1.dp, portalStroke(), RoundedCornerShape(22.dp))
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("‹", color = portalText(), fontSize = 28.sp, modifier = Modifier.clickable(onClick = onDismiss))
                Spacer(Modifier.weight(1f))
                Text("Chi tiết user", color = portalText(), fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                Text("⋮", color = portalText(), fontSize = 24.sp)
            }
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(Color(0xFFE7E4FF))
                    .padding(20.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text(
                    initials(detail.display_name ?: detail.email),
                    color = PortalPurple,
                    fontSize = 26.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFA9A0E8))
                        .padding(top = 20.dp),
                )
                Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(detail.display_name ?: detail.email ?: detail.id, color = Color(0xFF33267D), fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Text(detail.email ?: "—", color = PortalPurple, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        RoleChip(if (detail.status == "banned") "Banned" else "Active", detail.status != "banned")
                        RoleChip(if (detail.is_business) "Business" else "User", true)
                    }
                }
            }
            PortalSectionTitle("THÔNG TIN")
            UserInfoRow("Ngày đăng ký", formatPortalDate(detail.created_at))
            UserInfoRow("Lần đăng nhập cuối", formatPortalDateTime(detail.last_login_at))
            UserInfoRow("Thiết bị", detail.last_device ?: "—")
            UserInfoRow("Tổng chuyến đi", "${detail.trip_count} chuyến")
            UserInfoRow("Role", if (detail.is_admin) "Admin" else if (detail.is_business) "Business" else "User")
            PortalSectionTitle("CHUYẾN ĐI GẦN NHẤT")
            if (detail.recent_trips.isEmpty()) {
                EmptyPortalText("User chưa có chuyến đi.")
            } else {
                detail.recent_trips.take(3).forEach { trip ->
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("⌖", color = PortalGreen, fontSize = 22.sp)
                        Column(Modifier.weight(1f)) {
                            Text(trip.destination ?: "Chuyến đi", color = portalText(), fontWeight = FontWeight.Bold)
                            Text("${formatPortalDate(trip.start_date)}-${formatPortalDate(trip.end_date)} · ${trip.people ?: 1} người", color = portalMuted(), fontSize = 12.sp)
                        }
                        RoleChip("AI trip", true)
                    }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(onClick = onToggleRole, modifier = Modifier.weight(1f)) {
                    Text(if (detail.is_business) "Thu hồi role" else "Đổi role")
                }
                Button(
                    onClick = onToggleBan,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = PortalDanger, contentColor = Color(0xFF8A1D1D)),
                ) {
                    Text(if (detail.status == "banned") "Mở ban" else "Ban user")
                }
            }
        }
    }
}

@Composable
private fun PortalInputDialog(
    title: String,
    onDismiss: () -> Unit,
    onSave: () -> Unit,
    content: @Composable ColumnScope.() -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onSave) { Text("Lưu") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Huỷ") } },
        title = { Text(title) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                content()
            }
        },
    )
}

@Composable
private fun PortalChoiceGroup(label: String, options: List<String>, selected: String, onSelect: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label, color = portalMuted(), fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { option ->
                PortalFilterChip(option, selected == option) { onSelect(option) }
            }
        }
    }
}

@Composable
private fun PortalTextField(
    label: String,
    value: String,
    placeholder: String = "",
    keyboardType: KeyboardType = KeyboardType.Text,
    modifier: Modifier = Modifier,
    onValueChange: (String) -> Unit,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        placeholder = if (placeholder.isNotBlank()) ({ Text(placeholder) }) else null,
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        modifier = modifier.fillMaxWidth(),
    )
}

@Composable
private fun PortalMetricCard(title: String, value: String, subtitle: String? = null, modifier: Modifier = Modifier) {
    DarkPortalCard(modifier = modifier) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, fontSize = 12.sp, color = portalMuted(), fontWeight = FontWeight.SemiBold)
            Text(value, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = portalText())
            subtitle?.let { Text(it, fontSize = 11.sp, color = PortalGreen) }
        }
    }
}

@Composable
private fun DarkPortalCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Box(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(portalCard())
            .border(1.dp, portalStroke(), RoundedCornerShape(14.dp)),
    ) {
        content()
    }
}

@Composable
private fun PortalTransactionCard(tx: PlatformTransaction, showCommission: Boolean) {
    PremiumSurfaceCard {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(tx.description ?: tx.kind ?: "Giao dịch", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(formatPlatformVnd(tx.net_amount), color = PremiumColors.Accent)
                if (showCommission && (tx.commission_amount ?: 0.0) > 0) {
                    Text("HH: ${formatPlatformVnd(tx.commission_amount)}", fontSize = 11.sp, color = PremiumColors.TextMuted)
                }
            }
            tx.created_at?.let {
                Text(it.take(16).replace('T', ' '), fontSize = 11.sp, color = PremiumColors.TextMuted)
            }
        }
    }
}

@Composable
private fun RoleChip(label: String, active: Boolean) {
    Text(
        label,
        fontSize = 11.sp,
        fontWeight = FontWeight.SemiBold,
        color = if (active) PortalGreen else portalMuted(),
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (active) Color(0xFFD8FFF0) else portalCard())
            .border(1.dp, if (active) Color.Transparent else portalStroke(), RoundedCornerShape(50))
            .padding(horizontal = 8.dp, vertical = 4.dp),
    )
}

private fun jsonElementText(el: kotlinx.serialization.json.JsonElement): String = when (el) {
    is JsonPrimitive -> when {
        el.isString -> el.content
        el.content == "true" -> "Bật"
        el.content == "false" -> "Tắt"
        else -> el.content
    }
    else -> el.toString()
}
