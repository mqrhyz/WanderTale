package com.wandertale.mobile.ui.screens

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathMeasure
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import com.wandertale.mobile.R
import com.wandertale.mobile.WanderTaleApp
import com.wandertale.mobile.data.DashboardHomeCache
import com.wandertale.mobile.ui.theme.PremiumColors
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.math.atan2

private const val SPLASH_DURATION_MS = 1000L
private const val BOOTSTRAP_TIMEOUT_MS = 2_500L
private const val PRELOAD_TIMEOUT_MS = 10_000L
private const val SPLASH_LOGO_WIDTH_FRACTION = 0.82f
private const val LOGO_ASPECT_RATIO = 1536f / 1024f

private val PortalGold = Color(0xFFFFC857)
private val PortalOrange = PremiumColors.Accent
private val PortalSoft = PremiumColors.AccentTint

@Composable
fun SplashScreen(
    @Suppress("UNUSED_PARAMETER") darkTheme: Boolean = false,
    onFinished: (loggedIn: Boolean) -> Unit,
) {
    val portalProgress = remember { Animatable(0f) }
    val logoReveal = remember { Animatable(0f) }
    val portalGlow = remember { Animatable(0f) }
    val planeProgress = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        launch {
            portalProgress.animateTo(1f, tween(480, easing = FastOutSlowInEasing))
        }
        launch {
            delay(280)
            portalGlow.animateTo(0.45f, tween(320, easing = LinearOutSlowInEasing))
        }
        launch {
            delay(360)
            logoReveal.animateTo(1f, tween(420, easing = LinearOutSlowInEasing))
        }
        launch {
            delay(720)
            planeProgress.animateTo(1f, tween(180, easing = LinearEasing))
        }

        val loggedIn = coroutineScope {
            val minSplash = async { delay(SPLASH_DURATION_MS) }
            val bootstrap = async { resolveLoggedInState() }
            minSplash.await()
            bootstrap.await()
        }
        onFinished(loggedIn)
    }

    BoxWithConstraints(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        val center = Offset(constraints.maxWidth / 2f, constraints.maxHeight / 2f)
        val radius = maxOf(constraints.maxWidth, constraints.maxHeight) * 0.9f

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            Color(0xFFFFFCFA),
                            PremiumColors.Bg,
                            Color(0xFFF4F0EB),
                        ),
                        center = center,
                        radius = radius,
                    ),
                ),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(SPLASH_LOGO_WIDTH_FRACTION)
                    .aspectRatio(LOGO_ASPECT_RATIO),
                contentAlignment = Alignment.Center,
            ) {
                Canvas(Modifier.matchParentSize()) {
                    val swoosh = buildSwooshPath(size.width, size.height)
                    val measure = PathMeasure().apply { setPath(swoosh, false) }
                    val swooshLen = measure.length
                    val portal = portalProgress.value

                    if (portal > 0f) {
                        val visible = Path()
                        measure.getSegment(
                            startDistance = 0f,
                            stopDistance = swooshLen * portal,
                            destination = visible,
                            startWithMoveTo = true,
                        )
                        drawPath(
                            path = visible,
                            brush = Brush.linearGradient(
                                colors = listOf(PortalSoft, PortalGold, PortalOrange),
                                start = Offset(0f, size.height * 0.6f),
                                end = Offset(size.width, size.height * 0.4f),
                            ),
                            style = Stroke(width = 2.8f, cap = StrokeCap.Round),
                            alpha = 0.92f,
                        )

                        if (portalGlow.value > 0f) {
                            val portalCenter = measure.getPosition(swooshLen * portal.coerceIn(0.05f, 1f))
                            drawCircle(
                                brush = Brush.radialGradient(
                                    colors = listOf(
                                        PortalGold.copy(alpha = portalGlow.value * 0.28f),
                                        PortalSoft.copy(alpha = portalGlow.value * 0.10f),
                                        Color.Transparent,
                                    ),
                                    center = portalCenter,
                                    radius = size.minDimension * 0.22f,
                                ),
                                radius = size.minDimension * 0.22f,
                                center = portalCenter,
                            )
                        }
                    }

                    val plane = planeProgress.value
                    if (plane > 0f) {
                        val planeDistance = swooshLen * plane
                        val planePos = measure.getPosition(planeDistance)
                        val tangent = measure.getTangent(planeDistance)
                        val angle = Math.toDegrees(atan2(tangent.y, tangent.x).toDouble()).toFloat()

                        rotate(angle, planePos) {
                            drawPlaneGlyph(planePos)
                        }

                        if (plane > 0.75f) {
                            drawCircle(
                                color = PortalOrange.copy(alpha = (plane - 0.75f) * 1.2f),
                                radius = 5f,
                                center = planePos,
                            )
                        }
                    }
                }

                val reveal = logoReveal.value
                Image(
                    painter = painterResource(R.drawable.logo10),
                    contentDescription = "WanderTale",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .fillMaxWidth()
                        .graphicsLayer {
                            alpha = reveal
                            scaleX = 0.94f + reveal * 0.06f
                            scaleY = 0.94f + reveal * 0.06f
                        },
                )
            }
        }
    }
}

private fun buildSwooshPath(width: Float, height: Float): Path {
    val start = Offset(width * 0.10f, height * 0.58f)
    val control = Offset(width * 0.50f, height * 0.72f)
    val end = Offset(width * 0.93f, height * 0.38f)
    return Path().apply {
        moveTo(start.x, start.y)
        quadraticTo(control.x, control.y, end.x, end.y)
    }
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawPlaneGlyph(center: Offset) {
    val path = Path().apply {
        moveTo(center.x - 6f, center.y + 1.5f)
        lineTo(center.x + 9f, center.y - 1f)
        lineTo(center.x + 1.5f, center.y)
        lineTo(center.x + 9f, center.y + 1f)
        close()
    }
    drawPath(path, color = PortalOrange)
}

private suspend fun resolveLoggedInState(): Boolean {
    val app = WanderTaleApp.instance
    return runCatching {
        withTimeoutOrNull(BOOTSTRAP_TIMEOUT_MS) {
            app.authRepository.initSession()
            val loggedIn = app.authRepository.isLoggedIn()
            if (loggedIn) {
                withTimeoutOrNull(PRELOAD_TIMEOUT_MS) {
                    DashboardHomeCache.preload(
                        app.dashboardRepository,
                        app.tripRepository,
                        app.profileRepository,
                    )
                }
            }
            loggedIn
        }
    }.getOrNull()
        ?: runCatching { app.authRepository.isLoggedIn() }.getOrDefault(false)
}
