package com.wandertale.mobile.data

import com.wandertale.mobile.data.model.AccountInfo
import com.wandertale.mobile.data.model.DashboardStats
import com.wandertale.mobile.data.model.TripRecord
import com.wandertale.mobile.data.repository.DashboardRepository
import com.wandertale.mobile.data.repository.ProfileRepository
import com.wandertale.mobile.data.repository.TripRepository
import com.wandertale.mobile.util.formatApiError
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

/** In-memory cache so Home / Profile stay visible when switching tabs. */
object DashboardHomeCache {
    var stats: DashboardStats? = null
    var trips: List<TripRecord> = emptyList()
    var displayName: String = "Xin chào"
    var accountInfo: AccountInfo? = null

    data class PreloadResult(
        val statsError: String? = null,
        val tripsError: String? = null,
    ) {
        val summaryError: String?
            get() {
                if (statsError == null && tripsError == null) return null
                val errors = listOfNotNull(statsError, tripsError).distinct()
                return when {
                    errors.isEmpty() -> null
                    errors.size == 1 -> errors.first()
                    else -> "Không tải được dữ liệu. Kiểm tra backend đang chạy."
                }
            }
    }

    fun clear() {
        stats = null
        trips = emptyList()
        displayName = "Xin chào"
        accountInfo = null
    }

    fun updateAccountPhone(phone: String) {
        val current = accountInfo ?: return
        accountInfo = current.copy(
            phone = phone,
            profile = current.profile?.copy(phone = phone.ifBlank { null }),
        )
    }

    suspend fun preload(
        dashboard: DashboardRepository,
        tripsRepo: TripRepository,
        profile: ProfileRepository,
    ): PreloadResult = coroutineScope {
        var statsError: String? = null
        var tripsError: String? = null

        val statsJob = async {
            runCatching { dashboard.stats() }
                .onSuccess { stats = it }
                .onFailure { statsError = formatApiError(it, "Không tải thống kê") }
        }
        val tripsJob = async {
            runCatching { tripsRepo.list() }
                .onSuccess { trips = it }
                .onFailure { tripsError = formatApiError(it, "Không tải chuyến đi") }
        }
        val profileJob = async {
            runCatching { profile.getAccountInfo() }
                .onSuccess { info ->
                    accountInfo = info
                    info.displayName.takeIf { it.isNotBlank() }?.let { displayName = it }
                }
        }
        statsJob.await()
        tripsJob.await()
        profileJob.await()

        PreloadResult(
            statsError = statsError,
            tripsError = tripsError,
        )
    }
}
