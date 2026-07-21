package com.wandertale.mobile

import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.wandertale.mobile.ui.navigation.WanderTaleNavHost
import com.wandertale.mobile.ui.theme.WanderTaleTheme
import io.github.jan.supabase.auth.handleDeeplinks

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        // Force light UI mode even if the system/device is dark (no dark theme in app).
        val config = Configuration(resources.configuration)
        config.uiMode = (config.uiMode and Configuration.UI_MODE_NIGHT_MASK.inv()) or Configuration.UI_MODE_NIGHT_NO
        @Suppress("DEPRECATION")
        resources.updateConfiguration(config, resources.displayMetrics)
        enableEdgeToEdge()

        val app = application as WanderTaleApp
        // Capture the OAuth redirect if the app was launched by the deep link.
        runCatching { app.authRepository.supabase.handleDeeplinks(intent) }

        setContent {
            WanderTaleTheme {
                WanderTaleNavHost()
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val app = application as WanderTaleApp
        runCatching { app.authRepository.supabase.handleDeeplinks(intent) }
    }
}
