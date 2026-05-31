package com.wandertale.mobile.ui.theme

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color

object PremiumColors {
    var darkModeEnabled by mutableStateOf(false)

    val Bg get() = if (darkModeEnabled) BgDark else Color(0xFFF5F3EE)
    val Surface get() = if (darkModeEnabled) SurfaceDark else Color(0xFFFFFFFF)
    val SurfaceElevated get() = if (darkModeEnabled) Color(0xFF22221F) else Color(0xFFFFFDF9)
    val Ink get() = if (darkModeEnabled) InkDarkMode else Color(0xFF1A1815)
    val Muted get() = if (darkModeEnabled) MutedDark else Color(0xFF6B6862)
    val TextMuted get() = if (darkModeEnabled) Color(0xFF8F8B82) else Color(0xFFAAA9A5)
    val Accent = Color(0xFFE85D04)
    val AccentHover = Color(0xFFC94E00)
    val AccentLight get() = if (darkModeEnabled) Color(0xFF2A160C) else Color(0xFFFFF5F0)
    val AccentTint get() = if (darkModeEnabled) Color(0xFF32180B) else Color(0xFFFFF0E8)
    val Divider get() = if (darkModeEnabled) Color(0x1AF0EFE9) else Color(0x12000000)
    val Border get() = if (darkModeEnabled) BorderDark else Color(0x14000000)

    val BadgeUpcoming = Color(0xFF2A7B9B)
    val BadgeActive = Color(0xFFE85D04)
    val BadgePast = Color(0xFF9E9B97)

    val StatTripBg get() = if (darkModeEnabled) Color(0xFF2A160C) else Color(0xFFFFF0E8)
    val StatTripIcon = Color(0xFFE85D04)
    val StatDestBg get() = if (darkModeEnabled) Color(0xFF10251D) else Color(0xFFE8F5F0)
    val StatDestIcon = Color(0xFF2A9D70)
    val StatBudgetBg get() = if (darkModeEnabled) Color(0xFF2A1F0D) else Color(0xFFFFF5E8)
    val StatBudgetIcon = Color(0xFFD4820A)
    val StatActivityBg get() = if (darkModeEnabled) Color(0xFF171935) else Color(0xFFEEF0FF)
    val StatActivityIcon = Color(0xFF5A5FCF)

    val SegmentBg get() = if (darkModeEnabled) Color(0xFF242420) else Color(0xFFEDEAE4)
    val InputBg get() = if (darkModeEnabled) Color(0xFF1E1E1B) else Color(0xFFF8F7F4)
    val ChipUnselectedBg get() = if (darkModeEnabled) Color(0xFF242420) else Color(0xFFF0EDE8)

    val WeatherHintBg get() = if (darkModeEnabled) Color(0xFF211B16) else Color(0xFFFFF9F5)
    val AccentGradientEnd = Color(0xFFFF7020)
    val AccentGradientLight = Color(0xFFFF8C42)
    val LogoutRed = Color(0xFFDD0000)

    // Dark mode (retained for theme toggle)
    val BgDark = Color(0xFF141413)
    val SurfaceDark = Color(0xFF1C1C19)
    val InkDarkMode = Color(0xFFF0EFE9)
    val MutedDark = Color(0xFFA09C92)
    val BorderDark = Color(0x1AF0EFE9)

    val TripGradients = listOf(
        listOf(BadgeUpcoming, Ink),
        listOf(StatDestIcon, Ink),
        listOf(StatBudgetIcon, Ink),
        listOf(StatActivityIcon, Ink),
        listOf(Accent, Ink),
    )
}
