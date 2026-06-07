import Foundation

extension ApiService {
    static func businessOverview() async throws -> BusinessOverview {
        try await request(path: "/api/business/overview")
    }

    static func businessTransactions() async throws -> PlatformTransactionList {
        try await request(path: "/api/business/transactions")
    }

    static func businessAdPackages() async throws -> AdPackageList {
        try await request(path: "/api/business/ad-packages")
    }

    static func purchaseAdPackage(id: String) async throws -> AdPurchaseResponse {
        try await request(path: "/api/business/ad-packages/\(id)/purchase", method: "POST")
    }

    static func businessAdOrderStatus(id: String) async throws -> AdOrder {
        try await request(path: "/api/business/ad-orders/\(id)")
    }

    static func businessCampaigns() async throws -> BusinessCampaignList {
        try await request(path: "/api/business/campaigns")
    }

    static func createBusinessCampaign(_ input: BusinessCampaignCreate) async throws -> BusinessCampaignRow {
        let data = try JSONEncoder().encode(input)
        return try await request(path: "/api/business/campaigns", method: "POST", body: data)
    }

    static func businessVouchers() async throws -> BusinessVoucherList {
        try await request(path: "/api/business/vouchers")
    }

    static func createBusinessVoucher(_ input: BusinessVoucherCreate) async throws -> BusinessVoucherRow {
        let data = try JSONEncoder().encode(input)
        return try await request(path: "/api/business/vouchers", method: "POST", body: data)
    }

    static func businessLocations() async throws -> BusinessLocationList {
        try await request(path: "/api/business/locations")
    }

    static func createBusinessLocation(_ input: BusinessLocationCreate) async throws -> BusinessLocationRow {
        let data = try JSONEncoder().encode(input)
        return try await request(path: "/api/business/locations", method: "POST", body: data)
    }

    static func businessReviews() async throws -> BusinessReviewList {
        try await request(path: "/api/business/reviews")
    }

    static func replyBusinessReview(id: String, reply: String) async throws -> BusinessReviewRow {
        let data = try JSONEncoder().encode(ReviewReplyPatch(reply: reply))
        return try await request(path: "/api/business/reviews/\(id)/reply", method: "PATCH", body: data)
    }

    static func adminOverview() async throws -> AdminOverview {
        try await request(path: "/api/admin/overview")
    }

    static func adminTransactions() async throws -> PlatformTransactionList {
        try await request(path: "/api/admin/transactions")
    }

    static func adminUsers() async throws -> AdminUserList {
        try await request(path: "/api/admin/users")
    }

    static func adminCreateUser(_ input: AdminUserCreate) async throws -> AdminUserRow {
        let data = try JSONEncoder().encode(input)
        return try await request(path: "/api/admin/users", method: "POST", body: data)
    }

    static func adminBusinesses() async throws -> AdminBusinessList {
        try await request(path: "/api/admin/businesses")
    }

    static func adminUserDetail(userId: String) async throws -> AdminUserDetail {
        try await request(path: "/api/admin/users/\(userId)")
    }

    static func adminAiConfig() async throws -> AiConfigList {
        try await request(path: "/api/admin/ai-config")
    }

    static func adminUpdateUserRole(userId: String, patch: UserRolePatch) async throws -> AdminUserRow {
        let data = try JSONEncoder().encode(patch)
        return try await request(path: "/api/admin/users/\(userId)/role", method: "PATCH", body: data)
    }

    static func adminUpdateBusinessStatus(businessId: String, status: String) async throws -> AdminBusinessRow {
        let data = try JSONEncoder().encode(BusinessStatusPatch(status: status))
        return try await request(path: "/api/admin/businesses/\(businessId)/status", method: "PATCH", body: data)
    }

    static func adminUpdateUserStatus(userId: String, status: String) async throws -> AdminUserRow {
        let data = try JSONEncoder().encode(UserStatusPatch(status: status))
        return try await request(path: "/api/admin/users/\(userId)/status", method: "PATCH", body: data)
    }

    static func adminToggleAiEnabled(key: String, enabled: Bool) async throws -> AiConfigRow {
        let patch = AiConfigPatch(value: ["enabled": .bool(enabled)])
        let data = try JSONEncoder().encode(patch)
        return try await request(path: "/api/admin/ai-config/\(key)", method: "PATCH", body: data)
    }

    static func adminSystemLogs(level: String? = nil) async throws -> SystemLogList {
        if let level, !level.isEmpty, level != "all" {
            return try await request(path: "/api/admin/system-logs?level=\(level)")
        }
        return try await request(path: "/api/admin/system-logs")
    }

    // MARK: - Marketplace: bookings / payments

    static func listBusinesses() async throws -> PublicBusinessList {
        try await request(path: "/api/businesses")
    }

    static func businessDetail(id: String) async throws -> PublicBusinessDetail {
        try await request(path: "/api/businesses/\(id)")
    }

    static func createBooking(_ input: BookingCreate) async throws -> BookingRecord {
        let data = try JSONEncoder().encode(input)
        return try await request(path: "/api/bookings", method: "POST", body: data)
    }

    static func getBooking(id: String) async throws -> BookingRecord {
        try await request(path: "/api/bookings/\(id)")
    }

