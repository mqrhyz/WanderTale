package com.wandertale.mobile

import android.app.Application
import coil.ImageLoader
import coil.Coil
import com.wandertale.mobile.data.local.PreferencesStore
import com.wandertale.mobile.data.repository.AdminRepository
import com.wandertale.mobile.data.repository.AuthRepository
import com.wandertale.mobile.data.repository.DashboardRepository
import com.wandertale.mobile.data.repository.ProfileRepository
import com.wandertale.mobile.data.repository.TripRepository

class WanderTaleApp : Application() {
    lateinit var authRepository: AuthRepository
        private set
    lateinit var profileRepository: ProfileRepository
        private set
    lateinit var adminRepository: AdminRepository
        private set
    lateinit var tripRepository: TripRepository
        private set
    lateinit var dashboardRepository: DashboardRepository
        private set
    lateinit var preferencesStore: PreferencesStore
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        // Wikimedia Commons trả 403 nếu thiếu User-Agent — Coil mặc định có thể bị chặn.
        val imageLoader = ImageLoader.Builder(this)
            .okHttpClient {
                okhttp3.OkHttpClient.Builder()
                    .addInterceptor { chain ->
                        chain.proceed(
                            chain.request().newBuilder()
                                .header("User-Agent", "WanderTale/1.0 (Android; travel-app)")
                                .header("Accept", "image/*,*/*")
                                .build()
                        )
                    }
                    .build()
            }
            .build()
        Coil.setImageLoader(imageLoader)

        authRepository = AuthRepository(this)
        profileRepository = ProfileRepository(authRepository)
        adminRepository = AdminRepository(authRepository, profileRepository)
        tripRepository = TripRepository()
        dashboardRepository = DashboardRepository()
        preferencesStore = PreferencesStore(this)
    }

    companion object {
        lateinit var instance: WanderTaleApp
            private set
    }
}
