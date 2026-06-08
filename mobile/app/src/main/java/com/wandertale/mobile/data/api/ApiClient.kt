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
import com.wandertale.mobile.data.model.AdPackageAdminList
import com.wandertale.mobile.data.model.AdPackageAdminRow
import com.wandertale.mobile.data.model.AdPackageCreate
import com.wandertale.mobile.data.model.AdPurchaseResponse
import com.wandertale.mobile.data.model.AiConfigList
import com.wandertale.mobile.data.model.AiConfigPatch
import com.wandertale.mobile.data.model.AiConfigRow
import com.wandertale.mobile.data.model.AiRecommendationRule
import com.wandertale.mobile.data.model.AiRecommendationRuleCreate
import com.wandertale.mobile.data.model.AiRecommendationRuleList
import com.wandertale.mobile.data.model.AiRecommendationRulePatch
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
import com.wandertale.mobile.data.model.BookingCreate
import com.wandertale.mobile.data.model.BookingPayResponse
import com.wandertale.mobile.data.model.BookingRecord
import com.wandertale.mobile.data.model.BusinessMediaCreate
import com.wandertale.mobile.data.model.BusinessMediaList
import com.wandertale.mobile.data.model.BusinessMediaRow
import com.wandertale.mobile.data.model.BusinessProfilePatch
import com.wandertale.mobile.data.model.BusinessProfileRow
import com.wandertale.mobile.data.model.MediaStatusPatch
import com.wandertale.mobile.data.model.PackagePurchaseRequest
import com.wandertale.mobile.data.model.PayoutList
import com.wandertale.mobile.data.model.PayoutRecord
import com.wandertale.mobile.data.model.PlatformTransactionList
import com.wandertale.mobile.data.model.Promotion
import com.wandertale.mobile.data.model.PromotionHomePayload
import com.wandertale.mobile.data.model.PromotionList
import com.wandertale.mobile.data.model.PromotionPost
import com.wandertale.mobile.data.model.PromotionPostCreate
import com.wandertale.mobile.data.model.PromotionPostList
import com.wandertale.mobile.data.model.PromotionVoucherCreate
import com.wandertale.mobile.data.model.ReviewReplyPatch
import com.wandertale.mobile.data.model.SystemLogList
import com.wandertale.mobile.data.model.TripRecord
import com.wandertale.mobile.data.model.UserSubscriptionOverview
import com.wandertale.mobile.data.model.UserSubscriptionPurchaseRequest
import com.wandertale.mobile.data.model.UserRolePatch
import com.wandertale.mobile.data.model.UserStatusPatch
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.ResponseException
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
import com.wandertale.mobile.data.model.UploadImageResponse
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

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
        expectSuccess = true
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

    private suspend fun parseError(e: ResponseException): ApiException {
        val text = runCatching { e.response.bodyAsText() }.getOrDefault("")
        val msg = runCatching {
            json.decodeFromString<ApiErrorBody>(text).message
                ?: json.decodeFromString<ApiErrorBody>(text).error?.toString()
        }.getOrNull() ?: text.ifBlank { "HTTP ${e.response.status.value}" }
        return ApiException(msg, e.response.status.value)
    }

    suspend fun listTrips(): List<TripRecord> = authorized { token ->
        try {
            http.get("${baseUrl()}/api/trips") {
                header("Authorization", "Bearer $token")
            }.body()
        } catch (e: ResponseException) {
            throw parseError(e)
        }
    }

    suspend fun getTrip(id: String): TripRecord = authorized { token ->
        try {
            http.get("${baseUrl()}/api/trips/$id") {
                header("Authorization", "Bearer $token")
            }.body()
        } catch (e: ResponseException) {
            throw parseError(e)
        }
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
        try {
            http.delete("${baseUrl()}/api/trips/$id") {
                header("Authorization", "Bearer $token")
            }
        } catch (e: ResponseException) {
            throw parseError(e)
        }
    }

    suspend fun duplicateTrip(id: String): TripRecord = authorized { token ->
        try {
            http.post("${baseUrl()}/api/trips/$id/duplicate") {
                header("Authorization", "Bearer $token")
            }.body()
        } catch (e: ResponseException) {
            throw parseError(e)
        }
    }

    suspend fun previewTrip(destination: String): TripPreviewResponse = authorized { token ->
        try {
            http.get("${baseUrl()}/api/trips/preview") {
                header("Authorization", "Bearer $token")
                parameter("destination", destination)
            }.body()
        } catch (e: ResponseException) {
            throw parseError(e)
        }
    }

    suspend fun geocodeAutocomplete(text: String): GeocodeAutocompleteResponse = authorized { token ->
        try {
            http.get("${baseUrl()}/api/geocode/autocomplete") {
                header("Authorization", "Bearer $token")
                parameter("text", text.trim())
            }.body()
        } catch (e: ResponseException) {
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
        } catch (e: ResponseException) {
            throw parseError(e)
        }
    }

    suspend fun dashboard(): DashboardStats = authorized { token ->
        try {
            http.get("${baseUrl()}/api/dashboard") {
                header("Authorization", "Bearer $token")
            }.body()
        } catch (e: ResponseException) {
            throw parseError(e)
        }
    }

    suspend fun promotionHome(): PromotionHomePayload = portalGet("/api/promotions")
    suspend fun promotionPost(id: String): PromotionPost = portalGet("/api/promotions/posts/$id")
    suspend fun savePromotionVoucher(id: String): Map<String, Boolean> = portalPost("/api/promotions/vouchers/$id/save")
    suspend fun unsavePromotionVoucher(id: String): Map<String, Boolean> = portalDelete("/api/promotions/vouchers/$id/save")

    suspend fun userSubscription(): UserSubscriptionOverview = portalGet("/api/user/subscription")
    suspend fun purchaseUserSubscription(packageId: String, voucherId: String?): AdPurchaseResponse =
        portalPost("/api/user/subscription/purchase", UserSubscriptionPurchaseRequest(packageId, voucherId))

    suspend fun businessOverview(): BusinessOverview = portalGet("/api/business/overview")
    suspend fun businessTransactions(): PlatformTransactionList = portalGet("/api/business/transactions")
    suspend fun businessAdPackages(): AdPackageList = portalGet("/api/business/ad-packages")
    suspend fun purchaseAdPackage(id: String): AdPurchaseResponse = portalPost("/api/business/ad-packages/$id/purchase")
    suspend fun businessAdOrderStatus(id: String): com.wandertale.mobile.data.model.AdOrder =
        portalGet("/api/business/ad-orders/$id")

    // --- Sponsored locations + reviews ---
    suspend fun sponsoredLocations(city: String, maxPrice: Double? = null): List<com.wandertale.mobile.data.model.SponsoredLocation> {
        val enc = java.net.URLEncoder.encode(city, "UTF-8")
        val q = "/api/locations/sponsored?city=$enc" + (maxPrice?.takeIf { it > 0 }?.let { "&max_price=${it.toLong()}" } ?: "")
        return portalGet<com.wandertale.mobile.data.model.SponsoredLocationList>(q).items
    }
    suspend fun locationDetail(id: String): com.wandertale.mobile.data.model.LocationDetail =
        portalGet("/api/locations/$id")
    suspend fun locationReviews(id: String): List<com.wandertale.mobile.data.model.LocationReview> =
        portalGet<com.wandertale.mobile.data.model.LocationReviewList>("/api/locations/$id/reviews").items
    suspend fun createLocationReview(id: String, rating: Int, comment: String?): com.wandertale.mobile.data.model.LocationReview =
        portalPost("/api/locations/$id/reviews", com.wandertale.mobile.data.model.LocationReviewCreate(rating, comment))
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
    suspend fun adminPromotionVouchers(): PromotionList = portalGet("/api/admin/promotion-vouchers")
    suspend fun adminCreatePromotionVoucher(body: PromotionVoucherCreate): Promotion =
        portalPost("/api/admin/promotion-vouchers", body)
    suspend fun adminUpdatePromotionVoucher(id: String, body: PromotionVoucherCreate): Promotion =
        portalPatch("/api/admin/promotion-vouchers/$id", body)
    suspend fun adminDeletePromotionVoucher(id: String): Map<String, Boolean> =
        portalDelete("/api/admin/promotion-vouchers/$id")
    suspend fun adminPromotionPosts(): PromotionPostList = portalGet("/api/admin/promotion-posts")
    suspend fun adminCreatePromotionPost(body: PromotionPostCreate): PromotionPost =
        portalPost("/api/admin/promotion-posts", body)
    suspend fun adminUpdatePromotionPost(id: String, body: PromotionPostCreate): PromotionPost =
        portalPatch("/api/admin/promotion-posts/$id", body)
    suspend fun adminDeletePromotionPost(id: String): Map<String, Boolean> =
        portalDelete("/api/admin/promotion-posts/$id")

    suspend fun adminUpdateUserRole(userId: String, patch: UserRolePatch): AdminUserRow =
        portalPatch("/api/admin/users/$userId/role", patch)

    suspend fun adminUpdateUserStatus(userId: String, status: String): AdminUserRow =
        portalPatch("/api/admin/users/$userId/status", UserStatusPatch(status))

    suspend fun adminUpdateBusinessStatus(businessId: String, status: String): AdminBusinessRow =
        portalPatch("/api/admin/businesses/$businessId/status", BusinessStatusPatch(status))

    suspend fun adminToggleAiEnabled(key: String, enabled: Boolean): AiConfigRow =
        portalPatch("/api/admin/ai-config/$key", AiConfigPatch(mapOf("enabled" to JsonPrimitive(enabled))))

    // --- Marketplace: bookings / payments / payouts / media / ad-package admin / AI rules ---

    suspend fun listBusinesses(): com.wandertale.mobile.data.model.PublicBusinessList = portalGet("/api/businesses")
    suspend fun businessDetail(id: String): com.wandertale.mobile.data.model.PublicBusinessDetail = portalGet("/api/businesses/$id")
    suspend fun createBooking(body: BookingCreate): BookingRecord = portalPost("/api/bookings", body)
    suspend fun getBooking(id: String): BookingRecord = portalGet("/api/bookings/$id")
    suspend fun myBookings(): List<BookingRecord> =
        portalGet<com.wandertale.mobile.data.model.BookingList>("/api/bookings").items
    suspend fun payBooking(id: String): BookingPayResponse = portalPost("/api/bookings/$id/pay")
    suspend fun confirmBooking(id: String): BookingRecord = portalPost("/api/bookings/$id/confirm")
    suspend fun cancelBooking(id: String): BookingRecord = portalPost("/api/bookings/$id/cancel")

    suspend fun businessProfile(): BusinessProfileRow = portalGet("/api/business/profile")
    suspend fun updateBusinessProfile(body: BusinessProfilePatch): BusinessProfileRow =
        portalPatch("/api/business/profile", body)
    suspend fun businessMedia(): BusinessMediaList = portalGet("/api/business/media")
    suspend fun uploadBusinessMedia(body: BusinessMediaCreate): BusinessMediaRow =
        portalPost("/api/business/media", body)

    suspend fun uploadImage(bytes: ByteArray, filename: String, mimeType: String = "image/jpeg"): String =
        authorized { token ->
            withContext(Dispatchers.IO) {
                val body = MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("file", filename, bytes.toRequestBody(mimeType.toMediaType()))
                    .build()
                val client = OkHttpClient.Builder()
                    .connectTimeout(60, TimeUnit.SECONDS)
                    .readTimeout(120, TimeUnit.SECONDS)
                    .build()
                val request = Request.Builder()
                    .url("${baseUrl()}/api/upload/image")
                    .header("Authorization", "Bearer $token")
                    .post(body)
                    .build()
                client.newCall(request).execute().use { response ->
                    val text = response.body?.string().orEmpty()
                    if (!response.isSuccessful) {
                        val msg = runCatching { json.decodeFromString<ApiErrorBody>(text).message }
                            .getOrNull() ?: text.ifBlank { "HTTP ${response.code}" }
                        throw ApiException(msg, response.code)
                    }
                    json.decodeFromString<UploadImageResponse>(text).url
                }
            }
        }

    suspend fun businessPayouts(): PayoutList = portalGet("/api/business/payouts")
    suspend fun businessNotifications(): List<com.wandertale.mobile.data.model.BusinessNotification> =
        portalGet<com.wandertale.mobile.data.model.BusinessNotificationList>("/api/business/notifications").items
    suspend fun purchasePackage(packageId: String): AdPurchaseResponse =
        portalPost("/api/business/packages/purchase", PackagePurchaseRequest(packageId))

    suspend fun adminMedia(status: String? = null): BusinessMediaList =
        portalGet("/api/admin/media" + if (status != null && status != "all") "?status=$status" else "")
    suspend fun adminUpdateMediaStatus(id: String, status: String, rejectionReason: String? = null): BusinessMediaRow =
        portalPatch("/api/admin/media/$id/status", MediaStatusPatch(status, rejectionReason))
    suspend fun adminAdPackages(): AdPackageAdminList = portalGet("/api/admin/ad-packages")
    suspend fun adminCreateAdPackage(body: AdPackageCreate): AdPackageAdminRow =
        portalPost("/api/admin/ad-packages", body)
    suspend fun adminAiRecommendationRules(): AiRecommendationRuleList =
        portalGet("/api/admin/ai-recommendation-rules")
    suspend fun adminCreateAiRule(body: AiRecommendationRuleCreate): AiRecommendationRule =
        portalPost("/api/admin/ai-recommendation-rules", body)
    suspend fun adminUpdateAiRule(id: String, body: AiRecommendationRulePatch): AiRecommendationRule =
        portalPatch("/api/admin/ai-recommendation-rules/$id", body)
    suspend fun adminPayouts(status: String? = null): PayoutList =
        portalGet("/api/admin/payouts" + if (status != null && status != "all") "?status=$status" else "")
    suspend fun adminProcessPayout(id: String): PayoutRecord = portalPost("/api/payouts/$id/process")

    private suspend inline fun <reified T> portalGet(path: String): T = authorized { token ->
        try {
            http.get("${baseUrl()}$path") { header("Authorization", "Bearer $token") }.body()
        } catch (e: ResponseException) {
            throw parseError(e)
        }
    }

    private suspend inline fun <reified T> portalPost(path: String): T = authorized { token ->
        try {
            http.post("${baseUrl()}$path") { header("Authorization", "Bearer $token") }.body()
        } catch (e: ResponseException) {
            throw parseError(e)
        }
    }

    private suspend inline fun <reified T> portalDelete(path: String): T = authorized { token ->
        try {
            http.delete("${baseUrl()}$path") { header("Authorization", "Bearer $token") }.body()
        } catch (e: ResponseException) {
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
        } catch (e: ResponseException) {
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
        } catch (e: ResponseException) {
            throw parseError(e)
        }
    }
}
