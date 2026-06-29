package com.wandertale.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Place
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DatePickerState
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wandertale.mobile.WanderTaleApp
import com.wandertale.mobile.data.api.ApiClient
import com.wandertale.mobile.data.model.GeocodeAutocompleteItem
import com.wandertale.mobile.data.model.TripGenerateRequest
import com.wandertale.mobile.data.model.TripPreferences
import com.wandertale.mobile.ui.components.AppScaffold
import com.wandertale.mobile.ui.components.ErrorText
import com.wandertale.mobile.ui.components.DashboardPageHeader
import com.wandertale.mobile.ui.components.PremiumAccentButton
import com.wandertale.mobile.ui.components.PremiumSurfaceCard
import com.wandertale.mobile.ui.components.premiumPressScale
import com.wandertale.mobile.ui.theme.PremiumColors
import com.wandertale.mobile.ui.theme.PremiumDesign
import com.wandertale.mobile.util.ACCOMMODATION_OPTIONS
import com.wandertale.mobile.util.AccommodationOption
import com.wandertale.mobile.util.FormatUtils
import com.wandertale.mobile.util.PACE_DESCRIPTIONS
import com.wandertale.mobile.util.PACE_OPTIONS
import com.wandertale.mobile.util.PREFERENCE_OPTIONS
import com.wandertale.mobile.util.defaultPlannerEndDate
import com.wandertale.mobile.util.defaultPlannerStartDate
import com.wandertale.mobile.util.formatPlannerDateRange
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit
import java.util.Locale
import android.content.res.Configuration

