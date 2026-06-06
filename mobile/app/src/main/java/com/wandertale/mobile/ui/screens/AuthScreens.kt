package com.wandertale.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wandertale.mobile.R
import com.wandertale.mobile.WanderTaleApp
import com.wandertale.mobile.ui.components.AuthErrorText
import com.wandertale.mobile.ui.components.AuthFormShell
import com.wandertale.mobile.ui.components.AuthPrimaryButton
import com.wandertale.mobile.ui.components.AuthScreenLayout
import com.wandertale.mobile.ui.components.LoginAuthLayout
import com.wandertale.mobile.ui.components.AuthSuccessText
import com.wandertale.mobile.ui.components.AuthTextField
import com.wandertale.mobile.ui.theme.PremiumColors
import com.wandertale.mobile.util.formatAuthError
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.status.SessionStatus
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    onBack: (() -> Unit)? = null,
    onSuccess: () -> Unit,
    onRegister: () -> Unit,
    onForgot: () -> Unit,
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var googleLoading by remember { mutableStateOf(false) }
    var facebookLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val auth = WanderTaleApp.instance.authRepository

    // Khi OAuth (Google/Facebook) hoàn tất qua deep link, session chuyển sang Authenticated.
    LaunchedEffect(Unit) {
        auth.supabase.auth.sessionStatus.collect { status ->
            if (status is SessionStatus.Authenticated && (googleLoading || facebookLoading)) {
                googleLoading = false
                facebookLoading = false
                auth.initSession()
                onSuccess()
            }
        }
    }

    LoginAuthLayout {
        AuthFormShell(
            kicker = "Tài khoản",
            title = "Đăng nhập",
            description = "Tiếp tục hành trình — lịch trình và chuyến đi của bạn đang chờ.",
            footer = {
                Row(
                    horizontalArrangement = Arrangement.Center,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = "Quên mật khẩu?",
                        color = PremiumColors.Accent,
                        fontSize = 14.sp,
                        modifier = Modifier.clickable(onClick = onForgot),
                    )
                    Text("  ·  ", color = Color.White.copy(alpha = 0.45f), fontSize = 14.sp)
                    Text(
                        text = "Tạo tài khoản mới",
                        color = PremiumColors.Accent,
                        fontSize = 14.sp,
                        modifier = Modifier.clickable(onClick = onRegister),
                    )
                }
            },
        ) {
            AuthTextField(
                value = email,
                onValueChange = { email = it },
                label = "Email",
                placeholder = "ban@email.com",
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            )
            Spacer(Modifier.height(16.dp))
            AuthTextField(
                value = password,
                onValueChange = { password = it },
                label = "Mật khẩu",
                placeholder = "••••••••",
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            )
            error?.let {
                Spacer(Modifier.height(12.dp))
                AuthErrorText(it)
            }
            Spacer(Modifier.height(20.dp))
            AuthPrimaryButton(
                text = if (loading) "Đang xử lý…" else "Đăng nhập",
                enabled = !loading && email.isNotBlank() && password.isNotBlank(),
                onClick = {
                    loading = true
                    error = null
                    scope.launch {
                        runCatching {
                            auth.initSession()
                            auth.signIn(email.trim(), password)
                        }
                            .onSuccess { onSuccess() }
                            .onFailure { error = formatAuthError(it, "Đăng nhập thất bại") }
                        loading = false
                    }
                },
            )
            Spacer(Modifier.height(14.dp))
            AuthDivider()
            Spacer(Modifier.height(14.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                GoogleSignInButton(
                    loading = googleLoading,
                    modifier = Modifier.weight(1f),
                ) {
                    error = null
                    googleLoading = true
                    scope.launch {
                        runCatching {
                            auth.initSession()
                            auth.signInWithGoogle()
                        }.onFailure {
                            error = formatAuthError(it, "Đăng nhập Google thất bại")
                            googleLoading = false
                        }
                    }
                }
                FacebookSignInButton(
                    loading = facebookLoading,
                    modifier = Modifier.weight(1f),
                ) {
                    error = null
                    facebookLoading = true
                    scope.launch {
                        runCatching {
                            auth.initSession()
                            auth.signInWithFacebook()
                        }.onFailure {
                            error = formatAuthError(it, "Đăng nhập Facebook thất bại")
                            facebookLoading = false
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AuthDivider() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(Modifier.weight(1f).height(1.dp).background(Color.White.copy(alpha = 0.25f)))
        Text("hoặc", color = Color.White.copy(alpha = 0.6f), fontSize = 13.sp)
        Box(Modifier.weight(1f).height(1.dp).background(Color.White.copy(alpha = 0.25f)))
    }
}

@Composable
private fun GoogleSignInButton(loading: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(48.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(Color.White)
            .clickable(enabled = !loading, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) {
            CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = Color(0xFF4285F4))
        } else {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                Image(
                    painter = painterResource(R.drawable.ic_google_logo),
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                )
                Spacer(Modifier.width(8.dp))
                Text("Google", color = Color(0xFF212121), fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
            }
        }
    }
}

@Composable
private fun FacebookSignInButton(loading: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(48.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF1877F2))
            .clickable(enabled = !loading, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) {
            CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = Color.White)
        } else {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                Text("f", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                Spacer(Modifier.width(8.dp))
                Text("Facebook", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
            }
        }
    }
}

@Composable
fun RegisterScreen(onBack: () -> Unit, onSuccess: () -> Unit, onLogin: () -> Unit) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    AuthScreenLayout(onBack = onBack, showHero = false) {
        AuthFormShell(
            kicker = "Bắt đầu",
            title = "Đăng ký",
            description = "Tạo tài khoản WanderTale — đồng bộ chuyến đi trên mọi thiết bị.",
            footer = {
                Text(
                    text = "Đã có tài khoản? Đăng nhập",
                    color = PremiumColors.Accent,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onLogin),
                )
            },
        ) {
            AuthTextField(
                value = name,
                onValueChange = { name = it },
                label = "Tên hiển thị",
                placeholder = "Tên của bạn",
            )
            Spacer(Modifier.height(16.dp))
            AuthTextField(
                value = email,
                onValueChange = { email = it },
                label = "Email",
                placeholder = "ban@email.com",
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            )
            Spacer(Modifier.height(16.dp))
            AuthTextField(
                value = password,
                onValueChange = { password = it },
                label = "Mật khẩu",
                placeholder = "Tối thiểu 6 ký tự",
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            )
            error?.let {
                Spacer(Modifier.height(12.dp))
                AuthErrorText(it)
            }
            Spacer(Modifier.height(20.dp))
            AuthPrimaryButton(
                text = if (loading) "Đang tạo…" else "Tạo tài khoản",
                enabled = !loading && email.isNotBlank() && password.length >= 6,
                onClick = {
                    loading = true
                    error = null
                    scope.launch {
                        runCatching {
                            WanderTaleApp.instance.authRepository.signUp(email.trim(), password, name.trim())
                            WanderTaleApp.instance.profileRepository.ensureProfileExists(
                                displayName = name.trim(),
                                email = email.trim(),
                            )
                        }.onSuccess { onSuccess() }
                            .onFailure { error = formatAuthError(it, "Đăng ký thất bại") }
                        loading = false
                    }
                },
            )
        }
    }
}

