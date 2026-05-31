package com.wandertale.mobile.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.dp
import com.wandertale.mobile.ui.theme.PremiumColors

/** Shimmer brush for skeleton loaders. */
@Composable
fun rememberShimmerBrush(): Brush {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val translate by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(tween(1100, easing = LinearEasing), RepeatMode.Restart),
        label = "shimmer_translate",
    )
    return Brush.linearGradient(
        colors = listOf(
            Color(0xFFE8E6E1),
            Color(0xFFF5F3EE),
            Color(0xFFE8E6E1),
        ),
        start = Offset(translate - 400f, 0f),
        end = Offset(translate, 400f),
    )
}

fun Modifier.premiumPressScale(
    enabled: Boolean = true,
    onClick: (() -> Unit)? = null,
): Modifier = composed {
    if (!enabled && onClick == null) return@composed this
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.98f else 1f,
        animationSpec = tween(120),
        label = "press_scale",
    )
    scale(scale).then(
        if (onClick != null) {
            Modifier.clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                onClick = onClick,
            )
        } else Modifier,
    )
}

fun Modifier.ctaShimmerIdle(shape: Shape, enabled: Boolean = true): Modifier = composed {
    if (!enabled) return@composed this
    val transition = rememberInfiniteTransition(label = "cta_shimmer")
    val progress by transition.animateFloat(
        initialValue = -0.4f,
        targetValue = 1.4f,
        animationSpec = infiniteRepeatable(tween(4000, easing = LinearEasing), RepeatMode.Restart),
        label = "cta_shimmer_progress",
    )
    clipToBounds()
        .drawWithContent {
            drawContent()
            val w = size.width
            val shimmerW = w * 0.35f
            val left = w * progress
            drawRect(
                brush = Brush.linearGradient(
                    colors = listOf(
                        Color.Transparent,
                        Color.White.copy(alpha = 0.22f),
                        Color.Transparent,
                    ),
                    start = Offset(left, 0f),
                    end = Offset(left + shimmerW, size.height),
                ),
            )
        }
}

@Composable
fun CountUpIntDisplay(
    target: Int?,
    modifier: Modifier = Modifier,
    content: @Composable (display: String) -> Unit,
) {
    val anim = remember { Animatable(0f) }
    LaunchedEffect(target) {
        if (target == null) return@LaunchedEffect
        anim.snapTo(0f)
        anim.animateTo(
            targetValue = target.toFloat(),
            animationSpec = tween(durationMillis = 900, easing = FastOutSlowInEasing),
        )
    }
    val text = if (target == null) "—" else anim.value.toInt().toString()
    Box(modifier) { content(text) }
}
