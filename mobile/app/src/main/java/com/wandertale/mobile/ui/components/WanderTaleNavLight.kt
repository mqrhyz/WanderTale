package com.wandertale.mobile.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wandertale.mobile.ui.theme.PremiumColors
import com.wandertale.mobile.ui.theme.PremiumDesign

data class WanderTaleNavItem(
    val route: String,
    val label: String,
    val iconOutlined: ImageVector,
    val iconFilled: ImageVector,
)

val wanderTaleNavItems = listOf(
    WanderTaleNavItem("home", "Home", Icons.Outlined.Dashboard, Icons.Filled.Dashboard),
    WanderTaleNavItem("trips", "Chuyến", Icons.Outlined.Place, Icons.Filled.Place),
    WanderTaleNavItem("favorites", "Đặt chỗ", Icons.Outlined.ConfirmationNumber, Icons.Filled.ConfirmationNumber),
    WanderTaleNavItem("profile", "Hồ sơ", Icons.Outlined.Person, Icons.Filled.Person),
)

/** @deprecated Use PremiumDesign.BottomNavOverlayHeight */
val WanderTaleBottomNavOverlayHeight = PremiumDesign.BottomNavOverlayHeight

@Composable
fun WanderTaleBottomNavLight(
    currentRoute: String,
    onNavigate: (String) -> Unit,
    onCreateClick: () -> Unit,
    backgroundColor: Color = Color.White,
) {
    WanderTaleBottomNavBar(
        currentRoute = currentRoute,
        onNavigate = onNavigate,
        onCreateClick = onCreateClick,
        backgroundColor = backgroundColor,
        inactiveTint = PremiumDesign.NavInactive,
    )
}

@Composable
internal fun WanderTaleBottomNavBar(
    currentRoute: String,
    onNavigate: (String) -> Unit,
    onCreateClick: () -> Unit,
    backgroundColor: Color,
    inactiveTint: Color,
) {
    val leftItems = wanderTaleNavItems.take(2)
    val rightItems = wanderTaleNavItems.drop(2)
    val isDark = isSystemInDarkTheme()
    val barBg = if (isDark) Color(0xFF1C1C19) else backgroundColor

    val navInset = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
    val bottomChrome = maxOf(0.dp, navInset - 14.dp)

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = bottomChrome),
    ) {
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .height(PremiumDesign.NavBarHeight)
                .background(barBg),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(PremiumDesign.NavBarHeight)
                    .padding(horizontal = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                leftItems.forEach { item ->
                    WanderTaleNavTab(
                        item = item,
                        selected = currentRoute == item.route,
                        inactiveTint = inactiveTint,
                        onClick = { onNavigate(item.route) },
                        modifier = Modifier.weight(1f),
                    )
                }
                Spacer(Modifier.weight(0.85f))
                rightItems.forEach { item ->
                    WanderTaleNavTab(
                        item = item,
                        selected = currentRoute == item.route,
                        inactiveTint = inactiveTint,
                        onClick = { onNavigate(item.route) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }

        Box(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .offset(y = PremiumDesign.NavFabOffsetUp)
                .size(PremiumDesign.NavFabSize)
                .clip(CircleShape)
                .background(
                    Brush.linearGradient(
                        listOf(PremiumColors.Accent, PremiumColors.AccentGradientEnd),
                    ),
                )
                .clickable(onClick = onCreateClick),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = "Tạo chuyến đi",
                tint = Color.White,
                modifier = Modifier.size(26.dp),
            )
        }
    }
}

@Composable
private fun WanderTaleNavTab(
    item: WanderTaleNavItem,
    selected: Boolean,
    inactiveTint: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val activeTint = PremiumDesign.NavActive
    val tint by animateColorAsState(
        targetValue = if (selected) activeTint else inactiveTint,
        animationSpec = tween(150),
        label = "nav_tab_tint",
    )
    val iconScale by animateFloatAsState(
        targetValue = if (selected) 1.1f else 1f,
        animationSpec = tween(150),
        label = "nav_icon_bounce",
    )

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = if (selected) item.iconFilled else item.iconOutlined,
            contentDescription = item.label,
            tint = tint,
            modifier = Modifier
                .size(PremiumDesign.NavIconSize)
                .scale(iconScale),
        )
        Text(
            text = item.label,
            color = tint,
            fontSize = 10.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}
