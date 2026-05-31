package com.wandertale.mobile.ui.components

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.wandertale.mobile.ui.theme.PremiumDesign

@Composable
private fun SkeletonBlock(
    modifier: Modifier,
    shimmer: androidx.compose.ui.graphics.Brush,
) {
    Box(modifier.clip(RoundedCornerShape(PremiumDesign.InputRadius)).background(shimmer))
}

@Composable
fun DashboardHomeSkeleton(modifier: Modifier = Modifier) {
    val shimmer = rememberShimmerBrush()
    Column(
        modifier.padding(horizontal = PremiumDesign.ScreenPadding, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(PremiumDesign.SectionGap),
    ) {
        SkeletonBlock(Modifier.fillMaxWidth().height(200.dp), shimmer)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            SkeletonBlock(Modifier.weight(1f).height(88.dp), shimmer)
            SkeletonBlock(Modifier.weight(1f).height(88.dp), shimmer)
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            SkeletonBlock(Modifier.weight(1f).height(88.dp), shimmer)
            SkeletonBlock(Modifier.weight(1f).height(88.dp), shimmer)
        }
        SkeletonBlock(Modifier.width(140.dp).height(18.dp), shimmer)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            repeat(2) {
                SkeletonBlock(Modifier.width(160.dp).height(200.dp), shimmer)
            }
        }
    }
}

@Composable
fun TripsListSkeleton(modifier: Modifier = Modifier) {
    val shimmer = rememberShimmerBrush()
    Column(
        modifier.padding(horizontal = PremiumDesign.ScreenPadding, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(PremiumDesign.SectionGap),
    ) {
        SkeletonBlock(Modifier.width(120.dp).height(28.dp), shimmer)
        SkeletonBlock(Modifier.fillMaxWidth().height(14.dp), shimmer)
        SkeletonBlock(Modifier.fillMaxWidth().height(88.dp), shimmer)
        SkeletonBlock(Modifier.fillMaxWidth().height(44.dp), shimmer)
        repeat(3) {
            SkeletonBlock(Modifier.fillMaxWidth().height(220.dp), shimmer)
        }
    }
}

@Composable
fun TripDetailSkeleton(modifier: Modifier = Modifier) {
    val shimmer = rememberShimmerBrush()
    Column(
        modifier
            .padding(horizontal = PremiumDesign.ScreenPadding, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(PremiumDesign.SectionGap),
    ) {
        SkeletonBlock(Modifier.fillMaxWidth().height(20.dp), shimmer)
        SkeletonBlock(Modifier.width(200.dp).height(16.dp), shimmer)
        SkeletonBlock(Modifier.fillMaxWidth().height(72.dp), shimmer)
        SkeletonBlock(Modifier.width(160.dp).height(22.dp), shimmer)
        repeat(3) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                SkeletonBlock(Modifier.width(56.dp).height(56.dp), shimmer)
                SkeletonBlock(Modifier.weight(1f).height(120.dp), shimmer)
            }
        }
        SkeletonBlock(Modifier.width(140.dp).height(22.dp), shimmer)
        SkeletonBlock(Modifier.fillMaxWidth().height(140.dp), shimmer)
    }
}

@Composable
fun WeatherCardsSkeleton(modifier: Modifier = Modifier) {
    val shimmer = rememberShimmerBrush()
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        repeat(4) {
            SkeletonBlock(Modifier.width(100.dp).height(130.dp), shimmer)
        }
    }
}

@Composable
fun ProfileStatsSkeleton(modifier: Modifier = Modifier) {
    val shimmer = rememberShimmerBrush()
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        repeat(2) {
            SkeletonBlock(Modifier.weight(1f).height(72.dp), shimmer)
        }
    }
}

@Composable
fun OrangeLoadingSpinner(modifier: Modifier = Modifier) {
    androidx.compose.material3.CircularProgressIndicator(
        modifier = modifier.size(28.dp),
        strokeWidth = 2.5.dp,
        color = com.wandertale.mobile.ui.theme.PremiumColors.Accent,
    )
}
