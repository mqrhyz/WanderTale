package com.wandertale.mobile.ui.screens

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.wandertale.mobile.data.api.ApiClient
import com.wandertale.mobile.data.DashboardHomeCache
import com.wandertale.mobile.data.MyBookingsCache
import com.wandertale.mobile.data.model.BookingCreate
import com.wandertale.mobile.data.model.BookingPayResponse
import com.wandertale.mobile.data.model.LocationDetail
import com.wandertale.mobile.data.model.LocationReview
import com.wandertale.mobile.ui.components.AppScaffold
import com.wandertale.mobile.ui.components.OrangeLoadingSpinner
import com.wandertale.mobile.ui.theme.PremiumColors
import com.wandertale.mobile.util.FormatUtils
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun LocationDetailScreen(
    locationId: String,
    tripId: String?,
    onBack: () -> Unit,
    onOpenBooking: (String) -> Unit = {},
) {
    var detail by remember { mutableStateOf<LocationDetail?>(null) }
    var reviews by remember { mutableStateOf<List<LocationReview>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var showReview by remember { mutableStateOf(false) }
    var payResp by remember { mutableStateOf<BookingPayResponse?>(null) }
    var formMode by remember { mutableStateOf<String?>(null) }
    var paidLater by remember { mutableStateOf(false) }
    var working by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    suspend fun reload() {
        detail = runCatching { ApiClient.locationDetail(locationId) }.getOrNull()
        reviews = runCatching { ApiClient.locationReviews(locationId) }.getOrDefault(emptyList())
    }

    LaunchedEffect(locationId) {
        runCatching { reload() }.onFailure { error = it.message }
    }

    val d = detail
    AppScaffold(title = d?.name ?: "Địa điểm", onBack = onBack) { padding ->
        if (d == null) {
            Box(padding.fillMaxSize(), contentAlignment = Alignment.Center) {
                if (error != null) Text(error!!, color = PremiumColors.LogoutRed) else OrangeLoadingSpinner()
            }
            return@AppScaffold
        }
        val effectivePrice = d.voucher?.final_price_vnd ?: (d.price_vnd ?: 0.0)

        Column(
            padding
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            if (d.images.isNotEmpty()) {
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    d.images.forEach { url ->
                        AsyncImage(
                            model = url,
                            contentDescription = d.name,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.size(width = 260.dp, height = 180.dp).clip(RoundedCornerShape(14.dp)).background(PremiumColors.Surface),
                        )
                    }
                }
            }

            Text(d.name, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = PremiumColors.Ink)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (d.rating_count > 0) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Star, null, tint = Color(0xFFFFA51F), modifier = Modifier.size(15.dp))
                        Text(" %.1f (%d)".format(d.rating_avg, d.rating_count), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFFFFA51F))
                    }
                }
                d.category?.takeIf { it.isNotBlank() }?.let { Text(it, fontSize = 13.sp, color = PremiumColors.Muted) }
            }
            d.address?.takeIf { it.isNotBlank() }?.let { Text("📍 $it", fontSize = 13.sp, color = PremiumColors.Muted) }

            if ((d.price_vnd ?: 0.0) > 0) {
                Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (d.voucher != null) {
                        Text(FormatUtils.formatVnd(d.price_vnd), fontSize = 14.sp, color = PremiumColors.Muted, textDecoration = TextDecoration.LineThrough)
                        Text(FormatUtils.formatVnd(d.voucher.final_price_vnd), fontSize = 22.sp, fontWeight = FontWeight.Bold, color = PremiumColors.Accent)
                    } else {
                        Text(FormatUtils.formatVnd(d.price_vnd), fontSize = 22.sp, fontWeight = FontWeight.Bold, color = PremiumColors.Accent)
                    }
                }
            }

            d.description?.takeIf { it.isNotBlank() }?.let {
                Text("Giới thiệu", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = PremiumColors.Ink)
                Text(it, fontSize = 14.sp, color = PremiumColors.Ink)
            }

            if ((d.price_vnd ?: 0.0) > 0) {
                Button(
                    onClick = { formMode = "prepaid" },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PremiumColors.Accent, contentColor = Color.White),
                ) { Text("Đặt & thanh toán trước", fontWeight = FontWeight.Bold, fontSize = 16.sp) }
                OutlinedButton(
                    onClick = { formMode = "pay_later" },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                ) { Text("Đặt chỗ, trả sau", color = PremiumColors.Accent, fontWeight = FontWeight.SemiBold, fontSize = 16.sp) }
                if (d.vouchers.isNotEmpty()) {
                    Text("Có ưu đãi khi thanh toán trước — chọn mã ở bước thanh toán.", fontSize = 12.sp, color = PremiumColors.Muted)
                }
            }

            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("Đánh giá", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = PremiumColors.Ink)
                Spacer(Modifier.weight(1f))
                Text("Viết đánh giá", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = PremiumColors.Accent, modifier = Modifier.clickable { showReview = true })
            }
            if (reviews.isEmpty()) {
                Text("Chưa có đánh giá. Hãy là người đầu tiên!", fontSize = 13.sp, color = PremiumColors.Muted)
            } else {
                reviews.forEach { r ->
                    Column(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(PremiumColors.Surface).padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Row { repeat(5) { i -> Icon(Icons.Default.Star, null, tint = if (i < r.rating) Color(0xFFFFA51F) else PremiumColors.Border, modifier = Modifier.size(13.dp)) } }
                        r.comment?.takeIf { it.isNotBlank() }?.let { Text(it, fontSize = 14.sp, color = PremiumColors.Ink) }
                    }
                }
            }
            Spacer(Modifier.height(20.dp))
        }
    }

    if (showReview) {
        ReviewDialog(
            onDismiss = { showReview = false },
            onSubmit = { rating, comment ->
                scope.launch {
                    runCatching { ApiClient.createLocationReview(locationId, rating, comment) }
                    reload()
                    showReview = false
                }
            },
        )
    }

    val dd = detail
    if (formMode != null && dd != null) {
        BookingFormDialog(
            detail = dd,
            mode = formMode!!,
            tripId = tripId,
            defaultName = DashboardHomeCache.accountInfo?.displayName.orEmpty(),
            defaultPhone = DashboardHomeCache.accountInfo?.phone.orEmpty(),
            onDismiss = { formMode = null },
            onPay = { resp -> formMode = null; payResp = resp; MyBookingsCache.clear() },
            onPaidLater = { formMode = null; paidLater = true; MyBookingsCache.clear() },
        )
    }

    payResp?.let { resp ->
        BookingPaymentDialog(
            resp = resp,
            onOpenBooking = onOpenBooking,
            onDone = { payResp = null; scope.launch { reload() } },
        )
    }
    if (paidLater) {
        AlertDialog(
            onDismissRequest = { paidLater = false },
            confirmButton = { TextButton(onClick = { paidLater = false }) { Text("OK", color = PremiumColors.Accent) } },
            title = { Text("Đặt chỗ thành công", fontWeight = FontWeight.Bold) },
            text = { Text("Bạn đã đặt chỗ (trả sau). Vui lòng thanh toán tại địa điểm.") },
        )
    }
}

