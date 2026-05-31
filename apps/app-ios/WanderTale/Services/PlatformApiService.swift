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
}

private func formatVnd(_ n: Double?) -> String {
    FormatUtils.formatVnd(n)
}

func formatPlatformVnd(_ n: Double?) -> String {
    formatVnd(n)
}
