import Foundation

struct BusinessOverview: Codable {
    var business: BusinessProfileRow?
    var booking_count: Int = 0
    var gross_revenue_vnd: Double = 0
    var net_revenue_vnd: Double = 0
    var active_ad_campaigns: Int = 0
    var campaign_count: Int = 0
    var impressions: Int = 0
    var clicks: Int = 0
    var ctr: Double = 0
    var suggested_count: Int = 0
    var remaining_budget_vnd: Double = 0
    var ad_package_expiry: String?
}

struct AdminOverview: Codable {
    var commission_revenue_vnd: Double = 0
    var ad_revenue_vnd: Double = 0
    var total_revenue_vnd: Double = 0
    var user_count: Int = 0
    var business_count: Int = 0
    var booking_count: Int = 0
    var trips_today: Int = 0
    var pending_business_count: Int = 0
    var banned_user_count: Int = 0
}

struct PlatformTransaction: Codable, Identifiable {
    let id: String
    var kind: String?
    var business_id: String?
    var gross_amount: Double?
    var commission_amount: Double?
    var net_amount: Double?
    var status: String?
    var description: String?
    var created_at: String?
}

struct PlatformTransactionList: Codable {
    var items: [PlatformTransaction] = []
}

struct AdPackage: Codable, Identifiable {
    let id: String
    let name: String
    var description: String?
    var price_vnd: Double?
    var duration_days: Int?
    var boost_level: Int?
}

struct AdPackageList: Codable {
    var items: [AdPackage] = []
}

struct AdPurchaseResponse: Codable {
    var order: AdOrder?
    var payment_status: String?
    var checkout_url: String?
    var qr_code: String?
    var account_number: String?
    var account_name: String?
    var amount: Double?
    var transfer_content: String?
    var order_code: Int?
}

struct AdOrder: Codable, Identifiable {
    let id: String
    var status: String?
    var amount_vnd: Double?
    var starts_at: String?
    var ends_at: String?
}

struct AdminUserRow: Codable, Identifiable {
    let id: String
    var display_name: String?
    var email: String?
    var phone: String?
    var is_admin: Bool = false
    var is_business: Bool = false
    var status: String?
    var last_login_at: String?
    var last_device: String?
    var created_at: String?
}

struct AdminUserList: Codable {
    var items: [AdminUserRow] = []
}

struct AdminBusinessRow: Codable, Identifiable {
    let id: String
    var owner_id: String?
    var name: String?
    var contact_email: String?
    var status: String?
    var commission_rate: Double?
    var business_type: String?
    var region: String?
    var hotline: String?
    var description: String?
    var license_no: String?
    var rating_avg: Double?
    var rating_count: Int?
    var created_at: String?
}

struct AdminBusinessList: Codable {
    var items: [AdminBusinessRow] = []
}

struct AiConfigRow: Codable, Identifiable {
    var id: String { key }
    let key: String
    var value: [String: PlatformJsonValue]?
    var updated_at: String?
}

struct AiConfigList: Codable {
    var items: [AiConfigRow] = []
}

enum PlatformJsonValue: Codable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case array([PlatformJsonValue])
    case object([String: PlatformJsonValue])

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let v = try? container.decode(Bool.self) { self = .bool(v); return }
        if let v = try? container.decode(Double.self) { self = .number(v); return }
        if let v = try? container.decode(String.self) { self = .string(v); return }
        if let v = try? container.decode([PlatformJsonValue].self) { self = .array(v); return }
        if let v = try? container.decode([String: PlatformJsonValue].self) { self = .object(v); return }
        self = .string("")
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let v): try container.encode(v)
        case .number(let v): try container.encode(v)
        case .bool(let v): try container.encode(v)
        case .array(let v): try container.encode(v)
        case .object(let v): try container.encode(v)
        }
    }

    var displayText: String {
        switch self {
        case .string(let v): return v
        case .number(let v): return String(format: "%.0f", v)
        case .bool(let v): return v ? "Bật" : "Tắt"
        case .array(let v): return "\(v.count) mục"
        case .object(let v): return "\(v.count) trường"
        }
    }
}

struct UserRolePatch: Codable {
    var is_admin: Bool?
    var is_business: Bool?
}

struct AdminUserCreate: Codable {
    var email: String
    var password: String
    var display_name: String
    var is_admin: Bool
    var is_business: Bool
    var status: String
}

struct BusinessStatusPatch: Codable {
    let status: String
}

struct AiConfigPatch: Codable {
    let value: [String: PlatformJsonValue]
}

struct BusinessProfileRow: Codable, Identifiable {
    let id: String
    var name: String?
    var status: String?
    var business_type: String?
    var region: String?
    var hotline: String?
    var description: String?
    var license_no: String?
    var rating_avg: Double?
    var rating_count: Int?
    var created_at: String?
}

struct BusinessCampaignRow: Codable, Identifiable {
    let id: String
    var name: String
    var target_type: String?
    var region: String?
    var season: String?
    var budget_vnd: Double?
    var spent_vnd: Double?
    var impressions: Int?
    var clicks: Int?
    var suggested_count: Int?
    var status: String?
    var starts_at: String?
    var ends_at: String?
    var created_at: String?
}

struct BusinessCampaignList: Codable { var items: [BusinessCampaignRow] = [] }

struct BusinessCampaignCreate: Codable {
    var name: String
    var target_type: String?
    var region: String?
    var season: String?
    var budget_vnd: Double?
    var starts_at: String?
    var ends_at: String?
}

struct BusinessVoucherRow: Codable, Identifiable {
    let id: String
    var code: String
    var title: String
    var description: String?
    var discount_type: String?
    var discount_value: Double?
    var max_discount_vnd: Double?
    var audience: String?
    var usage_limit: Int?
    var used_count: Int?
    var valid_from: String?
    var valid_until: String?
    var status: String?
}