    static func payBooking(id: String) async throws -> BookingPayResponse {
        try await request(path: "/api/bookings/\(id)/pay", method: "POST")
    }

    // MARK: - Sponsored locations + reviews

    static func sponsoredLocations(city: String, maxPrice: Double? = nil) async throws -> SponsoredLocationList {
        var query: [String: String] = ["city": city]
        if let maxPrice, maxPrice > 0 { query["max_price"] = String(Int(maxPrice)) }
        let qs = query.map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? $0.value)" }.joined(separator: "&")
        return try await request(path: "/api/locations/sponsored?\(qs)")
    }

    static func locationDetail(id: String) async throws -> LocationDetail {
        try await request(path: "/api/locations/\(id)")
    }

    static func locationReviews(id: String) async throws -> LocationReviewList {
        try await request(path: "/api/locations/\(id)/reviews")
    }

    static func createLocationReview(id: String, rating: Int, comment: String?) async throws -> LocationReview {
        let data = try JSONEncoder().encode(LocationReviewCreate(rating: rating, comment: comment))
        return try await request(path: "/api/locations/\(id)/reviews", method: "POST", body: data)
    }

    static func confirmBooking(id: String) async throws -> BookingRecord {
        try await request(path: "/api/bookings/\(id)/confirm", method: "POST")
    }

    static func cancelBooking(id: String) async throws -> BookingRecord {
        try await request(path: "/api/bookings/\(id)/cancel", method: "POST")
    }

    // MARK: - Marketplace: business profile / media / payouts

    static func businessProfile() async throws -> BusinessProfileRow {
        try await request(path: "/api/business/profile")
    }

    static func updateBusinessProfile(_ patch: BusinessProfilePatch) async throws -> BusinessProfileRow {
        let data = try JSONEncoder().encode(patch)
        return try await request(path: "/api/business/profile", method: "PATCH", body: data)
    }

    static func updateBusinessLocation(id: String, patch: BusinessLocationPatch) async throws -> BusinessLocationRow {
        let data = try JSONEncoder().encode(patch)
        return try await request(path: "/api/business/locations/\(id)", method: "PATCH", body: data)
    }

    static func businessMedia() async throws -> BusinessMediaList {
        try await request(path: "/api/business/media")
    }

    static func uploadBusinessMedia(_ input: BusinessMediaCreate) async throws -> BusinessMediaRow {
        let data = try JSONEncoder().encode(input)
        return try await request(path: "/api/business/media", method: "POST", body: data)
    }

    static func businessPayouts() async throws -> PayoutList {
        try await request(path: "/api/business/payouts")
    }

    static func businessNotifications() async throws -> BusinessNotificationList {
        try await request(path: "/api/business/notifications")
    }

    // MARK: - Marketplace: admin media / ad-packages / AI rules / payouts

    static func adminMedia(status: String? = nil) async throws -> BusinessMediaList {
        if let status, !status.isEmpty, status != "all" {
            return try await request(path: "/api/admin/media?status=\(status)")
        }
        return try await request(path: "/api/admin/media")
    }

    static func adminUpdateMediaStatus(id: String, status: String, rejectionReason: String? = nil) async throws -> BusinessMediaRow {
        let data = try JSONEncoder().encode(MediaStatusPatch(status: status, rejection_reason: rejectionReason))
        return try await request(path: "/api/admin/media/\(id)/status", method: "PATCH", body: data)
    }

    static func adminAdPackages() async throws -> AdPackageAdminList {
        try await request(path: "/api/admin/ad-packages")
    }

    static func adminCreateAdPackage(_ input: AdPackageCreate) async throws -> AdPackageAdminRow {
        let data = try JSONEncoder().encode(input)
        return try await request(path: "/api/admin/ad-packages", method: "POST", body: data)
    }

    static func adminAiRecommendationRules() async throws -> AiRecommendationRuleList {
        try await request(path: "/api/admin/ai-recommendation-rules")
    }

    static func adminCreateAiRule(_ input: AiRecommendationRuleCreate) async throws -> AiRecommendationRule {
        let data = try JSONEncoder().encode(input)
        return try await request(path: "/api/admin/ai-recommendation-rules", method: "POST", body: data)
    }

    static func adminUpdateAiRule(id: String, patch: AiRecommendationRulePatch) async throws -> AiRecommendationRule {
        let data = try JSONEncoder().encode(patch)
        return try await request(path: "/api/admin/ai-recommendation-rules/\(id)", method: "PATCH", body: data)
    }

    static func adminPayouts(status: String? = nil) async throws -> PayoutList {
        if let status, !status.isEmpty, status != "all" {
            return try await request(path: "/api/admin/payouts?status=\(status)")
        }
        return try await request(path: "/api/admin/payouts")
    }

    static func adminProcessPayout(id: String) async throws -> PayoutRecord {
        try await request(path: "/api/payouts/\(id)/process", method: "POST")
    }
}

private func formatVnd(_ n: Double?) -> String {
    FormatUtils.formatVnd(n)
}

func formatPlatformVnd(_ n: Double?) -> String {
    formatVnd(n)
}
