@file:OptIn(kotlinx.serialization.ExperimentalSerializationApi::class)

package com.wandertale.mobile.data.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class BusinessOverview(
    val business: BusinessProfileRow? = null,
    val booking_count: Int = 0,
    val gross_revenue_vnd: Double = 0.0,
    val net_revenue_vnd: Double = 0.0,
    val active_ad_campaigns: Int = 0,
    val active_ad_package: ActiveAdPackage? = null,
    val campaign_count: Int = 0,
    val impressions: Int = 0,
    val clicks: Int = 0,
    val ctr: Double = 0.0,
    val suggested_count: Int = 0,
    val remaining_budget_vnd: Double = 0.0,
    val ad_package_expiry: String? = null,
)

@Serializable
data class ActiveAdPackage(
    val package_id: String? = null,
    val name: String? = null,
    val ends_at: String? = null,
)

@Serializable
data class AdminOverview(
    val commission_revenue_vnd: Double = 0.0,
    val ad_revenue_vnd: Double = 0.0,
    val subscription_revenue_vnd: Double = 0.0,
    val total_revenue_vnd: Double = 0.0,
    val user_count: Int = 0,
    val business_count: Int = 0,
    val booking_count: Int = 0,
    val trips_today: Int = 0,
    val pending_business_count: Int = 0,
    val banned_user_count: Int = 0,
)

@Serializable
data class PlatformTransaction(
    val id: String,
    val kind: String? = null,
    val business_id: String? = null,
    val gross_amount: Double? = null,
    val commission_amount: Double? = null,
    val net_amount: Double? = null,
    val status: String? = null,
    val description: String? = null,
    val created_at: String? = null,
)

@Serializable
data class PlatformTransactionList(val items: List<PlatformTransaction> = emptyList())

@Serializable
data class AdPackage(
    val id: String,
    val name: String,
    val description: String? = null,
    val price_vnd: Double? = null,
    val duration_days: Int? = null,
    val boost_level: Int? = null,
)

@Serializable
data class AdPackageList(val items: List<AdPackage> = emptyList())

@Serializable
data class AdPurchaseResponse(
    val order: AdOrder? = null,
    val payment_status: String? = null,
    val checkout_url: String? = null,
    val qr_code: String? = null,
    val account_number: String? = null,
    val account_name: String? = null,
    val amount: Double? = null,
    val transfer_content: String? = null,
    val order_code: Long? = null,
)

@Serializable
data class AdOrder(
    val id: String,
    val status: String? = null,
    val amount_vnd: Double? = null,
    val starts_at: String? = null,
    val ends_at: String? = null,
)

@Serializable
data class AdminUserRow(
    val id: String,
    val display_name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val is_admin: Boolean = false,
    val is_business: Boolean = false,
    val is_premium: Boolean? = null,
    val subscription_tier: String? = null,
    val status: String? = null,
    val last_login_at: String? = null,
    val last_device: String? = null,
    val created_at: String? = null,
)

@Serializable
data class AdminUserList(val items: List<AdminUserRow> = emptyList())

@Serializable
data class AdminBusinessRow(
    val id: String,
    val owner_id: String? = null,
    val name: String? = null,
    val contact_email: String? = null,
    val status: String? = null,
    val business_type: String? = null,
    val region: String? = null,
    val hotline: String? = null,
    val description: String? = null,
    val license_no: String? = null,
    val rating_avg: Double? = null,
    val rating_count: Int? = null,
    val commission_rate: Double? = null,
    val created_at: String? = null,
)

@Serializable
data class AdminBusinessList(val items: List<AdminBusinessRow> = emptyList())

@Serializable
data class AiConfigRow(
    val key: String,
    val value: Map<String, JsonElement>? = null,
    val updated_at: String? = null,
)

@Serializable
data class AiConfigList(val items: List<AiConfigRow> = emptyList())

@Serializable
data class UserRolePatch(
    val is_admin: Boolean? = null,
    val is_business: Boolean? = null,
)

@Serializable
data class AdminUserCreate(
    val email: String,
    val password: String,
    val display_name: String,
    val is_admin: Boolean = false,
    val is_business: Boolean = false,
    val status: String = "active",
)

@Serializable
data class BusinessStatusPatch(val status: String)

@Serializable
data class AiConfigPatch(val value: Map<String, JsonElement>)

@Serializable
data class BusinessProfileRow(
    val id: String? = null,
    val owner_id: String? = null,
    val name: String? = null,
    val contact_email: String? = null,
    val status: String? = null,
    val business_type: String? = null,
    val region: String? = null,
    val hotline: String? = null,
    val description: String? = null,
    val license_no: String? = null,
    val rating_avg: Double? = null,
    val rating_count: Int? = null,
    val created_at: String? = null,
)

@Serializable
data class BusinessCampaignRow(
    val id: String,
    val business_id: String? = null,
    val name: String? = null,
    val target_type: String? = null,
    val region: String? = null,
    val season: String? = null,
    val budget_vnd: Double? = null,
    val impressions: Int = 0,
    val clicks: Int = 0,
    val suggested_count: Int = 0,
    val status: String? = null,
    val starts_at: String? = null,
    val ends_at: String? = null,
    val created_at: String? = null,
)