@Composable
private fun ReviewDialog(onDismiss: () -> Unit, onSubmit: (Int, String?) -> Unit) {
    var rating by remember { mutableStateOf(5) }
    var comment by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = { onSubmit(rating, comment.ifBlank { null }) }) { Text("Gửi", fontWeight = FontWeight.Bold, color = PremiumColors.Accent) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Huỷ") } },
        title = { Text("Viết đánh giá", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row { repeat(5) { i -> Icon(Icons.Default.Star, null, tint = if (i < rating) Color(0xFFFFA51F) else PremiumColors.Border, modifier = Modifier.size(28.dp).clickable { rating = i + 1 }) } }
                OutlinedTextField(value = comment, onValueChange = { comment = it }, placeholder = { Text("Cảm nhận của bạn…") }, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text))
            }
        },
    )
}

@Composable
private fun BookingPaymentDialog(
    resp: BookingPayResponse,
    onOpenBooking: (String) -> Unit,
    onDone: () -> Unit,
) {
    var activated by remember { mutableStateOf(false) }
    LaunchedEffect(resp.booking_id) {
        while (!activated) {
            delay(4000)
            val b = runCatching { ApiClient.getBooking(resp.booking_id) }.getOrNull()
            if (b?.status == "paid" || b?.status == "confirmed") { activated = true; break }
        }
    }
    AlertDialog(
        onDismissRequest = onDone,
        confirmButton = { TextButton(onClick = onDone) { Text(if (activated) "Xong" else "Đóng", fontWeight = FontWeight.Bold, color = PremiumColors.Accent) } },
        title = { Text(if (activated) "Thành công" else "Thanh toán đặt chỗ", fontWeight = FontWeight.Bold) },
        text = {
            if (activated) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF1B8E5A), modifier = Modifier.size(46.dp))
                    Text("Thanh toán thành công!", fontWeight = FontWeight.Bold)
                    TextButton(
                        onClick = { onOpenBooking(resp.booking_id); onDone() },
                    ) {
                        Text("Xem chi tiết đặt chỗ", color = PremiumColors.Accent, fontWeight = FontWeight.Bold)
                    }
                }
            } else {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    resp.qr_code?.let { qr ->
                        qrBitmap(qr)?.let { Image(it.asImageBitmap(), "QR", modifier = Modifier.size(200.dp).clip(RoundedCornerShape(12.dp)).background(Color.White).padding(8.dp)) }
                    }
                    resp.account_number?.let { Text("STK: $it", fontSize = 13.sp) }
                    Text("Số tiền: ${FormatUtils.formatVnd(resp.amount)}", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    resp.transfer_content?.let { Text("Nội dung: $it", fontSize = 13.sp) }
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = PremiumColors.Accent)
                        Text("Đang chờ xác nhận thanh toán…", fontSize = 13.sp, color = PremiumColors.Accent)
                    }
                }
            }
        },
    )
}

