package com.wandertale.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.wandertale.mobile.ui.navigation.WanderTaleNavHost
import com.wandertale.mobile.ui.theme.PremiumColors
import com.wandertale.mobile.ui.theme.WanderTaleTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val app = application as WanderTaleApp

        setContent {
            val dark by app.preferencesStore.darkMode.collectAsState(initial = false)
            PremiumColors.darkModeEnabled = dark
            WanderTaleTheme(darkTheme = dark) {
                WanderTaleNavHost(darkTheme = dark)
            }
        }
    }
}