struct BusinessVoucherList: Codable { var items: [BusinessVoucherRow] = [] }

struct BusinessVoucherCreate: Codable {
    var code: String
    var title: String
    var description: String?
    var discount_type: String?
    var discount_value: Double?
    var max_discount_vnd: Double?
    var audience: String?
    var usage_limit: Int?
    var valid_from: String?
    var valid_until: String?
}

struct BusinessLocationRow: Codable, Identifiable {
    let id: String
    var name: String
    var address: String?
    var category: String?
    var status: String?
    var lat: Double?
    var lng: Double?
}

struct BusinessLocationList: Codable { var items: [BusinessLocationRow] = [] }

struct BusinessLocationCreate: Codable {
    var name: String
    var address: String?
    var category: String?
}

struct BusinessReviewRow: Codable, Identifiable {
    let id: String
    var author_name: String?
    var rating: Int
    var comment: String?
    var reply: String?
    var reported: Bool?
    var created_at: String?
}

struct BusinessReviewList: Codable { var items: [BusinessReviewRow] = [] }

struct ReviewReplyPatch: Codable { var reply: String }

struct AdminTripBrief: Codable, Identifiable {
    let id: String
    var destination: String
    var start_date: String?
    var end_date: String?
    var travelers: Int?
    var created_at: String?
}

struct AdminUserDetail: Codable {
    var user: AdminUserRow
    var trips: [AdminTripBrief] = []
}

struct UserStatusPatch: Codable { var status: String }

struct SystemLogRow: Codable, Identifiable {
    let id: String
    var level: String
    var title: String
    var source: String?
    var detail: String?
    var created_at: String?
}

struct SystemLogList: Codable { var items: [SystemLogRow] = [] }

// MARK: - Marketplace: bookings, payouts, media, ad-package admin, AI rules

struct BookingRecord: Codable, Identifiable {
    let id: String
    var user_id: String?
    var business_id: String?
    var trip_id: String?
    var location_id: String?
    var type: String?
    var status: String?
    var currency: String?
    var total_amount: Double?
    var gross_amount: Double?
    var commission_amount: Double?
    var net_amount: Double?
    var confirmed_at: String?
    var created_at: String?
}

struct BookingCreate: Codable {
    var business_id: String
    var total_amount: Double
    var type: String?
    var trip_id: String?
    var location_id: String?
    var currency: String?
}

struct BookingPayResponse: Codable {
    var booking_id: String
    var status: String
    var provider: String?
    var order_code: Int?
    var checkout_url: String?
    var qr_code: String?
    var account_number: String?
    var account_name: String?
    var bin: String?
    var amount: Double?
    var transfer_content: String?
    var currency: String?
    var commission: Double?
    var net: Double?
    var payment_transaction: PlatformTransaction?
    var payout: PayoutRecord?
}

struct PublicBusinessRow: Codable, Identifiable {
    let id: String
    var name: String?
    var business_type: String?
    var region: String?
    var hotline: String?
    var description: String?
    var rating_avg: Double?
    var rating_count: Int?
}

struct PublicBusinessList: Codable { var items: [PublicBusinessRow] = [] }

struct PublicBusinessDetail: Codable {
    var business: PublicBusinessRow
    var locations: [BusinessLocationRow] = []
    var media: [BusinessMediaRow] = []
}

struct PayoutRecord: Codable, Identifiable {
    let id: String
    var business_id: String?
    var payment_transaction_id: String?
    var amount: Double?
    var currency: String?
    var status: String?
    var payout_method: String?
    var provider_ref: String?
    var paid_at: String?
    var created_at: String?
}

struct PayoutList: Codable { var items: [PayoutRecord] = [] }

struct BusinessMediaRow: Codable, Identifiable {
    let id: String
    var business_id: String?
    var location_id: String?
    var type: String?
    var url: String
    var thumbnail_url: String?
    var status: String?
    var rejection_reason: String?
    var reviewed_at: String?
    var created_at: String?
}

struct BusinessMediaList: Codable { var items: [BusinessMediaRow] = [] }

struct BusinessMediaCreate: Codable {
    var url: String
    var type: String?
    var location_id: String?
    var thumbnail_url: String?
}

struct MediaStatusPatch: Codable {
    var status: String
    var rejection_reason: String?
}

struct AdPackageAdminRow: Codable, Identifiable {
    let id: String
    var name: String
    var description: String?
    var price_vnd: Double?
    var duration_days: Int?
    var boost_level: Int?
    var active: Bool?
    var created_at: String?
}

struct AdPackageAdminList: Codable { var items: [AdPackageAdminRow] = [] }

struct AdPackageCreate: Codable {
    var name: String
    var description: String?
    var price_vnd: Double
    var duration_days: Int?
    var boost_level: Int?
    var active: Bool?
}

struct AiRecommendationRule: Codable, Identifiable {
    let id: String
    var name: String
    var status: String?
    var created_at: String?
    var updated_at: String?
}

struct AiRecommendationRuleList: Codable { var items: [AiRecommendationRule] = [] }

struct AiRecommendationRuleCreate: Codable {
    var name: String
    var status: String?
}

struct AiRecommendationRulePatch: Codable {
    var name: String?
    var status: String?
}

struct BusinessProfilePatch: Codable {
    var name: String?
    var contact_email: String?
    var business_type: String?
    var region: String?
    var hotline: String?
    var description: String?
    var license_no: String?
}

struct BusinessLocationPatch: Codable {
    var name: String?
    var address: String?
    var category: String?
    var status: String?
}
