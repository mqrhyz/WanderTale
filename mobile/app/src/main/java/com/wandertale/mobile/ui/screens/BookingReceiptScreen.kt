package com.wandertale.mobile.ui.screens

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.wandertale.mobile.data.api.ApiClient
import com.wandertale.mobile.data.model.BookingRecord
import com.wandertale.mobile.ui.components.AppScaffold
import com.wandertale.mobile.ui.components.OrangeLoadingSpinner
import com.wandertale.mobile.ui.theme.PremiumColors
import com.wandertale.mobile.ui.theme.PremiumDesign
import com.wandertale.mobile.util.FormatUtils
import kotlinx.coroutines.launch

/**
 * Màn chi tiết đặt chỗ / hoá đơn: QR mã đặt chỗ, trạng thái, thông tin địa điểm,
 * doanh nghiệp, số tiền, phương thức thanh toán, metadata khách hàng.
 */
@Composable
fun BookingReceiptScreen(
    bookingId: String,
    onBack: () -> Unit,
) {
    var booking by remember { mutableStateOf<BookingRecord?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(bookingId) {
        scope.launch {
            runCatching { ApiClient.getBooking(bookingId) }
                .onSuccess { booking = it; error = null }
                .onFailure { error = it.message ?: "Không tải được chi tiết đặt chỗ" }
            loading = false
        }
    }

    AppScaffold(title = "Chi tiết đặt chỗ", onBack = onBack) { padding ->
        Box(
            modifier = padding
                .fillMaxSize()
                .padding(PremiumDesign.ScreenPadding),
            contentAlignment = Alignment.TopCenter,
        ) {
            when {
                loading && booking == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { OrangeLoadingSpinner() }
                error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(error!!, color = PremiumColors.LogoutRed, textAlign = TextAlign.Center)
                }
                booking != null -> ReceiptContent(booking!!)
            }
        }
    }
}

@Composable
private fun ReceiptContent(b: BookingRecord) {
    val scrollState = rememberScrollState()
    val qrContent = b.code ?: b.id.take(8).uppercase()

    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(scrollState),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // QR mã đặt chỗ
        qrBitmap(qrContent)?.let { bmp ->
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Image(
                    bmp.asImageBitmap(),
                    contentDescription = "Mã đặt chỗ",
                    modifier = Modifier
                        .size(180.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.White)
                        .padding(8.dp),
                )
                Text(
                    "Mã đặt chỗ: $qrContent",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = PremiumColors.Accent,
                )
            }
        }

        // Trạng thái
        BookingStatusPill(b.status ?: "")

        // Thông tin
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(PremiumColors.Surface)
                .border(1.dp, PremiumColors.Border, RoundedCornerShape(14.dp))
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(0.dp),
        ) {
            ReceiptInfoRow("Địa điểm", b.location_name ?: "—")
            ReceiptDivider()
            ReceiptInfoRow("Doanh nghiệp", b.business_name ?: "—")
            ReceiptDivider()
            ReceiptInfoRow("Số tiền", FormatUtils.formatVnd(b.total_amount))
            ReceiptDivider()
            ReceiptInfoRow("Phương thức", if (b.payment_mode == "pay_later") "Trả sau" else "Trả trước")
            ReceiptDivider()
            ReceiptInfoRow("Ngày đặt", b.created_at?.take(10) ?: "—")
        }

        Text(
            "Xuất trình mã QR này tại quầy để xác nhận đặt chỗ.",
            fontSize = 13.sp,
            color = PremiumColors.Muted,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 8.dp),
        )

        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun ReceiptInfoRow(label: String, value: String) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            label,
            fontSize = 13.sp,
            color = PremiumColors.TextMuted,
            modifier = Modifier.weight(1f),
        )
        Text(
            value,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = PremiumColors.Ink,
            textAlign = TextAlign.End,
        )
    }
}

@Composable
private fun ReceiptDivider() {
    Box(Modifier.fillMaxWidth().height(1.dp).background(PremiumColors.Border.copy(alpha = 0.5f)))
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
