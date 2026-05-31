package com.wandertale.mobile.data.api

import com.wandertale.mobile.BuildConfig
import com.wandertale.mobile.data.model.ApiErrorBody
import com.wandertale.mobile.data.model.DashboardStats
import com.wandertale.mobile.data.model.GeocodeAutocompleteResponse
import com.wandertale.mobile.data.model.TripGenerateRequest
import com.wandertale.mobile.data.model.TripGenerateResponse
import com.wandertale.mobile.data.model.TripPreviewResponse
import com.wandertale.mobile.data.model.AdminBusinessList
import com.wandertale.mobile.data.model.AdminBusinessRow
import com.wandertale.mobile.data.model.AdminOverview
import com.wandertale.mobile.data.model.AdminUserCreate
import com.wandertale.mobile.data.model.AdminUserDetail
import com.wandertale.mobile.data.model.AdminUserList
import com.wandertale.mobile.data.model.AdminUserRow
import com.wandertale.mobile.data.model.AdPackageList
import com.wandertale.mobile.data.model.AdPurchaseResponse
import com.wandertale.mobile.data.model.AiConfigList
import com.wandertale.mobile.data.model.AiConfigPatch
import com.wandertale.mobile.data.model.AiConfigRow
import com.wandertale.mobile.data.model.BusinessOverview
import com.wandertale.mobile.data.model.BusinessCampaignCreate
import com.wandertale.mobile.data.model.BusinessCampaignList
import com.wandertale.mobile.data.model.BusinessCampaignRow
import com.wandertale.mobile.data.model.BusinessLocationCreate
import com.wandertale.mobile.data.model.BusinessLocationList
import com.wandertale.mobile.data.model.BusinessLocationRow
import com.wandertale.mobile.data.model.BusinessReviewList
import com.wandertale.mobile.data.model.BusinessReviewRow
import com.wandertale.mobile.data.model.BusinessStatusPatch
import com.wandertale.mobile.data.model.BusinessVoucherCreate
import com.wandertale.mobile.data.model.BusinessVoucherList
import com.wandertale.mobile.data.model.BusinessVoucherRow
import com.wandertale.mobile.data.model.PlatformTransactionList
import com.wandertale.mobile.data.model.ReviewReplyPatch
import com.wandertale.mobile.data.model.SystemLogList
import com.wandertale.mobile.data.model.TripRecord
import com.wandertale.mobile.data.model.UserRolePatch
import com.wandertale.mobile.data.model.UserStatusPatch
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

class ApiException(message: String, val statusCode: Int? = null) : Exception(message)

