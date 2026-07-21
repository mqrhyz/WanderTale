import Foundation

struct AppliedVoucher: Codable, Hashable {
    let id: String
    var code: String
    var title: String
    var discount_type: String
    var discount_value: Double
    var final_price_vnd: Double
    var discount_vnd: Double
}

struct SponsoredLocation: Codable, Identifiable, Hashable {
    let id: String
    var business_id: String
    var name: String
    var address: String?
    var category: String?
    var city: String?
    var price_vnd: Double?
    var description: String?
    var lat: Double?
    var lng: Double?
    var rating_avg: Double = 0
    var rating_count: Int = 0
    var image_url: String?
    var voucher: AppliedVoucher?
    var sponsored: Bool = true
}

struct SponsoredLocationList: Codable {
    var items: [SponsoredLocation] = []
}

struct LocationBusinessInfo: Codable, Hashable {
    let id: String
    var name: String?
    var hotline: String?
    var status: String?
}

struct LocationDetail: Codable, Identifiable {
    let id: String
    var business_id: String
    var name: String
    var address: String?
    var category: String?
    var city: String?
    var price_vnd: Double?
    var description: String?
    var lat: Double?
    var lng: Double?
    var rating_avg: Double = 0
    var rating_count: Int = 0
    var images: [String] = []
    var business: LocationBusinessInfo?
    var voucher: AppliedVoucher?
    var vouchers: [AppliedVoucher] = []
}

struct LocationReview: Codable, Identifiable {
    let id: String
    var location_id: String?
    var user_id: String?
    var rating: Int = 5
    var comment: String?
    var created_at: String?
}

struct LocationReviewList: Codable {
    var items: [LocationReview] = []
}

struct LocationReviewCreate: Codable {
    var rating: Int
    var comment: String?
}

struct BusinessNotification: Codable, Identifiable {
    let id: String
    var type: String
    var title: String
    var message: String
    var status: String
    var created_at: String?
}

struct BusinessNotificationList: Codable {
    var items: [BusinessNotification] = []
}

struct Promotion: Codable, Identifiable {
    let id: String
    var code: String
    var title: String
    var description: String?
    var discount_percent: Double?
    var discount_amount: Double?
    var valid_from: String?
    var valid_until: String?
    var partner_name: String?
    var is_saved: Bool?
    var applicability: String?
    var billing_cycle: String?
    /// Free Pro days from gift voucher (e.g. BANMOI = 90).
    var gift_days: Int?

    enum CodingKeys: String, CodingKey {
        case id, code, title, description, discount_percent, discount_amount
        case valid_from, valid_until, partner_name, is_saved, applicability, billing_cycle, gift_days
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        code = try c.decodeIfPresent(String.self, forKey: .code) ?? ""
        title = try c.decodeIfPresent(String.self, forKey: .title) ?? "Voucher"
        description = try c.decodeIfPresent(String.self, forKey: .description)
        discount_percent = try c.decodeLossyDoubleIfPresent(forKey: .discount_percent)
        discount_amount = try c.decodeLossyDoubleIfPresent(forKey: .discount_amount)
        valid_from = try c.decodeIfPresent(String.self, forKey: .valid_from)
        valid_until = try c.decodeIfPresent(String.self, forKey: .valid_until)
        partner_name = try c.decodeIfPresent(String.self, forKey: .partner_name)
        is_saved = try c.decodeIfPresent(Bool.self, forKey: .is_saved)
        applicability = try c.decodeIfPresent(String.self, forKey: .applicability)
        billing_cycle = try c.decodeIfPresent(String.self, forKey: .billing_cycle)
        gift_days = try c.decodeLossyIntIfPresent(forKey: .gift_days)
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(code, forKey: .code)
        try c.encode(title, forKey: .title)
        try c.encodeIfPresent(description, forKey: .description)
        try c.encodeIfPresent(discount_percent, forKey: .discount_percent)
        try c.encodeIfPresent(discount_amount, forKey: .discount_amount)
        try c.encodeIfPresent(valid_from, forKey: .valid_from)
        try c.encodeIfPresent(valid_until, forKey: .valid_until)
        try c.encodeIfPresent(partner_name, forKey: .partner_name)
        try c.encodeIfPresent(is_saved, forKey: .is_saved)
        try c.encodeIfPresent(applicability, forKey: .applicability)
        try c.encodeIfPresent(billing_cycle, forKey: .billing_cycle)
        try c.encodeIfPresent(gift_days, forKey: .gift_days)
    }
}

struct PromotionList: Codable {
    var items: [Promotion] = []
}

struct PromotionPost: Codable, Identifiable {
    let id: String
    var title: String
    var subtitle: String?
    var body: String?
    var cover_image_url: String
    var post_type: String
    var voucher_id: String?
    var status: String?
    var sort_order: Int?
    var starts_at: String?
    var ends_at: String?
    var created_at: String?
    var voucher: Promotion?
}

struct PromotionHomePayload: Codable {
    var items: [Promotion] = []
    var vouchers: [Promotion] = []
    var posts: [PromotionPost] = []
}

struct PromotionVoucherCreate: Codable {
    var code: String
    var title: String
    var description: String?
    var discount_percent: Double?
    var discount_amount: Double?
    var valid_from: String?
    var valid_until: String?
    var applicability: String?
    var billing_cycle: String?
    var gift_days: Int?
    var gift_months: Int?
}

struct PromotionPostCreate: Codable {
    var title: String
    var subtitle: String?
    var body: String?
    var cover_image_url: String
    var post_type: String
    var voucher_id: String?
    var status: String?
    var sort_order: Int?
    var starts_at: String?
    var ends_at: String?
}

struct PromotionPostList: Codable {
    var items: [PromotionPost] = []
}
