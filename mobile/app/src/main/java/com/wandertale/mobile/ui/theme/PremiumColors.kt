package com.wandertale.mobile.ui.theme

import androidx.compose.ui.graphics.Color

object PremiumColors {
    val Bg = Color(0xFFF5F3EE)
    val Surface = Color(0xFFFFFFFF)
    val SurfaceElevated = Color(0xFFFFFDF9)
    val Ink = Color(0xFF1A1815)
    val Muted = Color(0xFF6B6862)
    val TextMuted = Color(0xFFAAA9A5)
    val Accent = Color(0xFFE85D04)
    val AccentHover = Color(0xFFC94E00)
    val AccentLight = Color(0xFFFFF5F0)
    val AccentTint = Color(0xFFFFF0E8)
    val Divider = Color(0x12000000)
    val Border = Color(0x14000000)

    val BadgeUpcoming = Color(0xFF2A7B9B)
    val BadgeActive = Color(0xFFE85D04)
    val BadgePast = Color(0xFF9E9B97)

    val StatTripBg = Color(0xFFFFF0E8)
    val StatTripIcon = Color(0xFFE85D04)
    val StatDestBg = Color(0xFFE8F5F0)
    val StatDestIcon = Color(0xFF2A9D70)
    val StatBudgetBg = Color(0xFFFFF5E8)
    val StatBudgetIcon = Color(0xFFD4820A)
    val StatActivityBg = Color(0xFFEEF0FF)
    val StatActivityIcon = Color(0xFF5A5FCF)

    val SegmentBg = Color(0xFFEDEAE4)
    val InputBg = Color(0xFFF8F7F4)
    val ChipUnselectedBg = Color(0xFFF0EDE8)

    val WeatherHintBg = Color(0xFFFFF9F5)
    val AccentGradientEnd = Color(0xFFFF7020)
    val AccentGradientLight = Color(0xFFFF8C42)
    val LogoutRed = Color(0xFFDD0000)

    val TripGradients = listOf(
        listOf(BadgeUpcoming, Ink),
        listOf(StatDestIcon, Ink),
        listOf(StatBudgetIcon, Ink),
        listOf(StatActivityIcon, Ink),
        listOf(Accent, Ink),
    )
}