private val fieldShape = RoundedCornerShape(PremiumDesign.InputRadius)
private val chipShape = RoundedCornerShape(PremiumDesign.ButtonRadius)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun TripPlannerScreen(
    onBack: (() -> Unit)? = null,
    onCreated: (String) -> Unit,
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(0.dp),
    tabLayout: Boolean = false,
) {
    var destination by remember { mutableStateOf("Đà Lạt") }
    var startDate by remember { mutableStateOf(defaultPlannerStartDate()) }
    var endDate by remember { mutableStateOf(defaultPlannerEndDate()) }
    var budget by remember { mutableStateOf("5000000") }
    var travelers by remember { mutableStateOf("2") }
    var pace by remember { mutableStateOf("balanced") }
    var accommodationStyle by remember { mutableStateOf("standard") }
    val selectedTags = remember { mutableStateListOf("nature", "food", "culture") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    var showDatePicker by remember { mutableStateOf(false) }
    var pickingStart by remember { mutableStateOf(true) }

    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    val haptic = LocalHapticFeedback.current
    val hasValidDates = startDate.matches(Regex("\\d{4}-\\d{2}-\\d{2}")) &&
        endDate.matches(Regex("\\d{4}-\\d{2}-\\d{2}")) &&
        endDate >= startDate
    val budgetAmount = budget.toLongOrNull() ?: 0L
    val travelerCount = travelers.toIntOrNull()?.coerceIn(1, 10) ?: 1
    val tripDayCount = remember(startDate, endDate, hasValidDates) {
        if (!hasValidDates) 0
        else ChronoUnit.DAYS.between(LocalDate.parse(startDate), LocalDate.parse(endDate)).toInt() + 1
    }
    val isFormValid = destination.trim().length >= 2 &&
        hasValidDates &&
        budgetAmount > 0 &&
        travelerCount >= 1

    val initialPickerMillis = remember(pickingStart, startDate, endDate, showDatePicker) {
        val iso = if (pickingStart) startDate else endDate
        LocalDate.parse(iso).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
    }

    fun validate(): Boolean {
        error = when {
            destination.trim().length < 2 -> "Nhập điểm đến (≥ 2 ký tự)."
            !hasValidDates -> "Chọn ngày đi hợp lệ."
            budgetAmount <= 0 -> "Nhập ngân sách hợp lệ."
            travelerCount < 1 -> "Số người tối thiểu 1."
            else -> null
        }
        if (error != null) {
            scope.launch { listState.animateScrollToItem(0) }
        }
        return error == null
    }

    fun buildGenerateRequest(): TripGenerateRequest {
        return TripGenerateRequest(
            destination = destination.trim(),
            start_date = startDate,
            end_date = endDate,
            budget = budgetAmount.toDouble(),
            preferences = TripPreferences(selectedTags.toList()),
            travelers = travelerCount,
            pace = pace,
            accommodation_style = accommodationStyle,
            enrich_pricing = true,
            rooms = maxOf(1, (travelerCount + 1) / 2),
        )
    }

    val submitTrip: () -> Unit = {
        if (validate()) {
            loading = true
            scope.launch {
                runCatching {
                    WanderTaleApp.instance.tripRepository.generate(buildGenerateRequest())
                }.onSuccess { onCreated(it.trip.id) }
                    .onFailure { err -> error = err.message }
                loading = false
            }
        }
    }

    val plannerContent: @Composable (Modifier) -> Unit = { listModifier ->
        LazyColumn(
            state = listState,
            modifier = listModifier
                .fillMaxSize()
                .imePadding()
                .padding(horizontal = PremiumDesign.ScreenPadding, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(
                top = if (tabLayout) 0.dp else contentPadding.calculateTopPadding(),
                bottom = contentPadding.calculateBottomPadding() + if (tabLayout) 150.dp else 24.dp,
            ),
        ) {
            item {
                PlannerSectionCard(title = "Thông tin chung") {
                    DestinationAutocompleteField(
                        value = destination,
                        onValueChange = { destination = it },
                        label = "Điểm đến",
                        placeholder = "Bạn muốn đến đâu?",
                    )
                    Spacer(Modifier.height(12.dp))
                    PlannerField(
                        value = formatPlannerDateRange(startDate, endDate),
                        onValueChange = {},
                        label = "Ngày đi",
                        readOnly = true,
                        leadingIcon = Icons.Default.CalendarMonth,
                        onClick = {
                            pickingStart = true
                            showDatePicker = true
                        },
                    )
                    Spacer(Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        PlannerField(
                            value = formatBudgetDisplay(budget),
                            onValueChange = { budget = it.filter { c -> c.isDigit() } },
                            label = "Ngân sách (VND)",
                            keyboardType = KeyboardType.Number,
                            modifier = Modifier.weight(3f),
                        )
                        TravelerStepper(
                            value = travelerCount,
                            onChange = { travelers = it.toString() },
                            modifier = Modifier.weight(2f),
                        )
                    }
                    if (budgetAmount > 0) {
                        Spacer(Modifier.height(8.dp))
                        BudgetRangeHint(budgetAmount)
                    }
                }
            }

            item {
                PlannerSectionCard(title = "Sở thích") {
                    Text(
                        "Bạn thích gì?",
                        color = PremiumColors.TextMuted,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 0.5.sp,
                    )
                    Spacer(Modifier.height(10.dp))
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        PREFERENCE_OPTIONS.forEach { (value, label) ->
                            PreferenceChip(
                                label = label,
                                tag = value,
                                selected = value in selectedTags,
                                onClick = {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    if (value in selectedTags) selectedTags.remove(value)
                                    else selectedTags.add(value)
                                },
                            )
                        }
                    }
                }
            }

            item {
                PlannerSectionCard(title = "Nhịp độ") {
                    Text(
                        "Nhịp độ hành trình",
                        color = PremiumColors.TextMuted,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 0.5.sp,
                    )
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PACE_OPTIONS.forEach { (value, label) ->
                            PaceChip(
                                value = value,
                                label = label,
                                description = PACE_DESCRIPTIONS[value].orEmpty(),
                                selected = pace == value,
                                onClick = {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    pace = value
                                },
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }
            }

            item {
                PlannerSectionCard(title = "Phong cách lưu trú") {
                    Text(
                        "AI chọn khách sạn phù hợp ngân sách",
                        color = PremiumColors.TextMuted,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 0.5.sp,
                    )
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        ACCOMMODATION_OPTIONS.forEach { option ->
                            AccommodationCard(
                                option = option,
                                selected = accommodationStyle == option.id,
                                onClick = {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    accommodationStyle = option.id
                                },
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }
            }

            error?.let { item { ErrorText(it) } }

            if (onBack != null && !tabLayout) {
                item {
                    PlannerCreateFooter(
                        loading = loading,
                        enabled = isFormValid,
                        onClick = submitTrip,
                    )
                }
            }
        }
    }

    when {
        tabLayout && onBack != null -> {
            Column(modifier.fillMaxSize()) {
                PlannerTabTopBar(onBack = onBack)
                Box(Modifier.weight(1f)) {
                    plannerContent(Modifier.fillMaxSize())
                    Column(
                        Modifier
                            .align(Alignment.BottomCenter)
                            .fillMaxWidth()
                            .background(PremiumColors.Surface)
                            .navigationBarsPadding()
                            .padding(PremiumDesign.CardPadding),
                    ) {
                        PlannerCreateFooter(
                            loading = loading,
                            enabled = isFormValid,
                            onClick = submitTrip,
                            buttonText = "Tạo chuyến đi ✦",
                        )
                    }
                }
            }
        }
        onBack != null -> {
            AppScaffold(title = "WanderTale Plan Trip", onBack = onBack) { contentModifier ->
                plannerContent(modifier.then(contentModifier))
            }
        }
        else -> {
            Column(Modifier.fillMaxSize()) {
                FixedPlannerHeader(
                    title = "WanderTale Plan Trip",
                    description = "AI gợi ý lịch trình, khách sạn và hoạt động theo ngân sách.",
                    contentPadding = contentPadding,
                )
                Box(Modifier.weight(1f)) {
                    plannerContent(
                        modifier.padding(bottom = 100.dp),
                    )
                    Column(
                        Modifier
                            .align(Alignment.BottomCenter)
                            .fillMaxWidth()
                            .background(PremiumColors.Surface)
                            .navigationBarsPadding()
                            .padding(PremiumDesign.CardPadding),
                    ) {
                        PlannerCreateFooter(
                            loading = loading,
                            enabled = isFormValid,
                            onClick = submitTrip,
                            buttonText = "Tạo chuyến đi ✦",
                        )
                    }
                }
            }
        }
    }

    if (showDatePicker) {
        TripDatePickerDialog(
            pickingStart = pickingStart,
            initialSelectedDateMillis = initialPickerMillis,
            onDismiss = { showDatePicker = false },
            onConfirm = { picked ->
                if (pickingStart) {
                    startDate = picked
                    if (endDate < startDate) endDate = picked
                    pickingStart = false
                } else {
                    endDate = picked
                    if (endDate < startDate) startDate = endDate
                    showDatePicker = false
                }
            },
        )
    }
}

@Composable
private fun FixedPlannerHeader(
    title: String,
    description: String,
    contentPadding: PaddingValues,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .background(PremiumColors.Surface)
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
private fun PlannerTabTopBar(onBack: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(PremiumColors.Bg)
            .statusBarsPadding()
            .padding(start = 4.dp, end = PremiumDesign.ScreenPadding, top = 4.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack) {
            Icon(
                Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Quay lại",
                tint = PremiumColors.Accent,
            )
        }
        Column(Modifier.weight(1f)) {
            Text(
                "WanderTale Plan Trip",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = PremiumColors.Ink,
                lineHeight = 24.sp,
            )
            Text(
                "AI gợi ý lịch trình, khách sạn và hoạt động theo ngân sách.",
                fontSize = 13.sp,
                color = PremiumColors.TextMuted,
                lineHeight = 18.sp,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
    }
}

@Composable
private fun PlannerSectionCard(
    title: String,
    trailing: @Composable () -> Unit = {},
    content: @Composable () -> Unit,
) {
    PremiumSurfaceCard {
        Column(Modifier.padding(PremiumDesign.CardPadding)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    title,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                trailing()
            }
            Spacer(Modifier.height(16.dp))
            content()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TripDatePickerDialog(
    pickingStart: Boolean,
    initialSelectedDateMillis: Long,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit,
) {
    key(if (pickingStart) "start" else "end") {
        val datePickerState = rememberDatePickerState(initialSelectedDateMillis = initialSelectedDateMillis)
        DatePickerDialog(
            onDismissRequest = onDismiss,
            confirmButton = {
                TextButton(
                    onClick = {
                        val millis = datePickerState.selectedDateMillis
                        if (millis != null) {
                            val picked = Instant.ofEpochMilli(millis)
                                .atZone(ZoneId.systemDefault())
                                .toLocalDate()
                                .toString()
                            onConfirm(picked)
                        } else {
                            onDismiss()
                        }
                    },
                ) { Text(if (pickingStart) "Tiếp" else "Xong") }
            },
            dismissButton = {
                TextButton(onClick = onDismiss) { Text("Huỷ") }
            },
        ) {
            Column(Modifier.padding(horizontal = 8.dp)) {
                Text(
                    if (pickingStart) "Chọn ngày đi" else "Chọn ngày về",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 18.sp,
                    modifier = Modifier.padding(start = 12.dp, bottom = 8.dp),
                )
                VietnameseDatePicker(state = datePickerState)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun VietnameseDatePicker(state: DatePickerState) {
    val viConfiguration = Configuration(LocalConfiguration.current).apply {
        setLocale(Locale("vi", "VN"))
    }
    CompositionLocalProvider(LocalConfiguration provides viConfiguration) {
        DatePicker(state = state)
    }
}

private val VIETNAM_DESTINATION_CITIES = listOf(
    "Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Đà Lạt", "Nha Trang",
    "Phú Quốc", "Hội An", "Huế", "Sa Pa", "Hạ Long",
    "Vũng Tàu", "Mũi Né", "Cần Thơ", "Biên Hòa", "Bình Dương",
    "Buôn Ma Thuột", "Pleiku", "Quy Nhơn", "Tuy Hòa", "Ninh Bình",
    "Tam Đảo", "Hải Phòng", "Lào Cai", "Điện Biên Phủ", "Côn Đảo",
    "Phan Thiết", "Long An", "Bà Rịa - Vũng Tàu", "Khánh Hòa", "Lâm Đồng",
    "Bình Định", "Phú Yên", "Gia Lai", "Đắk Lắk", "Bình Thuận",
    "Ninh Thuận", "Bình Phước", "Tây Ninh", "Đồng Nai", "Tiền Giang",
    "Bến Tre", "Vĩnh Long", "Trà Vinh", "Sóc Trăng", "Bạc Liêu",
    "Cà Mau", "An Giang", "Kiên Giang", "Hậu Giang", "Đồng Tháp",
)

private fun normalizeForSearch(text: String): String {
    val normalized = java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFD)
    return normalized
        .replace(Regex("\\p{InCombiningDiacriticalMarks}+"), "")
        .replace("đ", "d")
        .replace("Đ", "D")
        .lowercase()
        .replace(Regex("\\s+"), " ")
        .trim()
}

@Composable
private fun DestinationAutocompleteField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String? = null,
    modifier: Modifier = Modifier,
) {
    var suggestions by remember { mutableStateOf<List<GeocodeAutocompleteItem>>(emptyList()) }
    var showSuggestions by remember { mutableStateOf(false) }
    var suppressSearch by remember { mutableStateOf(false) }
    var committedDestination by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(value, committedDestination) {
        if (suppressSearch) {
            suppressSearch = false
            return@LaunchedEffect
        }
        val q = value.trim()
        if (q.length < 2) {
            suggestions = emptyList()
            showSuggestions = false
            return@LaunchedEffect
        }
        if (committedDestination != null && q.equals(committedDestination, ignoreCase = true)) {
            suggestions = emptyList()
            showSuggestions = false
            return@LaunchedEffect
        }
        delay(150)
        if (q != value.trim()) return@LaunchedEffect
        val qNorm = normalizeForSearch(q)
        suggestions = VIETNAM_DESTINATION_CITIES
            .filter { city ->
                val cityNorm = normalizeForSearch(city)
                cityNorm.contains(qNorm) || qNorm.contains(cityNorm)
            }
            .take(6)
            .map { city ->
                GeocodeAutocompleteItem(
                    ref_id = "",
                    display = city,
                    name = city,
                    address = "",
                )
            }
        showSuggestions = suggestions.isNotEmpty()
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            label,
            color = PremiumColors.TextMuted,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(bottom = 6.dp),
        )
        OutlinedTextField(
            value = value,
            onValueChange = {
                if (committedDestination != null && !it.trim().equals(committedDestination, ignoreCase = true)) {
                    committedDestination = null
                }
                onValueChange(it)
                showSuggestions = true
            },
            placeholder = placeholder?.let { { Text(it, color = PremiumColors.TextMuted) } },
            leadingIcon = {
                Icon(Icons.Default.Place, null, tint = PremiumColors.Accent)
            },
            trailingIcon = null,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 52.dp),
            singleLine = true,
            shape = fieldShape,
            textStyle = MaterialTheme.typography.bodyLarge.copy(
                fontSize = 15.sp,
                lineHeight = 20.sp,
            ),
            colors = plannerFieldColors(),
        )
        AnimatedVisibility(
            visible = showSuggestions && suggestions.isNotEmpty(),
            enter = expandVertically(tween(180)),
            exit = shrinkVertically(tween(120)),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(PremiumColors.InputBg)
                    .border(1.dp, PremiumColors.Border, RoundedCornerShape(12.dp)),
            ) {
                suggestions.take(6).forEachIndexed { index, item ->
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                val picked = item.display.ifBlank { item.name }
                                suppressSearch = true
                                onValueChange(picked)
                                committedDestination = picked.trim()
                                showSuggestions = false
                                suggestions = emptyList()
                            }
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                    ) {
                        Text(
                            item.display,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = PremiumColors.Ink,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    if (index < suggestions.lastIndex && index < 5) {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .height(1.dp)
                                .background(PremiumColors.Border),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PlannerField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    readOnly: Boolean = false,
    leadingIcon: androidx.compose.ui.graphics.vector.ImageVector? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    onClick: (() -> Unit)? = null,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            label,
            color = PremiumColors.TextMuted,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(bottom = 6.dp),
        )
        Box(modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = value,
                onValueChange = onValueChange,
                readOnly = readOnly || onClick != null,
                placeholder = placeholder?.let { { Text(it, color = PremiumColors.TextMuted) } },
                leadingIcon = leadingIcon?.let {
                    {
                        Icon(
                            it,
                            null,
                            tint = PremiumColors.Accent,
                        )
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 52.dp),
                enabled = true,
                singleLine = true,
                shape = fieldShape,
                textStyle = MaterialTheme.typography.bodyLarge.copy(
                    fontSize = 15.sp,
                    lineHeight = 20.sp,
                ),
                keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
                colors = plannerFieldColors(),
            )
            if (onClick != null) {
                Box(
                    Modifier
                        .matchParentSize()
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                            onClick = onClick,
                        ),
                )
            }
        }
    }
}

@Composable
private fun plannerFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = PremiumColors.Accent,
    unfocusedBorderColor = PremiumColors.Border,
    focusedContainerColor = PremiumColors.InputBg,
    unfocusedContainerColor = PremiumColors.InputBg,
    focusedLabelColor = PremiumColors.Muted,
    unfocusedLabelColor = PremiumColors.TextMuted,
)

private fun plannerAiStatusMessages(destination: String): List<String> {
    val place = destination.ifBlank { "điểm đến của bạn" }
    return listOf(
        "Đang phân tích chuyến đi tại $place…",
        "Xem thời tiết từng ngày để sắp lịch hợp lý…",
        "Tìm khách sạn phù hợp ngân sách…",
        "Gợi ý địa điểm theo sở thích của bạn…",
        "Sắp xếp hoạt động từng ngày…",
        "Tối ưu nhịp độ và thời gian di chuyển…",
        "Hoàn thiện lịch trình cho bạn…",
    )
}

@Composable
private fun PlannerAiProgressCard(
    active: Boolean,
    destination: String,
) {
    val messages = remember(destination) { plannerAiStatusMessages(destination) }
    var displayed by remember { mutableStateOf("") }
    var showCursor by remember { mutableStateOf(true) }

    LaunchedEffect(active) {
        displayed = ""
        if (!active) return@LaunchedEffect
        var step = 0
        while (true) {
            val full = messages[step % messages.size]
            for (i in full.indices) {
                displayed = full.take(i + 1)
                delay(30)
            }
            delay(1500)
            step++
        }
    }

    LaunchedEffect(active) {
        if (!active) {
            showCursor = false
            return@LaunchedEffect
        }
        while (true) {
            showCursor = !showCursor
            delay(480)
        }
    }

    PremiumSurfaceCard {
        Row(
            Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(22.dp),
                color = PremiumColors.Accent,
                strokeWidth = 2.5.dp,
            )
            Column(Modifier.weight(1f)) {
                Text(
                    buildString {
                        append(displayed.ifBlank { "Đang chuẩn bị…" })
                        if (showCursor && active) append("▍")
                    },
                    fontWeight = FontWeight.Medium,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                    color = PremiumColors.Ink,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 40.dp),
                )
                Text(
                    "AI đang xử lý — thường mất khoảng 10–15 giây",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }
    }
}

@Composable
private fun BudgetRangeHint(budgetAmount: Long) {
    val progress = budgetProgressFraction(budgetAmount.toDouble())
    Column {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            listOf("Tiết kiệm" to "< 3tr", "Trung bình" to "3–8tr", "Thoải mái" to "> 8tr").forEach { (label, range) ->
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(label, fontSize = 11.sp, color = Color(0xFF888888))
                    Text(range, fontSize = 10.sp, color = PremiumColors.TextMuted)
                }
            }
        }
        Spacer(Modifier.height(6.dp))
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp)),
            color = PremiumColors.Accent.copy(alpha = 0.6f),
            trackColor = Color(0xFFE8E8E8),
        )
    }
}

@Composable
private fun PlannerCreateFooter(
    loading: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
    buttonText: String = "Tạo chuyến đi",
) {
    if (loading) {
        PlannerAiProgressCard(active = true, destination = "")
        Spacer(Modifier.height(12.dp))
    }
    PremiumAccentButton(
        text = buttonText,
        onClick = onClick,
        enabled = enabled,
        loading = loading,
        height = 54.dp,
        shimmer = !loading && enabled,
    )
}

@Composable
private fun TravelerStepper(
    value: Int,
    onChange: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val canDecrease = value > 1
    val canIncrease = value < 10
    Column(modifier) {
        Text(
            "Số người",
            color = PremiumColors.TextMuted,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(bottom = 6.dp),
        )
        Row(
            Modifier
                .fillMaxWidth()
                .heightIn(min = 52.dp)
                .clip(fieldShape)
                .background(PremiumColors.InputBg)
                .border(1.dp, PremiumColors.Border, fieldShape)
                .padding(horizontal = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            StepperButton(
                label = "−",
                enabled = canDecrease,
                contentDescription = "Giảm số người",
                onClick = { onChange((value - 1).coerceAtLeast(1)) },
            )
            Text(
                value.toString(),
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = PremiumColors.Ink,
            )
            StepperButton(
                label = "+",
                enabled = canIncrease,
                contentDescription = if (canIncrease) "Tăng số người" else "Tối đa 10 người",
                onClick = { onChange((value + 1).coerceAtMost(10)) },
            )
        }
    }
}

@Composable
private fun StepperButton(
    label: String,
    enabled: Boolean,
    contentDescription: String,
    onClick: () -> Unit,
) {
    Box(
        Modifier
            .size(44.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(PremiumColors.Surface.copy(alpha = if (enabled) 1f else 0.5f))
            .semantics {
                this.contentDescription = contentDescription
                role = Role.Button
            }
            .premiumPressScale(enabled = enabled, onClick = if (enabled) onClick else null),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            fontSize = 18.sp,
            fontWeight = FontWeight.Medium,
            color = PremiumColors.Ink.copy(alpha = if (enabled) 1f else 0.35f),
        )
    }
}

@Composable
private fun PaceChip(
    value: String,
    label: String,
    description: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val bg by animateColorAsState(
        if (selected) PremiumColors.AccentLight else PremiumColors.Surface,
        tween(200),
        label = "pace_bg",
    )
    val borderColor by animateColorAsState(
        if (selected) PremiumColors.Accent else PremiumColors.Border,
        tween(200),
        label = "pace_border",
    )

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(PremiumDesign.InputRadius))
            .background(bg)
            .border(if (selected) 2.dp else 1.dp, borderColor, RoundedCornerShape(PremiumDesign.InputRadius))
            .semantics {
                contentDescription = "$label, nhịp độ hành trình"
                role = Role.Button
            }
            .premiumPressScale(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 10.dp),
    ) {
        if (selected) {
            Icon(
                Icons.Default.Check,
                contentDescription = null,
                tint = PremiumColors.Accent,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .size(14.dp),
            )
        }
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            val lines = label.split("\n")
            if (lines.isNotEmpty()) {
                Text(lines[0], fontSize = 18.sp)
            }
            if (lines.size > 1) {
                Text(
                    lines[1],
                    fontSize = 13.sp,
                    fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                    color = if (selected) PremiumColors.Accent else PremiumColors.Muted,
                    modifier = Modifier.padding(top = 4.dp),
                    textAlign = TextAlign.Center,
                )
            }
            AnimatedVisibility(
                visible = selected && description.isNotBlank(),
                enter = expandVertically(animationSpec = tween(220)),
                exit = shrinkVertically(animationSpec = tween(180)),
            ) {
                Text(
                    description,
                    fontSize = 11.sp,
                    lineHeight = 14.sp,
                    color = PremiumColors.Muted,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
        }
    }
}

@Composable
private fun AccommodationCard(
    option: AccommodationOption,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val bg by animateColorAsState(
        if (selected) Color(0xFFFEF0EB) else Color(0xFFF5F5F5),
        tween(200),
        label = "acc_bg",
    )
    val borderColor by animateColorAsState(
        if (selected) PremiumColors.Accent else Color(0xFFE0E0E0),
        tween(200),
        label = "acc_border",
    )

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(PremiumDesign.InputRadius))
            .background(bg)
            .border(if (selected) 1.5.dp else 1.dp, borderColor, RoundedCornerShape(PremiumDesign.InputRadius))
            .semantics {
                contentDescription = "${option.label}, ${option.subtitle}"
                role = Role.Button
            }
            .premiumPressScale(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(option.icon, fontSize = 24.sp)
        Text(
            option.label,
            fontSize = 13.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
            color = if (selected) PremiumColors.Accent else Color(0xFF555555),
            modifier = Modifier.padding(top = 6.dp),
            textAlign = TextAlign.Center,
        )
        Text(
            option.subtitle,
            fontSize = 10.sp,
            lineHeight = 12.sp,
            color = PremiumColors.TextMuted,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 2.dp),
        )
    }
}

@Composable
private fun PreferenceChip(
    label: String,
    tag: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by androidx.compose.animation.core.animateFloatAsState(
        targetValue = when {
            pressed -> 0.96f
            selected -> 1f
            else -> 1f
        },
        animationSpec = spring(dampingRatio = 0.6f, stiffness = 400f),
        label = "chip_scale",
    )
    val bg by animateColorAsState(
        when {
            pressed -> Color(0xFFFDDDD3)
            selected -> Color(0xFFFEF0EB)
            else -> Color(0xFFF5F5F5)
        },
        tween(150),
        label = "pref_bg",
    )
    val borderColor by animateColorAsState(
        if (selected) PremiumColors.Accent else Color(0xFFE0E0E0),
        tween(200),
        label = "pref_border",
    )

    Box(
        modifier = Modifier
            .scale(scale)
            .clip(CircleShape)
            .background(bg)
            .border(if (selected) 1.5.dp else 1.dp, borderColor, CircleShape)
            .semantics {
                contentDescription = "$label, sở thích du lịch"
                role = Role.Button
            }
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick,
            )
            .padding(horizontal = 14.dp, vertical = 10.dp),
    ) {
        Text(
            label,
            fontSize = 13.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
            color = if (selected) PremiumColors.Accent else Color(0xFF555555),
        )
    }
}

private fun budgetProgressFraction(budget: Double): Float = when {
    budget <= 0 -> 0f
    budget < 3_000_000 -> (budget / 3_000_000 * 0.33).toFloat()
    budget < 8_000_000 -> (0.33 + (budget - 3_000_000) / 5_000_000 * 0.34).toFloat()
    else -> (0.67 + minOf(1.0, (budget - 8_000_000) / 12_000_000) * 0.33).toFloat()
}.coerceIn(0f, 1f)

private fun formatBudgetDisplay(raw: String): String {
    val n = raw.toLongOrNull() ?: return raw
    return NumberFormat.getNumberInstance(Locale("vi", "VN")).format(n)
}