object ApiClient {
    val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        coerceInputValues = true
        explicitNulls = false
    }

    private var tokenProvider: () -> String? = { null }

    fun setTokenProvider(provider: () -> String?) {
        tokenProvider = provider
    }

    val http = HttpClient(OkHttp) {
        install(ContentNegotiation) { json(json) }
        install(HttpTimeout) {
            requestTimeoutMillis = 300_000
            connectTimeoutMillis = 60_000
            socketTimeoutMillis = 300_000
        }
        engine {
            preconfigured = OkHttpClient.Builder()
                .connectTimeout(60, TimeUnit.SECONDS)
                .readTimeout(300, TimeUnit.SECONDS)
                .writeTimeout(300, TimeUnit.SECONDS)
                .build()
        }
    }

    private fun baseUrl(): String = BuildConfig.API_URL.trimEnd('/')

    private suspend inline fun <reified T> authorized(
        crossinline block: suspend (token: String) -> T,
    ): T {
        val token = tokenProvider() ?: throw ApiException("Chưa đăng nhập")
        return block(token)
    }

    private suspend fun parseError(e: ClientRequestException): ApiException {
        val text = runCatching { e.response.bodyAsText() }.getOrDefault("")
        val msg = runCatching {
            json.decodeFromString<ApiErrorBody>(text).message
                ?: json.decodeFromString<ApiErrorBody>(text).error?.toString()
        }.getOrNull() ?: text.ifBlank { "HTTP ${e.response.status.value}" }
        return ApiException(msg, e.response.status.value)
    }

    suspend fun listTrips(): List<TripRecord> = authorized { token ->
        http.get("${baseUrl()}/api/trips") {
            header("Authorization", "Bearer $token")
        }.body()
    }

    suspend fun getTrip(id: String): TripRecord = authorized { token ->
        http.get("${baseUrl()}/api/trips/$id") {
            header("Authorization", "Bearer $token")
        }.body()
    }

    /** SSE trip updates — calls [onEvent] for each server event; returns when stream closes. */
    suspend fun streamTripUpdates(
        tripId: String,
        onEvent: (String) -> Unit,
    ) = authorized { token ->
        withContext(Dispatchers.IO) {
            val client = OkHttpClient.Builder()
                .connectTimeout(60, TimeUnit.SECONDS)
                .readTimeout(0, TimeUnit.MILLISECONDS)
                .build()
            val request = Request.Builder()
                .url("${baseUrl()}/api/trips/$tripId/stream")
                .header("Authorization", "Bearer $token")
                .header("Accept", "text/event-stream")
                .build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) throw ApiException("SSE HTTP ${response.code}", response.code)
                val body = response.body ?: return@withContext
                val reader = body.charStream().buffered()
                var dataLine: String? = null
                reader.forEachLine { line ->
                    when {
                        line.startsWith("data:") -> dataLine = line.removePrefix("data:").trim()
                        line.isBlank() && dataLine != null -> {
                            onEvent(dataLine!!)
                            dataLine = null
                        }
                    }
                }
            }
        }
    }

    suspend fun deleteTrip(id: String) = authorized { token ->
        http.delete("${baseUrl()}/api/trips/$id") {
            header("Authorization", "Bearer $token")
        }
    }

    suspend fun duplicateTrip(id: String): TripRecord = authorized { token ->
        http.post("${baseUrl()}/api/trips/$id/duplicate") {
            header("Authorization", "Bearer $token")
        }.body()
    }

    suspend fun previewTrip(destination: String): TripPreviewResponse = authorized { token ->
        http.get("${baseUrl()}/api/trips/preview") {
            header("Authorization", "Bearer $token")
            parameter("destination", destination)
        }.body()
    }

    suspend fun geocodeAutocomplete(text: String): GeocodeAutocompleteResponse = authorized { token ->
        try {
            http.get("${baseUrl()}/api/geocode/autocomplete") {
                header("Authorization", "Bearer $token")
                parameter("text", text.trim())
            }.body()
        } catch (e: ClientRequestException) {
            throw parseError(e)
        }
    }

    suspend fun generateTrip(body: TripGenerateRequest): TripGenerateResponse = authorized { token ->
        try {
            val response = http.post("${baseUrl()}/api/trips/generate") {
                header("Authorization", "Bearer $token")
                contentType(ContentType.Application.Json)
                setBody(body)
            }
            when (response.status) {
                HttpStatusCode.Accepted, HttpStatusCode.OK -> response.body()
                else -> throw ApiException(response.bodyAsText(), response.status.value)
            }
        } catch (e: ClientRequestException) {
            throw parseError(e)
        }
    }

    suspend fun dashboard(): DashboardStats = authorized { token ->
        http.get("${baseUrl()}/api/dashboard") {
            header("Authorization", "Bearer $token")
        }.body()
    }

    suspend fun businessOverview(): BusinessOverview = portalGet("/api/business/overview")
    suspend fun businessTransactions(): PlatformTransactionList = portalGet("/api/business/transactions")
    suspend fun businessAdPackages(): AdPackageList = portalGet("/api/business/ad-packages")
    suspend fun purchaseAdPackage(id: String): AdPurchaseResponse = portalPost("/api/business/ad-packages/$id/purchase")
    suspend fun businessCampaigns(): BusinessCampaignList = portalGet("/api/business/campaigns")
    suspend fun createBusinessCampaign(body: BusinessCampaignCreate): BusinessCampaignRow =
        portalPost("/api/business/campaigns", body)

    suspend fun businessVouchers(): BusinessVoucherList = portalGet("/api/business/vouchers")
    suspend fun createBusinessVoucher(body: BusinessVoucherCreate): BusinessVoucherRow =
        portalPost("/api/business/vouchers", body)

    suspend fun businessLocations(): BusinessLocationList = portalGet("/api/business/locations")
    suspend fun createBusinessLocation(body: BusinessLocationCreate): BusinessLocationRow =
        portalPost("/api/business/locations", body)

    suspend fun businessReviews(): BusinessReviewList = portalGet("/api/business/reviews")
    suspend fun replyBusinessReview(reviewId: String, reply: String): BusinessReviewRow =
        portalPatch("/api/business/reviews/$reviewId/reply", ReviewReplyPatch(reply))

    suspend fun adminOverview(): AdminOverview = portalGet("/api/admin/overview")
    suspend fun adminTransactions(): PlatformTransactionList = portalGet("/api/admin/transactions")
    suspend fun adminUsers(): AdminUserList = portalGet("/api/admin/users")
    suspend fun adminCreateUser(body: AdminUserCreate): AdminUserRow = portalPost("/api/admin/users", body)
    suspend fun adminBusinesses(): AdminBusinessList = portalGet("/api/admin/businesses")
    suspend fun adminAiConfig(): AiConfigList = portalGet("/api/admin/ai-config")
    suspend fun adminUserDetail(userId: String): AdminUserDetail = portalGet("/api/admin/users/$userId")
    suspend fun adminSystemLogs(): SystemLogList = portalGet("/api/admin/system-logs")

    suspend fun adminUpdateUserRole(userId: String, patch: UserRolePatch): AdminUserRow =
        portalPatch("/api/admin/users/$userId/role", patch)

    suspend fun adminUpdateUserStatus(userId: String, status: String): AdminUserRow =
        portalPatch("/api/admin/users/$userId/status", UserStatusPatch(status))

    suspend fun adminUpdateBusinessStatus(businessId: String, status: String): AdminBusinessRow =
        portalPatch("/api/admin/businesses/$businessId/status", BusinessStatusPatch(status))

    suspend fun adminToggleAiEnabled(key: String, enabled: Boolean): AiConfigRow =
        portalPatch("/api/admin/ai-config/$key", AiConfigPatch(mapOf("enabled" to JsonPrimitive(enabled))))

    private suspend inline fun <reified T> portalGet(path: String): T = authorized { token ->
        try {
            http.get("${baseUrl()}$path") { header("Authorization", "Bearer $token") }.body()
        } catch (e: ClientRequestException) {
            throw parseError(e)
        }
    }

    private suspend inline fun <reified T> portalPost(path: String): T = authorized { token ->
        try {
            http.post("${baseUrl()}$path") { header("Authorization", "Bearer $token") }.body()
        } catch (e: ClientRequestException) {
            throw parseError(e)
        }
    }

    private suspend inline fun <reified T, reified B> portalPost(path: String, body: B): T = authorized { token ->
        try {
            http.post("${baseUrl()}$path") {
                header("Authorization", "Bearer $token")
                contentType(ContentType.Application.Json)
                setBody(body)
            }.body()
        } catch (e: ClientRequestException) {
            throw parseError(e)
        }
    }

    private suspend inline fun <reified T, reified B> portalPatch(path: String, body: B): T = authorized { token ->
        try {
            http.patch("${baseUrl()}$path") {
                header("Authorization", "Bearer $token")
                contentType(ContentType.Application.Json)
                setBody(body)
            }.body()
        } catch (e: ClientRequestException) {
            throw parseError(e)
        }
    }
}
