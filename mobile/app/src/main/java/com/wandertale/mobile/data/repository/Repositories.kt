package com.wandertale.mobile.data.repository

import android.content.Context
import com.wandertale.mobile.BuildConfig
import com.wandertale.mobile.data.api.ApiClient
import com.wandertale.mobile.data.model.AccountInfo
import com.wandertale.mobile.data.model.PartnerRow
import com.wandertale.mobile.data.model.ProfileInsert
import com.wandertale.mobile.data.model.ProfilePhonePatch
import com.wandertale.mobile.data.model.ProfileRow
import com.wandertale.mobile.data.model.VoucherRow
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.Facebook
import io.github.jan.supabase.auth.providers.Google
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.from
import io.ktor.client.engine.okhttp.OkHttp
import kotlin.time.Duration.Companion.seconds
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class AuthRepository(@Suppress("UNUSED_PARAMETER") context: Context) {
    val supabase = createSupabaseClient(
        supabaseUrl = BuildConfig.SUPABASE_URL,
        supabaseKey = BuildConfig.SUPABASE_ANON_KEY,
    ) {
        requestTimeout = 60.seconds
        httpEngine = OkHttp.create()
        install(Auth) {
            scheme = "wandertale"
            host = "login-callback"
        }
        install(Postgrest)
    }

    suspend fun initSession() {
        supabase.auth.loadFromStorage(autoRefresh = true)
        ApiClient.setTokenProvider { supabase.auth.currentAccessTokenOrNull() }
    }

    fun currentUserId(): String? = supabase.auth.currentUserOrNull()?.id
    fun currentUserEmail(): String? = supabase.auth.currentUserOrNull()?.email

    suspend fun refreshCurrentUser() {
        runCatching { supabase.auth.retrieveUserForCurrentSession() }
    }

    fun accessToken(): String? = supabase.auth.currentAccessTokenOrNull()
    fun isLoggedIn(): Boolean = accessToken() != null

    suspend fun signIn(email: String, password: String) {
        supabase.auth.signInWith(Email) {
            this.email = email
            this.password = password
        }
        ApiClient.setTokenProvider { supabase.auth.currentAccessTokenOrNull() }
    }

    suspend fun signUp(email: String, password: String, displayName: String) {
        supabase.auth.signUpWith(Email) {
            this.email = email
            this.password = password
            data = buildJsonObject { put("display_name", displayName) }
        }
        ApiClient.setTokenProvider { supabase.auth.currentAccessTokenOrNull() }
    }

    /** Opens the browser OAuth flow for Google. Session arrives via deep link
     *  (handled in MainActivity) and updates [io.github.jan.supabase.auth.Auth.sessionStatus]. */
    suspend fun signInWithGoogle() {
        supabase.auth.signInWith(Google)
    }

    suspend fun signInWithFacebook() {
        supabase.auth.signInWith(Facebook)
    }

    suspend fun resetPassword(email: String) {
        supabase.auth.resetPasswordForEmail(email)
    }

    suspend fun signOut() {
        supabase.auth.signOut()
    }
}

class ProfileRepository(private val auth: AuthRepository) {
    private suspend fun fetchProfile(uid: String): ProfileRow? =
        auth.supabase.from("profiles")
            .select { filter { eq("id", uid) } }
            .decodeSingleOrNull<ProfileRow>()

    private fun accountInfoFrom(profile: ProfileRow, authEmailFallback: String): AccountInfo =
        AccountInfo(
            displayName = profile.display_name?.trim()?.takeIf { it.isNotBlank() } ?: "Khách du lịch",
            email = profile.email?.trim()?.takeIf { it.isNotBlank() } ?: authEmailFallback,
            phone = profile.phone?.trim().orEmpty(),
            profile = profile,
        )

    /** Fallback when DB trigger did not run (legacy projects). */
    suspend fun ensureProfileExists(displayName: String? = null, email: String? = null) {
        val uid = auth.currentUserId() ?: return
        if (fetchProfile(uid) != null) return

        auth.refreshCurrentUser()
        val authEmail = email?.trim()?.takeIf { it.isNotBlank() } ?: auth.currentUserEmail().orEmpty()
        val name = displayName?.trim()?.takeIf { it.isNotBlank() }
            ?: authEmail.substringBefore("@").trim().takeIf { it.isNotBlank() }
            ?: "Khách du lịch"

        runCatching {
            auth.supabase.from("profiles").insert(
                ProfileInsert(id = uid, display_name = name, email = authEmail),
            )
        }
    }

    suspend fun getAccountInfo(): AccountInfo {
        auth.refreshCurrentUser()
        val uid = auth.currentUserId() ?: return AccountInfo("Khách du lịch", "", "")
        val authEmail = auth.currentUserEmail().orEmpty()

        var profile = fetchProfile(uid)
        if (profile == null) {
            ensureProfileExists(email = authEmail)
            profile = fetchProfile(uid)
        }

        return profile?.let { accountInfoFrom(it, authEmail) }
            ?: AccountInfo("Khách du lịch", authEmail, "")
    }

    suspend fun getProfile(): AccountInfo = getAccountInfo()

    suspend fun updatePhone(phone: String?) {
        val uid = auth.currentUserId() ?: error("Chưa đăng nhập")
        val trimmedPhone = phone?.trim().orEmpty()
        auth.supabase.from("profiles").update(ProfilePhonePatch(trimmedPhone.takeIf { it.isNotBlank() })) {
            filter { eq("id", uid) }
        }
    }
}

class AdminRepository(
    private val auth: AuthRepository,
    private val profileRepository: ProfileRepository,
) {
    suspend fun isAdmin(): Boolean = profileRepository.getProfile().profile?.is_admin == true

    suspend fun listPartners(): List<PartnerRow> =
        auth.supabase.from("partners").select().decodeList()

    suspend fun listVouchersAdmin(): List<VoucherRow> =
        auth.supabase.from("vouchers")
            .select(columns = io.github.jan.supabase.postgrest.query.Columns.raw("id, code, title, valid_from, valid_until, partners(name)"))
            .decodeList()
}

class TripRepository {
    suspend fun list() = ApiClient.listTrips()
    suspend fun get(id: String) = ApiClient.getTrip(id)
    suspend fun streamUpdates(tripId: String, onEvent: (String) -> Unit) =
        ApiClient.streamTripUpdates(tripId, onEvent)
    suspend fun delete(id: String) = ApiClient.deleteTrip(id)
    suspend fun duplicate(id: String) = ApiClient.duplicateTrip(id)
    suspend fun preview(destination: String) = ApiClient.previewTrip(destination)
    suspend fun generate(body: com.wandertale.mobile.data.model.TripGenerateRequest) =
        ApiClient.generateTrip(body)
}

class DashboardRepository {
    suspend fun stats() = ApiClient.dashboard()
}
