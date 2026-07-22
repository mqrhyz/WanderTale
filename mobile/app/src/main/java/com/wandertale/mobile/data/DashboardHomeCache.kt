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
    @Volatile var stats: DashboardStats? = null
    @Volatile var trips: List<TripRecord> = emptyList()
    @Volatile var displayName: String = "Xin chào"
    @Volatile var accountInfo: AccountInfo? = null
    /** Last known PRO status from /user/subscription (expiry-aware). */
    @Volatile var isProMember: Boolean? = null
    @Volatile var subscriptionExpiresAt: String? = null

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
        isProMember = null
        subscriptionExpiresAt = null
    }

    fun updateAccountPhone(phone: String) {
        val current = accountInfo ?: return
        accountInfo = current.copy(
            phone = phone,
            profile = current.profile?.copy(phone = phone.ifBlank { null }),
        )
    }

    fun updateAccountDisplayName(name: String) {
        val trimmed = name.trim()
        if (trimmed.isBlank()) return
        displayName = trimmed
        val current = accountInfo ?: return
        accountInfo = current.copy(
            displayName = trimmed,
            profile = current.profile?.copy(display_name = trimmed),
        )
    }

    fun updateAccountProfile(displayName: String?, phone: String?) {
        displayName?.trim()?.takeIf { it.isNotBlank() }?.let { updateAccountDisplayName(it) }
        if (phone != null) updateAccountPhone(phone)
    }

    suspend fun preload(
        dashboard: DashboardRepository,
        tripsRepo: TripRepository,
        profile: ProfileRepository,
    ): PreloadResult = coroutineScope {
        var profileError: String? = null
        var statsError: String? = null
        var tripsError: String? = null

        // Chạy song song để giảm thời gian khởi động; lỗi profile vẫn giữ cache cũ.
        val profileDeferred = async { runCatching { profile.getAccountInfo() } }
        val statsDeferred = async { runCatching { dashboard.stats() } }
        val tripsDeferred = async { runCatching { tripsRepo.list() } }

        profileDeferred.await()
            .onSuccess { info ->
                accountInfo = info
                info.displayName.takeIf { it.isNotBlank() }?.let { displayName = it }
                // Soft seed from profile flags (may be stale); refreshProStatus overwrites with overview.
                if (isProMember == null) {
                    val tier = info.profile?.subscription_tier?.lowercase()
                    isProMember = info.profile?.is_premium == true || tier == "pro" || tier == "premium"
                    subscriptionExpiresAt = info.profile?.subscription_expires_at
                }
                if (info.profile == null) {
                    profileError = "Không tải được quyền tài khoản. Vui lòng kiểm tra mạng rồi đăng nhập lại."
                }
            }
            .onFailure {
                profileError = formatApiError(it, "Không tải được quyền tài khoản")
            }

        val role = accountInfo?.profile
        if (role != null && !role.is_admin && !role.is_business) {
            // Dark mode preference không nên bị ảnh hưởng bởi data loading
            statsDeferred.await()
                .onSuccess { stats = it }
                .onFailure { statsError = formatApiError(it, "Không tải thống kê") }
            tripsDeferred.await()
                .onSuccess { trips = it }
                .onFailure { tripsError = formatApiError(it, "Không tải chuyến đi") }
        }

        PreloadResult(
            profileError = profileError,
            statsError = statsError,
            tripsError = tripsError,
        )
    }
}