@Serializable
data class BusinessCampaignList(val items: List<BusinessCampaignRow> = emptyList())

@Serializable
data class BusinessCampaignCreate(
    val name: String,
    val target_type: String,
    val region: String,
    val season: String,
    val budget_vnd: Double,
    val starts_at: String,
    val ends_at: String,
)

@Serializable
data class BusinessVoucherRow(
    val id: String,
    val business_id: String? = null,
    val code: String? = null,
    val title: String? = null,
    val description: String? = null,
    val discount_type: String? = null,
    val discount_value: Double? = null,
    val max_discount_vnd: Double? = null,
    val audience: String? = null,
    val usage_limit: Int? = null,
    val used_count: Int = 0,
    val status: String? = null,
    val valid_from: String? = null,
    val valid_until: String? = null,
    val created_at: String? = null,
)

@Serializable
data class BusinessVoucherList(val items: List<BusinessVoucherRow> = emptyList())

@Serializable
data class BusinessVoucherCreate(
    val code: String,
    val title: String,
    val description: String? = null,
    val discount_type: String,
    val discount_value: Double,
    val max_discount_vnd: Double? = null,
    val audience: String? = null,
    val usage_limit: Int? = null,
    val valid_from: String,
    val valid_until: String,
)

@Serializable
data class BusinessLocationRow(
    val id: String,
    val business_id: String? = null,
    val name: String? = null,
    val address: String? = null,
    val category: String? = null,
    val status: String? = null,
    val created_at: String? = null,
)

@Serializable
data class BusinessLocationList(val items: List<BusinessLocationRow> = emptyList())

@Serializable
data class BusinessLocationCreate(
    val name: String,
    val address: String,
    val category: String,
    val city: String? = null,
    val price_vnd: Double? = null,
    val description: String? = null,
)

@Serializable
data class BusinessReviewRow(
    val id: String,
    val business_id: String? = null,
    val user_id: String? = null,
    val user_name: String? = null,
    val rating: Int = 0,
    val content: String? = null,
    val reply: String? = null,
    val status: String? = null,
    val created_at: String? = null,
    val replied_at: String? = null,
)

@Serializable
data class BusinessReviewList(val items: List<BusinessReviewRow> = emptyList())

@Serializable
data class ReviewReplyPatch(val reply: String)

@Serializable
data class AdminTripBrief(
    val id: String,
    val destination: String? = null,
    val start_date: String? = null,
    val end_date: String? = null,
    val people: Int? = null,
)

@Serializable
data class AdminUserDetail(
    val id: String,
    val display_name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val is_admin: Boolean = false,
    val is_business: Boolean = false,
    val is_premium: Boolean? = null,
    val subscription_tier: String? = null,
    val status: String? = null,
    val last_login_at: String? = null,
    val last_device: String? = null,
    val created_at: String? = null,
    val trip_count: Int = 0,
    val recent_trips: List<AdminTripBrief> = emptyList(),
)

@Serializable
data class UserStatusPatch(val status: String)

@Serializable
data class SystemLogRow(
    val id: String,
    val level: String? = null,
    val source: String? = null,
    val message: String? = null,
    val metadata: Map<String, JsonElement>? = null,
    val created_at: String? = null,
)

@Serializable
data class SystemLogList(val items: List<SystemLogRow> = emptyList())

// --- Marketplace: bookings, payouts, media, ad-package admin, AI rules ---

@Serializable
data class BookingRecord(
    val id: String,
    val user_id: String? = null,
    val business_id: String? = null,
    val trip_id: String? = null,
    val location_id: String? = null,
    val type: String? = null,
    val status: String? = null,
    val currency: String? = null,
    val total_amount: Double? = null,
    val gross_amount: Double? = null,
    val commission_amount: Double? = null,
    val net_amount: Double? = null,
    val confirmed_at: String? = null,
    val created_at: String? = null,
    val payment_mode: String? = null,
    val code: String? = null,
    val location_name: String? = null,
    val business_name: String? = null,
)

@Serializable
data class BookingList(val items: List<BookingRecord> = emptyList())

@Serializable
data class BookingCreate(
    val business_id: String,
    val total_amount: Double,
    val type: String? = null,
    val trip_id: String? = null,
    val location_id: String? = null,
    val currency: String? = null,
    val payment_mode: String? = null,
    val metadata: Map<String, String>? = null,
)

@Serializable
data class BookingPayResponse(
    val booking_id: String,
    val status: String,
    val provider: String? = null,
    val order_code: Long? = null,
    val checkout_url: String? = null,
    val qr_code: String? = null,
    val account_number: String? = null,
    val account_name: String? = null,
    val bin: String? = null,
    val amount: Double? = null,
    val transfer_content: String? = null,
    val currency: String? = null,
    val commission: Double? = null,
    val net: Double? = null,
    val payout: PayoutRecord? = null,
)

@Serializable
data class PublicBusinessRow(
    val id: String,
    val name: String? = null,
    val business_type: String? = null,
    val region: String? = null,
    val hotline: String? = null,
    val description: String? = null,
    val rating_avg: Double? = null,
    val rating_count: Int? = null,
)