@Composable
fun ForgotPasswordScreen(onBack: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    AuthScreenLayout(onBack = onBack, showHero = false) {
        AuthFormShell(
            kicker = "Khôi phục",
            title = "Quên mật khẩu",
            description = "Nhập email đã đăng ký — chúng tôi gửi link đặt lại mật khẩu.",
            footer = {
                Text(
                    text = "Quay lại đăng nhập",
                    color = PremiumColors.Accent,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onBack),
                )
            },
        ) {
            AuthTextField(
                value = email,
                onValueChange = { email = it },
                label = "Email",
                placeholder = "ban@email.com",
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            )
            error?.let {
                Spacer(Modifier.height(12.dp))
                AuthErrorText(it)
            }
            message?.let {
                Spacer(Modifier.height(12.dp))
                AuthSuccessText(it)
            }
            Spacer(Modifier.height(20.dp))
            AuthPrimaryButton(
                text = if (loading) "Đang gửi…" else "Gửi link",
                enabled = !loading && email.isNotBlank(),
                onClick = {
                    loading = true
                    error = null
                    message = null
                    scope.launch {
                        runCatching { WanderTaleApp.instance.authRepository.resetPassword(email.trim()) }
                            .onSuccess { message = "Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư." }
                            .onFailure { error = formatAuthError(it, "Gửi email thất bại") }
                        loading = false
                    }
                },
            )
        }
    }
}