private fun qrBitmap(content: String): Bitmap? = runCatching {
    val size = 600
    val matrix = QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, size, size)
    val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565)
    for (x in 0 until size) for (y in 0 until size) {
        bmp.setPixel(x, y, if (matrix[x, y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
    }
    bmp
}.getOrNull()

@Composable
fun SponsoredLocationCard(loc: com.wandertale.mobile.data.model.SponsoredLocation, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(PremiumColors.Surface)
            .clickable(onClick = onClick)
            .padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AsyncImage(
            model = loc.image_url,
            contentDescription = loc.name,
            contentScale = ContentScale.Crop,
            modifier = Modifier.size(84.dp).clip(RoundedCornerShape(12.dp)).background(PremiumColors.Bg),
        )
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(loc.name, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = PremiumColors.Ink, maxLines = 1)
                Text("Tài trợ", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.clip(RoundedCornerShape(50)).background(PremiumColors.Accent).padding(horizontal = 6.dp, vertical = 2.dp))
            }
            loc.category?.takeIf { it.isNotBlank() }?.let { Text(it, fontSize = 12.sp, color = PremiumColors.Muted, maxLines = 1) }
            if (loc.rating_count > 0) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Star, null, tint = Color(0xFFFFA51F), modifier = Modifier.size(12.dp))
                    Text(" %.1f (%d)".format(loc.rating_avg, loc.rating_count), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFFFFA51F))
                }
            }
            if ((loc.price_vnd ?: 0.0) > 0) {
                Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (loc.voucher != null) {
                        Text(FormatUtils.formatVnd(loc.price_vnd), fontSize = 12.sp, color = PremiumColors.Muted, textDecoration = TextDecoration.LineThrough)
                        Text(FormatUtils.formatVnd(loc.voucher.final_price_vnd), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = PremiumColors.Accent)
                    } else {
                        Text(FormatUtils.formatVnd(loc.price_vnd), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = PremiumColors.Accent)
                    }
                }
            }
        }
    }
}

@Composable
fun BusinessNotificationsDialog(
    notifications: List<com.wandertale.mobile.data.model.BusinessNotification>,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onDismiss) { Text("Đóng", fontWeight = FontWeight.Bold, color = PremiumColors.Accent) } },
        title = { Text("Thông báo", fontWeight = FontWeight.Bold) },
        text = {
            if (notifications.isEmpty()) {
                Text("Chưa có thông báo.", fontSize = 14.sp, color = PremiumColors.Muted)
            } else {
                Column(
                    Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    notifications.forEach { n ->
                        val approved = n.type == "media" && n.status == "approved"
                        val rejected = n.type == "media" && n.status == "rejected"
                        val tint = when {
                            approved -> Color(0xFF1B8E5A)
                            rejected -> PremiumColors.LogoutRed
                            else -> PremiumColors.Accent
                        }
                        Row(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(PremiumColors.Surface).padding(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            Icon(
                                if (n.type == "media") Icons.Default.CheckCircle else Icons.Default.Star,
                                null, tint = tint, modifier = Modifier.size(22.dp),
                            )
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(n.title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = PremiumColors.Ink)
                                Text(n.message, fontSize = 12.sp, color = PremiumColors.Muted)
                            }
                        }
                    }
                }
            }
        },
    )
}