@Serializable
data class PublicBusinessList(val items: List<PublicBusinessRow> = emptyList())

@Serializable
data class PublicBusinessDetail(
    val business: PublicBusinessRow,
    val locations: List<BusinessLocationRow> = emptyList(),
    val media: List<BusinessMediaRow> = emptyList(),
)

@Serializable
data class PayoutRecord(
    val id: String,
    val business_id: String? = null,
    val payment_transaction_id: String? = null,
    val amount: Double? = null,
    val currency: String? = null,
    val status: String? = null,
    val payout_method: String? = null,
    val provider_ref: String? = null,
    val paid_at: String? = null,
    val created_at: String? = null,
)

@Serializable
data class PayoutList(val items: List<PayoutRecord> = emptyList())

@Serializable
data class BusinessMediaRow(
    val id: String,
    val business_id: String? = null,
    val location_id: String? = null,
    val type: String? = null,
    val url: String,
    val thumbnail_url: String? = null,
    val status: String? = null,
    val rejection_reason: String? = null,
    val reviewed_at: String? = null,
    val created_at: String? = null,
)

@Serializable
data class BusinessMediaList(val items: List<BusinessMediaRow> = emptyList())

@Serializable
data class BusinessMediaCreate(
    val url: String,
    val type: String? = null,
    val location_id: String? = null,
    val thumbnail_url: String? = null,
)

@Serializable
data class MediaStatusPatch(
    val status: String,
    val rejection_reason: String? = null,
)

@Serializable
data class AdPackageAdminRow(
    val id: String,
    val name: String,
    val description: String? = null,
    val price_vnd: Double? = null,
    val duration_days: Int? = null,
    val boost_level: Int? = null,
    val active: Boolean? = null,
    val created_at: String? = null,
)

@Serializable
data class AdPackageAdminList(val items: List<AdPackageAdminRow> = emptyList())

@Serializable
data class AdPackageCreate(
    val name: String,
    val description: String? = null,
    val price_vnd: Double,
    val duration_days: Int? = null,
    val boost_level: Int? = null,
    val active: Boolean? = null,
)

@Serializable
data class AiRecommendationRule(
    val id: String,
    val name: String,
    val status: String? = null,
    val created_at: String? = null,
    val updated_at: String? = null,
)

@Serializable
data class AiRecommendationRuleList(val items: List<AiRecommendationRule> = emptyList())

@Serializable
data class AiRecommendationRuleCreate(
    val name: String,
    val status: String? = null,
)

@Serializable
data class AiRecommendationRulePatch(
    val name: String? = null,
    val status: String? = null,
)

@Serializable
data class BusinessProfilePatch(
    val name: String? = null,
    val contact_email: String? = null,
    val business_type: String? = null,
    val region: String? = null,
    val hotline: String? = null,
    val description: String? = null,
    val license_no: String? = null,
)

@Serializable
data class PackagePurchaseRequest(val package_id: String)

// --- Sponsored locations + reviews ---

@Serializable
data class AppliedVoucher(
    val id: String,
    val code: String,
    val title: String,
    val discount_type: String,
    val discount_value: Double = 0.0,
    val final_price_vnd: Double = 0.0,
    val discount_vnd: Double = 0.0,
)

@Serializable
data class SponsoredLocation(
    val id: String,
    val business_id: String,
    val name: String,
    val address: String? = null,
    val category: String? = null,
    val city: String? = null,
    val price_vnd: Double? = null,
    val description: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val rating_avg: Double = 0.0,
    val rating_count: Int = 0,
    val image_url: String? = null,
    val voucher: AppliedVoucher? = null,
    val sponsored: Boolean = true,
)

@Serializable
data class SponsoredLocationList(val items: List<SponsoredLocation> = emptyList())

@Serializable
data class LocationBusinessInfo(
    val id: String,
    val name: String? = null,
    val hotline: String? = null,
    val status: String? = null,
)

@Serializable
data class LocationDetail(
    val id: String,
    val business_id: String,
    val name: String,
    val address: String? = null,
    val category: String? = null,
    val city: String? = null,
    val price_vnd: Double? = null,
    val description: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val rating_avg: Double = 0.0,
    val rating_count: Int = 0,
    val images: List<String> = emptyList(),
    val business: LocationBusinessInfo? = null,
    val voucher: AppliedVoucher? = null,
    val vouchers: List<AppliedVoucher> = emptyList(),
)

@Serializable
data class LocationReview(
    val id: String,
    val location_id: String? = null,
    val user_id: String? = null,
    val rating: Int = 5,
    val comment: String? = null,
    val created_at: String? = null,
)

@Serializable
data class LocationReviewList(val items: List<LocationReview> = emptyList())

@Serializable
data class LocationReviewCreate(
    val rating: Int,
    val comment: String? = null,
)

@Serializable
data class BusinessNotification(
    val id: String,
    val type: String,
    val title: String,
    val message: String,
    val status: String,
    val created_at: String? = null,
)

@Serializable
data class BusinessNotificationList(val items: List<BusinessNotification> = emptyList())
