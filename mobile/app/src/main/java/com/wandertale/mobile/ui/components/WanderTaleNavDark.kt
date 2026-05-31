package com.wandertale.mobile.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.wandertale.mobile.ui.theme.PremiumColors
import com.wandertale.mobile.ui.theme.PremiumDesign

@Composable
fun WanderTaleBottomNavDark(
    currentRoute: String,
    onNavigate: (String) -> Unit,
    onCreateClick: () -> Unit,
    backgroundColor: Color = PremiumColors.SurfaceDark,
) {
    WanderTaleBottomNavBar(
        currentRoute = currentRoute,
        onNavigate = onNavigate,
        onCreateClick = onCreateClick,
        backgroundColor = backgroundColor,
        inactiveTint = PremiumDesign.NavInactive,
    )
}
