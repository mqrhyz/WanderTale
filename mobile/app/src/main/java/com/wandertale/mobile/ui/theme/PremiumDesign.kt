package com.wandertale.mobile.ui.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

object PremiumDesign {
    val ScreenPadding = 20.dp
    val CardPadding = 16.dp
    val SectionGap = 24.dp

    val CardRadius = 16.dp
    val HeroRadius = 20.dp
    val ButtonRadius = 14.dp
    val InputRadius = 12.dp
    val IconContainerRadius = 12.dp

    val CardElevation = 2.dp
    val ElevatedElevation = 8.dp
    val SoftShadowColor = Color(0x12000000)

    val NavBarHeight = 76.dp
    val NavFabSize = 52.dp
    val NavFabOffsetUp = 4.dp
    val NavIconSize = 22.dp
    val BottomNavDrop = 8.dp

    /** Scroll padding above bottom nav (bar + FAB protrusion). */
    val BottomNavOverlayHeight = NavBarHeight + NavFabOffsetUp

    val NavInactive = PremiumColors.TextMuted
    val NavActive = PremiumColors.Accent
}
