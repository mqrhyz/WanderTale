package com.wandertale.mobile.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.wandertale.mobile.ui.theme.PremiumColors

/** Compass / map illustration for favorites empty state. */
@Composable
fun TravelEmptyIllustration(modifier: Modifier = Modifier) {
    Box(modifier.size(100.dp)) {
        Canvas(Modifier.fillMaxSize()) {
            val cx = size.width / 2f
            val cy = size.height / 2f
            val r = size.minDimension * 0.42f

            drawCircle(
                color = PremiumColors.Accent.copy(alpha = 0.15f),
                radius = r,
                center = Offset(cx, cy),
            )
            drawCircle(
                color = PremiumColors.Accent,
                radius = r,
                center = Offset(cx, cy),
                style = Stroke(width = 2.5f),
            )
            drawCircle(
                color = PremiumColors.Accent.copy(alpha = 0.35f),
                radius = r * 0.55f,
                center = Offset(cx, cy),
                style = Stroke(width = 1.5f),
            )

            val needle = Path().apply {
                moveTo(cx, cy - r * 0.65f)
                lineTo(cx + r * 0.18f, cy)
                lineTo(cx, cy + r * 0.65f)
                lineTo(cx - r * 0.18f, cy)
                close()
            }
            drawPath(needle, color = PremiumColors.Accent.copy(alpha = 0.5f))
            drawCircle(color = PremiumColors.Accent, radius = 4f, center = Offset(cx, cy))
        }
    }
}

@Composable
fun DotPatternBackground(modifier: Modifier = Modifier) {
    Canvas(modifier.background(Color.Transparent)) {
        val step = 18.dp.toPx()
        var x = 0f
        while (x < size.width) {
            var y = 0f
            while (y < size.height) {
                drawCircle(
                    color = Color.Black.copy(alpha = 0.03f),
                    radius = 1.2f,
                    center = Offset(x, y),
                )
                y += step
            }
            x += step
        }
    }
}
