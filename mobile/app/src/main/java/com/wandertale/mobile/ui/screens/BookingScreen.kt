package com.wandertale.mobile.ui.screens

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.wandertale.mobile.data.api.ApiClient
import com.wandertale.mobile.data.model.BookingCreate
import com.wandertale.mobile.data.model.BookingPayResponse
import com.wandertale.mobile.data.model.PublicBusinessRow
import com.wandertale.mobile.ui.components.AppScaffold
import com.wandertale.mobile.ui.components.OrangeLoadingSpinner
import com.wandertale.mobile.ui.components.PremiumSurfaceCard
import com.wandertale.mobile.ui.theme.PremiumColors
import com.wandertale.mobile.ui.theme.PremiumDesign
import com.wandertale.mobile.util.FormatUtils
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * User booking + payment with IN-APP PayOS payment (VietQR + bank transfer).
 * Pick active business -> amount -> create booking -> pay -> show QR + account
 * info in-app -> poll booking status until paid.
 */
@Composable
fun BookingScreen(onBack: () -> Unit) {
    var businesses by remember { mutableStateOf<List<PublicBusinessRow>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var selected by remember { mutableStateOf<PublicBusinessRow?>(null) }
    var amount by remember { mutableStateOf("") }
    var working by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var bookingId by remember { mutableStateOf<String?>(null) }
    var payInfo by remember { mutableStateOf<BookingPayResponse?>(null) }
    var status by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        runCatching { ApiClient.listBusinesses().items }
            .onSuccess { businesses = it }
            .onFailure { error = it.message }
        loading = false
    }

    fun resetFlow() {
        payInfo = null; bookingId = null; status = null; amount = ""; selected = null; message = null
    }

    suspend fun pollOnce() {
        val id = bookingId ?: return
        runCatching { ApiClient.getBooking(id) }.onSuccess { status = it.status }
    }

    AppScaffold(title = "Đặt chỗ & thanh toán", onBack = onBack) { padding ->
        when {
            loading -> Box(padding.fillMaxSize(), contentAlignment = Alignment.Center) { OrangeLoadingSpinner() }
            error != null -> Text(error!!, color = PremiumColors.LogoutRed, modifier = padding.padding(PremiumDesign.ScreenPadding))
            payInfo != null -> {
                val info = payInfo!!
                val paid = status == "paid" || status == "confirmed"
                LaunchedEffect(info.booking_id) {
                    var n = 0
                    while (isActive && n < 150 && status != "paid" && status != "confirmed") {
                        delay(4000); pollOnce(); n++
                    }
                }
                LazyColumn(
                    padding.fillMaxSize().padding(PremiumDesign.ScreenPadding),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    if (paid) {
                        item { Text("✅", fontSize = 44.sp) }
                        item { Text("Thanh toán thành công", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = PremiumColors.Ink) }
                        item { Text("Booking đã được xác nhận.", fontSize = 14.sp, color = PremiumColors.Muted) }
                        item {
                            Button(onClick = { resetFlow() }, modifier = Modifier.fillMaxWidth().height(48.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = PremiumColors.Accent, contentColor = Color.White)) {
                                Text("Xong", fontWeight = FontWeight.Bold)
                            }
                        }
                    } else {
                        item { Text("Quét QR hoặc chuyển khoản để thanh toán", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = PremiumColors.Ink) }
                        info.qr_code?.let { qr ->
                            item {
                                qrBitmap(qr)?.let { bmp ->
                                    Image(bmp.asImageBitmap(), contentDescription = "QR thanh toán",
                                        modifier = Modifier.size(220.dp).clip(RoundedCornerShape(12.dp)).background(Color.White).padding(8.dp))
                                }
                            }
                        }
                        item {
                            PremiumSurfaceCard(Modifier.fillMaxWidth()) {
                                Column(Modifier.padding(PremiumDesign.CardPadding), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    infoLine("Số tiền", FormatUtils.formatVnd(info.amount))
                                    info.account_number?.let { infoLine("Số tài khoản", it) }
                                    info.account_name?.let { infoLine("Chủ tài khoản", it) }
                                    info.transfer_content?.let { infoLine("Nội dung CK", it) }
                                }
                            }
                        }
                        item {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                OrangeLoadingSpinner()
                                Text("Đang chờ thanh toán… tự cập nhật khi xong.", fontSize = 13.sp, color = PremiumColors.Muted)
                            }
                        }
                        item { TextButton(onClick = { scope.launch { pollOnce() } }) { Text("Kiểm tra ngay") } }
                        item { TextButton(onClick = { resetFlow() }) { Text("Huỷ", color = PremiumColors.LogoutRed) } }
                    }
                }
            }
            else -> LazyColumn(
                padding.fillMaxSize().padding(horizontal = PremiumDesign.ScreenPadding, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                message?.let { item { Text(it, fontSize = 13.sp, color = PremiumColors.Accent) } }
                if (businesses.isEmpty()) {
                    item { Text("Chưa có doanh nghiệp nào đang hoạt động để đặt chỗ.", fontSize = 14.sp, color = PremiumColors.TextMuted) }
                } else {
                    item { Text("Chọn doanh nghiệp", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = PremiumColors.Ink) }
                    items(businesses, key = { it.id }) { biz ->
                        BusinessPickRow(biz = biz, selected = selected?.id == biz.id) { selected = biz }
                    }
                }
                selected?.let { biz ->
                    item {
                        PremiumSurfaceCard(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(PremiumDesign.CardPadding), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text("Đặt chỗ tại ${biz.name ?: "doanh nghiệp"}", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = PremiumColors.Ink)
                                OutlinedTextField(
                                    value = amount,
                                    onValueChange = { v -> amount = v.filter { it.isDigit() } },
                                    label = { Text("Số tiền (VND)") },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    modifier = Modifier.fillMaxWidth(),
                                )
                                Button(
                                    onClick = {
                                        val amt = amount.toDoubleOrNull() ?: 0.0
                                        if (amt <= 0) { message = "Nhập số tiền hợp lệ."; return@Button }
                                        scope.launch {
                                            working = true; message = null
                                            runCatching {
                                                val booking = ApiClient.createBooking(BookingCreate(business_id = biz.id, total_amount = amt, type = "other"))
                                                bookingId = booking.id
                                                val pay = ApiClient.payBooking(booking.id)
                                                status = pay.status
                                                payInfo = pay
                                            }.onFailure { message = it.message ?: "Không thể tạo thanh toán" }
                                            working = false
                                        }
                                    },
                                    enabled = !working,
                                    modifier = Modifier.fillMaxWidth().height(48.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = PremiumColors.Accent, contentColor = Color.White),
                                ) { Text(if (working) "Đang tạo thanh toán…" else "Thanh toán", fontWeight = FontWeight.Bold) }
                            }
                        }
                    }
                }
                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }
}

@Composable
private fun infoLine(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(label, fontSize = 13.sp, color = PremiumColors.TextMuted, modifier = Modifier.weight(1f))
        Text(value, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = PremiumColors.Ink)
    }
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
private fun BusinessPickRow(biz: PublicBusinessRow, selected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) PremiumColors.AccentLight else PremiumColors.Surface)
            .border(1.dp, if (selected) PremiumColors.Accent else PremiumColors.Border, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(biz.name ?: "Doanh nghiệp", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = PremiumColors.Ink)
            Text(
                listOfNotNull(biz.business_type, biz.region).joinToString(" · ").ifBlank { "—" },
                fontSize = 12.sp, color = PremiumColors.TextMuted,
            )
        }
        Text("★ ${"%.1f".format(biz.rating_avg ?: 0.0)}", fontSize = 12.sp, color = PremiumColors.Accent)
    }
}
