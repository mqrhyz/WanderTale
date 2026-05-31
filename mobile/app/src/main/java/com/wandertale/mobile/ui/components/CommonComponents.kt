package com.wandertale.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.wandertale.mobile.ui.theme.PremiumColors
import com.wandertale.mobile.ui.theme.PremiumDesign

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppScaffold(
    title: String,
    onBack: (() -> Unit)? = null,
    actions: @Composable () -> Unit = {},
    content: @Composable (Modifier) -> Unit,
) {
    Scaffold(
        containerColor = PremiumColors.Bg,
        topBar = {
            TopAppBar(
                modifier = Modifier.statusBarsPadding(),
                title = {
                    Text(
                        title,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = PremiumColors.Ink,
                    )
                },
                navigationIcon = {
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại")
                        }
                    }
                },
                actions = { actions() },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = PremiumColors.Bg,
                    titleContentColor = PremiumColors.Ink,
                ),
            )
        },
    ) { padding ->
        content(Modifier.padding(padding))
    }
}

@Composable
fun LoadingBox(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        OrangeLoadingSpinner()
    }
}

@Composable
fun ErrorText(message: String, modifier: Modifier = Modifier) {
    Text(
        text = message,
        color = PremiumColors.LogoutRed,
        fontSize = 14.sp,
        modifier = modifier.padding(PremiumDesign.ScreenPadding),
    )
}

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun PremiumPullRefreshBox(
    refreshing: Boolean,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val state = rememberPullRefreshState(refreshing, onRefresh)
    Box(
        modifier
            .fillMaxSize()
            .pullRefresh(state),
    ) {
        content()
        PullRefreshIndicator(
            refreshing = refreshing,
            state = state,
            modifier = Modifier.align(Alignment.TopCenter),
            contentColor = PremiumColors.Accent,
            backgroundColor = PremiumColors.Surface,
        )
    }
}

@Composable
fun ImageCarousel(
    images: List<String>,
    alt: String,
    modifier: Modifier = Modifier,
    fallback: String = "?",
    onClick: (() -> Unit)? = null,
) {
    var index by remember(images) { mutableIntStateOf(0) }
    val count = images.size
    val shape = RoundedCornerShape(PremiumDesign.InputRadius)

    Box(
        modifier = modifier
            .clip(shape)
            .background(PremiumColors.InputBg)
            .then(
                if (onClick != null) {
                    Modifier.premiumPressScale(onClick = onClick)
                } else Modifier,
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (count == 0) {
            Text(fallback, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = PremiumColors.Accent)
        } else {
            AsyncImage(
                model = images[index % count],
                contentDescription = alt,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit,
            )
            if (count > 1) {
                Row(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(6.dp)
                        .background(PremiumColors.Ink.copy(alpha = 0.55f), RoundedCornerShape(6.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Icon(Icons.Default.PhotoLibrary, null, tint = PremiumColors.Surface, modifier = Modifier.size(12.dp))
                    Text("$count", color = PremiumColors.Surface, fontSize = 11.sp)
                }
                IconButton(
                    onClick = { index = (index - 1 + count) % count },
                    modifier = Modifier.align(Alignment.CenterStart),
                ) { Icon(Icons.Default.ChevronLeft, null) }
                IconButton(
                    onClick = { index = (index + 1) % count },
                    modifier = Modifier.align(Alignment.CenterEnd),
                ) { Icon(Icons.Default.ChevronRight, null) }
            }
        }
    }
}

@Composable
fun InfoCard(
    title: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier,
    trailing: @Composable () -> Unit = {},
) {
    PremiumSurfaceCard(modifier = modifier.premiumPressScale()) {
        Row(Modifier.padding(PremiumDesign.CardPadding), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(title, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = PremiumColors.Ink)
                if (subtitle != null) {
                    Text(subtitle, fontSize = 13.sp, color = PremiumColors.TextMuted, modifier = Modifier.padding(top = 2.dp))
                }
            }
            trailing()
        }
    }
}
