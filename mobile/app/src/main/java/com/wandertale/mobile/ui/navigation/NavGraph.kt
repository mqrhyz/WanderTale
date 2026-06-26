package com.wandertale.mobile.ui.navigation

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.wandertale.mobile.ui.screens.AdminPortalScreen
import com.wandertale.mobile.ui.screens.BookingScreen
import com.wandertale.mobile.ui.screens.BookingReceiptScreen
import com.wandertale.mobile.ui.screens.MyBookingsScreen
import com.wandertale.mobile.ui.screens.MyBookingsTab
import com.wandertale.mobile.ui.screens.BusinessPortalScreen
import com.wandertale.mobile.ui.screens.DashboardScreen
import com.wandertale.mobile.ui.screens.FavoritesScreen
import com.wandertale.mobile.ui.screens.ForgotPasswordScreen
import com.wandertale.mobile.ui.screens.LoginScreen
import com.wandertale.mobile.ui.screens.MainShell
import com.wandertale.mobile.ui.screens.ProfileScreen
import com.wandertale.mobile.ui.screens.RegisterScreen
import com.wandertale.mobile.ui.screens.SavedOffersScreen
import com.wandertale.mobile.ui.screens.SettingsScreen
import com.wandertale.mobile.ui.screens.SplashScreen
import com.wandertale.mobile.ui.screens.TripDetailScreen
import com.wandertale.mobile.ui.screens.TripPlannerScreen
import com.wandertale.mobile.ui.screens.TripsListScreen
import com.wandertale.mobile.ui.components.OrangeLoadingSpinner
import com.wandertale.mobile.WanderTaleApp
import com.wandertale.mobile.data.DashboardHomeCache
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun WanderTaleNavHost(darkTheme: Boolean) {
    val navController = rememberNavController()
    val scope = rememberCoroutineScope()
    val app = WanderTaleApp.instance

    fun navigateToMain() {
        navController.navigate(Routes.MAIN) {
            popUpTo(Routes.LOGIN) { inclusive = true }
        }
    }

    NavHost(navController = navController, startDestination = Routes.SPLASH) {
        composable(Routes.SPLASH) {
            SplashScreen(darkTheme = darkTheme) { loggedIn ->
                navController.navigate(if (loggedIn) Routes.MAIN else Routes.LOGIN) {
                    popUpTo(Routes.SPLASH) { inclusive = true }
                }
            }
        }
        composable(Routes.LOGIN) {
            LoginScreen(
                onBack = null,
                onSuccess = { navigateToMain() },
                onRegister = { navController.navigate(Routes.REGISTER) },
                onForgot = { navController.navigate(Routes.FORGOT) },
            )
        }
        composable(Routes.REGISTER) {
            RegisterScreen(
                onBack = { navController.popBackStack() },
                onSuccess = { navigateToMain() },
                onLogin = { navController.popBackStack() },
            )
        }
        composable(Routes.FORGOT) {
            ForgotPasswordScreen(onBack = { navController.popBackStack() })
        }
        composable(Routes.MAIN) {
            var tab by rememberSaveable { mutableStateOf("dashboard") }
            var tabBeforeCreate by rememberSaveable { mutableStateOf("dashboard") }

            fun openCreateTab() {
                if (tab != "create") tabBeforeCreate = tab
                tab = "create"
            }

            fun leaveCreateTab() {
                tab = tabBeforeCreate
            }
            var stats by remember { mutableStateOf(DashboardHomeCache.stats) }
            var trips by remember { mutableStateOf(DashboardHomeCache.trips) }
            var displayName by remember { mutableStateOf(DashboardHomeCache.displayName) }
            var isAdmin by remember { mutableStateOf(DashboardHomeCache.accountInfo?.profile?.is_admin == true) }
            var isBusiness by remember { mutableStateOf(DashboardHomeCache.accountInfo?.profile?.is_business == true) }
            var roleReady by remember { mutableStateOf(DashboardHomeCache.accountInfo?.profile != null) }
            var dashboardError by remember { mutableStateOf<String?>(null) }
            var roleError by remember { mutableStateOf<String?>(null) }
            var dashboardRefreshing by remember { mutableStateOf(false) }
            var dashboardMetricsAnimated by remember { mutableStateOf(false) }

            suspend fun applyCacheToUi() {
                stats = DashboardHomeCache.stats
                trips = DashboardHomeCache.trips
                displayName = DashboardHomeCache.displayName
                isAdmin = DashboardHomeCache.accountInfo?.profile?.is_admin == true
                isBusiness = DashboardHomeCache.accountInfo?.profile?.is_business == true
                roleReady = DashboardHomeCache.accountInfo?.profile != null
            }

            suspend fun reloadDashboard() {
                dashboardError = null
                roleError = null
                app.authRepository.initSession()
                val result = DashboardHomeCache.preload(
                    app.dashboardRepository,
                    app.tripRepository,
                    app.profileRepository,
                )
                applyCacheToUi()
                roleError = result.profileError
                dashboardError = result.summaryError
            }

            LaunchedEffect(Unit) {
                // Hiển thị cache ngay lập tức; tải mới diễn ra nền.
                if (DashboardHomeCache.accountInfo == null) {
                    reloadDashboard()
                } else {
                    applyCacheToUi()
                    reloadDashboard()
                }
            }

            LaunchedEffect(stats, dashboardMetricsAnimated) {
                if (stats != null && !dashboardMetricsAnimated) {
                    delay(950)
                    dashboardMetricsAnimated = true
                }
            }

            when {
                !roleReady && roleError != null -> Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.background),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 28.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        Text(
                            text = roleError ?: "Không tải được quyền tài khoản.",
                            color = MaterialTheme.colorScheme.onBackground,
                            textAlign = TextAlign.Center,
                        )
                        Button(
                            onClick = {
                                scope.launch {
                                    app.authRepository.signOut()
                                    DashboardHomeCache.clear()
                                    navController.navigate(Routes.LOGIN) { popUpTo(0) { inclusive = true } }
                                }
                            },
                        ) {
                            Text("Đăng xuất")
                        }
                    }
                }
                !roleReady -> Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.background),
                    contentAlignment = Alignment.Center,
                ) {
                    OrangeLoadingSpinner()
                }
                isAdmin -> AdminPortalScreen(
                    darkTheme = darkTheme,
                    onToggleTheme = { scope.launch { app.preferencesStore.setDarkMode(!darkTheme) } },
                    onLogout = {
                        scope.launch {
                            app.authRepository.signOut()
                            DashboardHomeCache.clear()
                            navController.navigate(Routes.LOGIN) { popUpTo(0) { inclusive = true } }
                        }
                    },
                )
                isBusiness -> BusinessPortalScreen(
                    darkTheme = darkTheme,
                    onToggleTheme = { scope.launch { app.preferencesStore.setDarkMode(!darkTheme) } },
                    onLogout = {
                        scope.launch {
                            app.authRepository.signOut()
                            DashboardHomeCache.clear()
                            navController.navigate(Routes.LOGIN) { popUpTo(0) { inclusive = true } }
                        }
                    },
                )
                else -> MainShell(
                    darkTheme = darkTheme,
                    currentTab = tab,
                    onTab = { tab = it },
                    onNavigate = { route ->
                        if (route == "planner") openCreateTab()
                        else navController.navigate(route)
                    },
                    onCreateTrip = { openCreateTab() },
                ) { scrollPadding ->
                    Crossfade(targetState = tab, animationSpec = tween(280), label = "main_tab") { activeTab ->
                    when (activeTab) {
                        "dashboard" -> DashboardScreen(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = scrollPadding,
                            stats = stats,
                            trips = trips,
                            displayName = displayName,
                            error = dashboardError,
                            animateMetrics = !dashboardMetricsAnimated,
                            onOpenTrip = { navController.navigate(Routes.tripDetail(it)) },
                            onNavigate = { route ->
                                if (route == "planner") openCreateTab()
                                else navController.navigate(route)
                            },
                            isRefreshing = dashboardRefreshing,
                            onRefresh = {
                                scope.launch {
                                    dashboardRefreshing = true
                                    reloadDashboard()
                                    dashboardRefreshing = false
                                }
                            },
                        )
                        "trips" -> TripsListScreen(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = scrollPadding,
                        trips = trips,
                        error = dashboardError,
                        isRefreshing = dashboardRefreshing,
                        onRefresh = {
                            scope.launch {
                                dashboardRefreshing = true
                                reloadDashboard()
                                dashboardRefreshing = false
                            }
                        },
                        onOpenTrip = { navController.navigate(Routes.tripDetail(it)) },
                        onCreateTrip = { openCreateTab() },
                    )
                        "create" -> TripPlannerScreen(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = scrollPadding,
                        tabLayout = true,
                        onBack = { leaveCreateTab() },
                        onCreated = { id ->
                            scope.launch { reloadDashboard() }
                            navController.navigate(Routes.tripDetail(id))
                        },
                    )
                        "favorites" -> MyBookingsTab(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = scrollPadding,
                        onOpenBooking = { navController.navigate(Routes.bookingDetail(it)) },
                    )
                        "profile" -> ProfileScreen(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = scrollPadding,
                        onNavigate = { navController.navigate(it) },
                        onLogout = {
                            DashboardHomeCache.clear()
                            navController.navigate(Routes.LOGIN) { popUpTo(0) { inclusive = true } }
                        },
                        onDisplayNameUpdated = { updated ->
                            if (updated.isNotBlank()) displayName = updated
                        },
                        )
                    }
                    }
                }
            }
        }
        composable(Routes.TRIP_PLANNER) {
            TripPlannerScreen(
                onBack = { navController.popBackStack() },
                onCreated = { id ->
                    navController.navigate(Routes.tripDetail(id)) { popUpTo(Routes.MAIN) }
                },
            )
        }
        composable(
            route = Routes.TRIP_DETAIL,
            arguments = listOf(navArgument("tripId") { type = NavType.StringType }),
        ) { entry ->
            val id = entry.arguments?.getString("tripId") ?: return@composable
            TripDetailScreen(
                tripId = id,
                onBack = { navController.popBackStack() },
                onDuplicated = { newId -> navController.navigate(Routes.tripDetail(newId)) { popUpTo(Routes.tripDetail(id)) { inclusive = true } } },
                onDataChanged = {
                    scope.launch {
                        DashboardHomeCache.preload(
                            app.dashboardRepository,
                            app.tripRepository,
                            app.profileRepository,
                        )
                    }
                },
                onOpenBooking = { bookingId -> navController.navigate(Routes.bookingDetail(bookingId)) },
            )
        }
        composable(Routes.SETTINGS) { SettingsScreen(onBack = { navController.popBackStack() }) }
        composable(Routes.SAVED_OFFERS) { SavedOffersScreen(onBack = { navController.popBackStack() }) }
        composable(Routes.BOOKING) {
            MyBookingsScreen(
                onBack = { navController.popBackStack() },
                onOpenBooking = { navController.navigate(Routes.bookingDetail(it)) },
            )
        }
        composable(
            route = Routes.BOOKING_DETAIL,
            arguments = listOf(navArgument("bookingId") { type = NavType.StringType }),
        ) { entry ->
            val id = entry.arguments?.getString("bookingId") ?: return@composable
            BookingReceiptScreen(bookingId = id, onBack = { navController.popBackStack() })
        }
        composable(Routes.ADMIN) {
            AdminPortalScreen(
                onBack = { navController.popBackStack() },
                darkTheme = darkTheme,
                onToggleTheme = { scope.launch { app.preferencesStore.setDarkMode(!darkTheme) } },
                onLogout = {
                    scope.launch {
                        app.authRepository.signOut()
                        DashboardHomeCache.clear()
                        navController.navigate(Routes.LOGIN) { popUpTo(0) { inclusive = true } }
                    }
                },
            )
        }
        composable(Routes.BUSINESS) {
            BusinessPortalScreen(
                onBack = { navController.popBackStack() },
                darkTheme = darkTheme,
                onToggleTheme = { scope.launch { app.preferencesStore.setDarkMode(!darkTheme) } },
                onLogout = {
                    scope.launch {
                        app.authRepository.signOut()
                        DashboardHomeCache.clear()
                        navController.navigate(Routes.LOGIN) { popUpTo(0) { inclusive = true } }
                    }
                },
            )
        }
    }
}
