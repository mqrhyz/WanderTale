package com.wandertale.mobile.ui.screens

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wandertale.mobile.data.api.ApiClient
import com.wandertale.mobile.data.model.BookingCreate
import com.wandertale.mobile.data.model.PublicBusinessRow
import com.wandertale.mobile.ui.components.AppScaffold
import com.wandertale.mobile.ui.components.OrangeLoadingSpinner
import com.wandertale.mobile.ui.components.PremiumSurfaceCard
import com.wandertale.mobile.ui.theme.PremiumColors
import com.wandertale.mobile.ui.theme.PremiumDesign
import kotlinx.coroutines.launch

/**
 * User booking + payment flow.
 * 1. List real active businesses (catalog) -> pick one.
 * 2. Enter amount -> create booking (pending_payment) -> pay.
 * 3. PayOS mode: open checkout URL in browser; poll booking status on return.
 *    Simulation mode: booking is marked paid immediately.
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
    var currentBookingId by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        runCatching { ApiClient.listBusinesses().items }
            .onSuccess { businesses = it }
            .onFailure { error = it.message }
        loading = false
    }

    AppScaffold(title = "Đặt chỗ & thanh toán", onBack = onBack) { padding ->
        when {
            loading -> Box(padding.fillMaxSize(), contentAlignment = Alignment.Center) { OrangeLoadingSpinner() }
            error != null -> Text(error!!, color = PremiumColors.LogoutRed, modifier = padding.padding(PremiumDesign.ScreenPadding))
            else -> LazyColumn(
                padding
                    .fillMaxSize()
                    .padding(horizontal = PremiumDesign.ScreenPadding, vertical = 12.dp),
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
                                        if (amt <= 0) {
                                            message = "Nhập số tiền hợp lệ."
                                            return@Button
                                        }
                                        scope.launch {
                                            working = true
                                            message = null
                                            runCatching {
                                                val booking = ApiClient.createBooking(
                                                    BookingCreate(business_id = biz.id, total_amount = amt, type = "other"),
                                                )
                                                currentBookingId = booking.id
                                                val pay = ApiClient.payBooking(booking.id)
                                                if (!pay.checkout_url.isNullOrBlank()) {
                                                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(pay.checkout_url)))
                                                    message = "Đang chuyển tới PayOS. Sau khi thanh toán, bấm 'Kiểm tra trạng thái'."
                                                } else {
                                                    message = "Thanh toán thành công (${pay.status})."
                                                }
                                            }.onFailure { message = it.message ?: "Không thể tạo thanh toán" }
                                            working = false
                                        }
                                    },
                                    enabled = !working,
                                    modifier = Modifier.fillMaxWidth().height(48.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = PremiumColors.Accent, contentColor = androidx.compose.ui.graphics.Color.White),
                                ) {
                                    Text(if (working) "Đang xử lý…" else "Thanh toán", fontWeight = FontWeight.Bold)
                                }
                                currentBookingId?.let { bid ->
                                    Button(
                                        onClick = {
                                            scope.launch {
                                                runCatching { ApiClient.getBooking(bid) }
                                                    .onSuccess { message = "Trạng thái booking: ${it.status}" }
                                                    .onFailure { message = it.message }
                                            }
                                        },
                                        modifier = Modifier.fillMaxWidth().height(44.dp),
                                        colors = ButtonDefaults.outlinedButtonColors(contentColor = PremiumColors.Accent),
                                    ) {
                                        Text("Kiểm tra trạng thái")
                                    }
                                }
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
                fontSize = 12.sp,
                color = PremiumColors.TextMuted,
            )
        }
        Text("★ ${"%.1f".format(biz.rating_avg ?: 0.0)}", fontSize = 12.sp, color = PremiumColors.Accent)
    }
}
