package com.wandertale.mobile.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wandertale.mobile.R
import com.wandertale.mobile.ui.theme.PremiumColors
import com.wandertale.mobile.ui.theme.PremiumDesign

private val AuthPrimary = PremiumColors.Accent
private val AuthError = Color(0xFFFF8FA8)
private val AuthSuccess = Color(0xFF6EE7B7)
private val FormSurface = Color(0xFF141416).copy(alpha = 0.78f)
private val FormBorder = Color.White.copy(alpha = 0.16f)
private val FieldSurface = Color(0xFF2A2A2E)
private val FieldBorder = Color.White.copy(alpha = 0.22f)
private val FieldBorderFocused = Color.White.copy(alpha = 0.5f)
private val LabelColor = Color(0xFFE4E4E7)
private val MutedText = Color(0xFFA1A1AA)

@Composable
fun LoginAuthLayout(content: @Composable ColumnScope.() -> Unit) {
    Box(Modifier.fillMaxSize()) {
        AuthBackground()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = PremiumDesign.ScreenPadding, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(8.dp))
            BrandLogo(size = 80, clipCorners = false)
            Spacer(Modifier.height(12.dp))
            Text(
                text = "Mỗi chuyến đi,",
                color = Color.White,
                fontSize = 24.sp,
                lineHeight = 30.sp,
                fontWeight = FontWeight.Normal,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
            Text(
                text = "một câu chuyện riêng.",
                color = Color.White.copy(alpha = 0.72f),
                fontSize = 24.sp,
                lineHeight = 30.sp,
                fontWeight = FontWeight.Normal,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
            Spacer(Modifier.height(14.dp))
            content()
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
fun AuthBackground(modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize()) {
        Image(
            painter = painterResource(R.drawable.auth_background),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )
        Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.38f)))
        Box(
            Modifier.fillMaxSize().background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color.Black.copy(alpha = 0.35f),
                        Color.Black.copy(alpha = 0.18f),
                        Color.Black.copy(alpha = 0.42f),
                    ),
                ),
            ),
        )
    }
}

private const val BRAND_LOGO_ASPECT_RATIO = 1823f / 863f

@Composable
fun BrandLogo(
    modifier: Modifier = Modifier,
    size: Int = 64,
    contentScale: ContentScale = ContentScale.Fit,
    clipCorners: Boolean = true,
) {
    val shape = RoundedCornerShape(16.dp)
    Image(
        painter = painterResource(R.drawable.logo10),
        contentDescription = "WanderTale",
        contentScale = contentScale,
        modifier = modifier
            .height(size.dp)
            .aspectRatio(BRAND_LOGO_ASPECT_RATIO)
            .then(if (clipCorners) Modifier.clip(shape) else Modifier),
    )
}

@Composable
fun AuthHeroHeader(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.Start,
    ) {
        BrandLogo(size = 56, clipCorners = false)
        Spacer(Modifier.height(24.dp))
        Text(
            text = "Mỗi chuyến đi,\nmột câu chuyện riêng.",
            color = Color.White,
            fontSize = 28.sp,
            lineHeight = 32.sp,
            fontWeight = FontWeight.Normal,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Lịch trình, bản đồ và kỷ niệm — đồng bộ trên mọi thiết bị.",
            color = Color.White.copy(alpha = 0.7f),
            fontSize = 14.sp,
            lineHeight = 20.sp,
        )
    }
}

@Composable
fun AuthScreenLayout(
    onBack: (() -> Unit)? = null,
    showHero: Boolean = true,
    content: @Composable ColumnScope.() -> Unit,
) {
    Box(Modifier.fillMaxSize()) {
        AuthBackground()
        Column(
            Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp),
        ) {
            if (onBack != null) {
                IconButton(onClick = onBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Quay lại",
                        tint = Color.White,
                    )
                }
            } else {
                Spacer(Modifier.height(8.dp))
            }
            if (showHero) {
                AuthHeroHeader()
                Spacer(Modifier.height(24.dp))
            } else {
                BrandLogo(size = 48)
                Spacer(Modifier.height(20.dp))
            }
            content()
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
fun AuthFormShell(
    kicker: String,
    title: String,
    description: String,
    footer: @Composable (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(24.dp, RoundedCornerShape(PremiumDesign.HeroRadius), ambientColor = Color.Black.copy(alpha = 0.4f))
            .clip(RoundedCornerShape(PremiumDesign.HeroRadius))
            .border(BorderStroke(1.dp, FormBorder), RoundedCornerShape(PremiumDesign.HeroRadius))
            .background(FormSurface)
            .padding(horizontal = 22.dp, vertical = 26.dp),
    ) {
        Text(
            text = kicker.uppercase(),
            color = AuthPrimary,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 1.2.sp,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = title,
            color = Color.White,
            fontSize = 30.sp,
            lineHeight = 36.sp,
            fontWeight = FontWeight.Normal,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = description,
            color = Color.White.copy(alpha = 0.68f),
            fontSize = 14.sp,
            lineHeight = 21.sp,
        )
        Spacer(Modifier.height(22.dp))
        HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
        Column(Modifier.padding(top = 22.dp), content = content)
        footer?.let {
            Box(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 22.dp),
                contentAlignment = Alignment.Center,
            ) {
                it()
            }
        }
    }
}

@Composable
fun AuthFieldLabel(text: String) {
    Text(
        text = text,
        color = LabelColor,
        fontSize = 14.sp,
        fontWeight = FontWeight.Medium,
    )
}

@Composable
fun AuthTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
) {
    Column(modifier) {
        AuthFieldLabel(label)
        Spacer(Modifier.height(6.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = {
                Text(placeholder, color = MutedText.copy(alpha = 0.85f))
            },
            singleLine = true,
            visualTransformation = visualTransformation,
            keyboardOptions = keyboardOptions,
            keyboardActions = keyboardActions,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 52.dp),
            shape = RoundedCornerShape(PremiumDesign.InputRadius),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                cursorColor = AuthPrimary,
                focusedBorderColor = FieldBorderFocused,
                unfocusedBorderColor = FieldBorder,
                focusedContainerColor = FieldSurface,
                unfocusedContainerColor = FieldSurface,
            ),
        )
    }
}

@Composable
fun AuthPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier
            .fillMaxWidth()
            .height(54.dp)
            .ctaShimmerIdle(RoundedCornerShape(PremiumDesign.ButtonRadius), enabled = enabled),
        shape = RoundedCornerShape(PremiumDesign.ButtonRadius),
        colors = ButtonDefaults.buttonColors(
            containerColor = AuthPrimary,
            contentColor = Color.White,
            disabledContainerColor = AuthPrimary.copy(alpha = 0.5f),
        ),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp),
    ) {
        Text(text, fontSize = 15.sp)
    }
}

@Composable
fun AuthErrorText(message: String, modifier: Modifier = Modifier) {
    Text(
        text = message,
        color = AuthError,
        fontSize = 14.sp,
        modifier = modifier,
    )
}

@Composable
fun AuthSuccessText(message: String, modifier: Modifier = Modifier) {
    Text(
        text = message,
        color = AuthSuccess,
        fontSize = 14.sp,
        modifier = modifier,
    )
}