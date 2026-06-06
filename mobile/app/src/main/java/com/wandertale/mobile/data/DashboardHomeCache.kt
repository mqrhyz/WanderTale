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
        val profileError: String? = null,
        val statsError: String? = null,
        val tripsError: String? = null,
    ) {
        val summaryError: String?
            get() {
                if (profileError == null && statsError == null && tripsError == null) return null
                val errors = listOfNotNull(profileError, statsError, tripsError).distinct()
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
        var profileError: String? = null
        var statsError: String? = null
        var tripsError: String? = null

        val profileResult = runCatching { profile.getAccountInfo() }
        profileResult
            .onSuccess { info ->
                accountInfo = info
                info.displayName.takeIf { it.isNotBlank() }?.let { displayName = it }
                if (info.profile == null) {
                    profileError = "Không tải được quyền tài khoản. Vui lòng kiểm tra mạng rồi đăng nhập lại."
                }
            }
            .onFailure {
                profileError = formatApiError(it, "Không tải được quyền tài khoản")
            }

        val role = accountInfo?.profile
        if (role != null && !role.is_admin && !role.is_business) {
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
            statsJob.await()
            tripsJob.await()
        }

        PreloadResult(
            profileError = profileError,
            statsError = statsError,
            tripsError = tripsError,
        )
    }
}
