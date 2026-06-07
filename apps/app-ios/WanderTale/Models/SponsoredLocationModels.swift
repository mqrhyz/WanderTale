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