@Composable
private fun BookingFormDialog(
    detail: LocationDetail,
    mode: String,
    tripId: String?,
    defaultName: String,
    defaultPhone: String,
    onDismiss: () -> Unit,
    onPay: (BookingPayResponse) -> Unit,
    onPaidLater: () -> Unit,
) {
    val isPrepaid = mode == "prepaid"
    var name by remember { mutableStateOf(defaultName) }
    var phone by remember { mutableStateOf(defaultPhone) }
    var note by remember { mutableStateOf("") }
    var selectedVoucherId by remember { mutableStateOf(if (isPrepaid) detail.voucher?.id else null) }
    var working by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val selectedVoucher = if (isPrepaid) detail.vouchers.firstOrNull { it.id == selectedVoucherId } else null
    val finalPrice = selectedVoucher?.final_price_vnd ?: (detail.price_vnd ?: 0.0)
    val canSubmit = name.trim().isNotEmpty() && finalPrice > 0

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(
                enabled = canSubmit && !working,
                onClick = {
                    scope.launch {
                        working = true
                        val meta = buildMap {
                            put("customer_name", name.trim())
                            if (phone.isNotBlank()) put("phone", phone.trim())
                            if (note.isNotBlank()) put("note", note.trim())
                            selectedVoucher?.let { put("voucher_code", it.code) }
                        }
                        runCatching {
                            val created = ApiClient.createBooking(
                                BookingCreate(business_id = detail.business_id, total_amount = finalPrice, type = "location", trip_id = tripId, location_id = detail.id, currency = "VND", payment_mode = mode, metadata = meta)
                            )
                            if (isPrepaid) {
                                val pay = ApiClient.payBooking(created.id)
                                if (!pay.qr_code.isNullOrBlank() || !pay.checkout_url.isNullOrBlank()) onPay(pay) else onPaidLater()
                            } else onPaidLater()
                        }.onFailure { error = it.message }
                        working = false
                    }
                },
            ) { Text(if (isPrepaid) "Thanh toán ${FormatUtils.formatVnd(finalPrice)}" else "Xác nhận", fontWeight = FontWeight.Bold, color = PremiumColors.Accent) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Đóng") } },
        title = { Text(if (isPrepaid) "Thanh toán trước" else "Đặt chỗ, trả sau", fontWeight = FontWeight.Bold) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(detail.name, fontWeight = FontWeight.SemiBold, color = PremiumColors.Ink)
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Họ tên") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Số điện thoại") }, modifier = Modifier.fillMaxWidth(), singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone))
                OutlinedTextField(value = note, onValueChange = { note = it }, label = { Text("Ghi chú (tuỳ chọn)") }, modifier = Modifier.fillMaxWidth())

                if (isPrepaid && detail.vouchers.isNotEmpty()) {
                    Text("Chọn ưu đãi", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = PremiumColors.Ink)
                    VoucherRow(null, selectedVoucherId == null) { selectedVoucherId = null }
                    detail.vouchers.forEach { v -> VoucherRow(v, selectedVoucherId == v.id) { selectedVoucherId = v.id } }
                }

                Row(Modifier.fillMaxWidth()) {
                    Text("Tổng thanh toán", fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                    Text(FormatUtils.formatVnd(finalPrice), fontWeight = FontWeight.Bold, color = PremiumColors.Accent)
                }
                error?.let { Text(it, fontSize = 12.sp, color = PremiumColors.LogoutRed) }
            }
        },
    )
}

@Composable
private fun VoucherRow(v: com.wandertale.mobile.data.model.AppliedVoucher?, selected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp))
            .background(if (selected) PremiumColors.Accent.copy(alpha = 0.12f) else PremiumColors.Surface)
            .clickable(onClick = onClick).padding(10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(if (selected) Icons.Default.CheckCircle else Icons.Default.Star, null, tint = if (selected) PremiumColors.Accent else PremiumColors.Muted, modifier = Modifier.size(18.dp))
        Column(Modifier.weight(1f)) {
            Text(if (v == null) "Không dùng ưu đãi" else "${v.code} — ${v.title}", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = PremiumColors.Ink)
            if (v != null) Text("Giảm ${FormatUtils.formatVnd(v.discount_vnd)}", fontSize = 12.sp, color = PremiumColors.Accent)
        }
    }
}
