import SwiftUI

struct AdminPortalView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState
    @State private var section = 0
    @State private var overview: AdminOverview?
    @State private var transactions: [PlatformTransaction] = []
    @State private var users: [AdminUserRow] = []
    @State private var businesses: [AdminBusinessRow] = []
    @State private var aiConfigs: [AiConfigRow] = []
    @State private var logs: [SystemLogRow] = []
    @State private var media: [BusinessMediaRow] = []
    @State private var payouts: [PayoutRecord] = []
    @State private var aiRules: [AiRecommendationRule] = []
    @State private var promotionVouchers: [Promotion] = []
    @State private var promotionPosts: [PromotionPost] = []
    @State private var selectedUserDetail: AdminUserDetail?
    @State private var userSearch = ""
    @State private var userFilter = "Tất cả"
    @State private var businessFilter = "Chờ duyệt"
    @State private var logFilter = "Tất cả"
    @State private var loading = true
    @State private var error: String?
    @State private var actionMessage: String?
    @State private var showCreateUser = false
    @State private var showPromotionManager = false

    private let sections = ["Dashboard", "Users", "Business", "Cài đặt"]

    var body: some View {
        VStack(spacing: 0) {
            adminTopBar
            ScrollView {
                if loading {
                    ProgressView().tint(.white).padding(.top, 40)
                } else if let error {
                    Text(error).foregroundStyle(.red).padding()
                } else {
                    Group {
                        switch section {
                        case 0: overviewSection
                        case 1: usersSection
                        case 2: businessesSection
                        default: settingsSection
                        }
                    }
                    .padding(.horizontal, PremiumTheme.screenPadding)
                    .padding(.bottom, 72)
                }
            }
        }
        .overlay(alignment: .bottom) {
            adminBottomBar
        }
        .background(AdminPortalStyle.bg.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .sheet(isPresented: $showCreateUser) {
            AdminCreateUserSheet { input in
                _ = try await ApiService.adminCreateUser(input)
                await load()
                actionMessage = "Đã tạo tài khoản \(input.email)."
            }
        }
        .sheet(isPresented: $showPromotionManager) {
            AdminPromotionManagerSheet(
                vouchers: promotionVouchers,
                posts: promotionPosts,
                onCreateVoucher: { input in
                    _ = try await ApiService.adminCreatePromotionVoucher(input)
                    await load()
                },
                onCreatePost: { input in
                    _ = try await ApiService.adminCreatePromotionPost(input)
                    await load()
                },
                onUpdateVoucher: { id, input in
                    _ = try await ApiService.adminUpdatePromotionVoucher(id: id, input: input)
                    await load()
                },
                onDeleteVoucher: { id in
                    try await ApiService.adminDeletePromotionVoucher(id: id)
                    await load()
                },
                onUpdatePost: { id, input in
                    _ = try await ApiService.adminUpdatePromotionPost(id: id, input: input)
                    await load()
                },
                onDeletePost: { id in
                    try await ApiService.adminDeletePromotionPost(id: id)
                    await load()
                }
            )
        }
        .sheet(item: $selectedUserDetail) { detail in
            AdminUserDetailView(detail: detail) { status in
                _ = try await ApiService.adminUpdateUserStatus(userId: detail.user.id, status: status)
                await load()
                selectedUserDetail = try? await ApiService.adminUserDetail(userId: detail.user.id)
            } onRoleToggle: {
                _ = try await ApiService.adminUpdateUserRole(
                    userId: detail.user.id,
                    patch: UserRolePatch(is_business: !detail.user.is_business)
                )
                await load()
                selectedUserDetail = try? await ApiService.adminUserDetail(userId: detail.user.id)
            }
        }
    }

    private var adminTopBar: some View {
        HStack {
            Menu {
                Button("Thông tin cá nhân") { actionMessage = appState.accountInfo?.profile?.email ?? "Chưa có thông tin tài khoản." }
                Button(appState.darkMode ? "Chuyển sang Light mode" : "Chuyển sang Dark mode") { appState.setDarkMode(!appState.darkMode) }
                Button("Đăng xuất", role: .destructive) { appState.signOut() }
            } label: {
                Image(systemName: "line.3.horizontal")
                    .font(.system(size: 19, weight: .semibold))
                    .foregroundStyle(AdminPortalStyle.text)
                    .frame(width: 50, height: 50)
                    .background(AdminPortalStyle.card)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(AdminPortalStyle.stroke))
            }
            Spacer()
            Text(adminScreenTitle)
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(AdminPortalStyle.text)
            Spacer()
            Button { handleAdminTopAction() } label: {
                Image(systemName: adminTopActionIcon)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AdminPortalStyle.text)
                    .frame(width: 50, height: 50)
                    .background(AdminPortalStyle.card)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(AdminPortalStyle.stroke))
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 18)
        .padding(.bottom, 16)
        .background(AdminPortalStyle.bg)
        .overlay(Rectangle().fill(AdminPortalStyle.stroke).frame(height: 1), alignment: .bottom)
    }

    private var adminTopActionIcon: String {
        switch section {
        case 1: return "person.badge.plus"
        case 2: return "line.3.horizontal.decrease"
        case 3: return "arrow.down.to.line"
        default: return "bell"
        }
    }

    private func handleAdminTopAction() {
        switch section {
        case 1:
            showCreateUser = true
        case 2:
            businessFilter = businessFilter == "Chờ duyệt" ? "Đã duyệt" : businessFilter == "Đã duyệt" ? "Từ chối" : "Chờ duyệt"
        case 3:
            actionMessage = "System logs đã sẵn sàng để tải xuống khi có endpoint export."
        default:
            actionMessage = logs.first?.title ?? "Chưa có thông báo mới."
        }
    }

    private var adminBottomBar: some View {
        HStack(spacing: 0) {
            ForEach(sections.indices, id: \.self) { i in
                Button { section = i; actionMessage = nil } label: {
                    VStack(spacing: 3) {
                        Image(systemName: adminBottomIcon(i))
                            .font(.system(size: 19, weight: .semibold))
                        Text(sections[i])
                            .font(.system(size: 11, weight: .medium))
                    }
                    .foregroundStyle(section == i ? AdminPortalStyle.purple : AdminPortalStyle.muted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 4)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 18)
        .padding(.top, 4)
        .padding(.bottom, 2)
        .background {
            AdminPortalStyle.bg.opacity(0.98)
                .ignoresSafeArea(edges: .bottom)
        }
        .overlay(Rectangle().fill(AdminPortalStyle.stroke).frame(height: 1), alignment: .top)
        .offset(y: PremiumTheme.portalBottomBarDrop)
        .ignoresSafeArea(.container, edges: .bottom)
    }

    private func adminBottomIcon(_ index: Int) -> String {
        switch index {
        case 0: return "square.grid.2x2"
        case 1: return "person.2"
        case 2: return "storefront"
        default: return "gearshape"
        }
    }

    private var adminScreenTitle: String {
        switch section {
        case 1: return "Người dùng"
        case 2: return "Duyệt business"
        case 3: return "System logs"
        default: return "Dashboard"
        }
    }

    @ViewBuilder
    private var overviewSection: some View {
        if let o = overview {
            VStack(alignment: .leading, spacing: 18) {
                adminSectionTitle("TỔNG QUAN HỆ THỐNG")
                HStack(spacing: 12) {
                    metricCard("Tổng user", "\(o.user_count)", subtitle: trendSubtitle(o.user_count, label: "hôm nay"))
                    metricCard("Trips tạo hôm nay", "\(o.trips_today)", subtitle: trendSubtitle(o.trips_today, label: "so hôm qua"))
                }
                HStack(spacing: 12) {
                    metricCard("Doanh thu tháng", formatCompactVnd(o.total_revenue_vnd), subtitle: trendSubtitle(o.total_revenue_vnd.isFinite ? Int(o.total_revenue_vnd / 1_000_000) : 0, label: "vs tháng trước"))
                    metricCard("Business hoạt động", "\(o.business_count)", subtitle: "\(o.pending_business_count) chờ duyệt")
                }
                adminSectionTitle("DOANH THU 7 NGÀY")
                revenueBars
                adminSectionTitle("QUẢN LÝ VOUCHER")
                adminPromotionManagerCard
                adminSectionTitle("NGƯỜI DÙNG MỚI NHẤT")
                if users.isEmpty {
                    adminEmpty("Chưa có người dùng.")
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(users.prefix(3).enumerated()), id: \.element.id) { index, user in
                            adminUserInlineRow(user)
                            if index < min(users.count, 3) - 1 { adminDivider }
                        }
                    }
                }
            }
        }
    }

    private var transactionsSection: some View {
        VStack(spacing: 10) {
            ForEach(transactions) { tx in
                PremiumSurfaceCard {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(tx.description ?? tx.kind ?? "—").font(.system(size: 14, weight: .semibold))
                        Text("Gộp: \(formatPlatformVnd(tx.gross_amount)) · HH: \(formatPlatformVnd(tx.commission_amount))")
                            .font(.system(size: 12)).foregroundStyle(PremiumTheme.muted)
                        Text("Net: \(formatPlatformVnd(tx.net_amount))")
                            .font(.system(size: 13, weight: .medium)).foregroundStyle(PremiumTheme.accent)
                    }
                }
            }
        }
    }

    private var usersSection: some View {
        let filtered = filteredAdminUsers()
        return VStack(alignment: .leading, spacing: 16) {
            adminSearchField
            adminUserFilters
            HStack(spacing: 12) {
                metricCard("Tổng user", "\(overview?.user_count ?? users.count)")
                metricCard("Bị banned", "\(users.filter { $0.status == "banned" }.count)", valueColor: Color(red: 1, green: 0.30, blue: 0.36))
            }
            adminSectionTitle("DANH SÁCH")
            if let actionMessage {
                Text(actionMessage)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(AdminPortalStyle.green)
            }
            if filtered.isEmpty {
                adminEmpty("Không có user phù hợp.")
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(filtered.enumerated()), id: \.element.id) { index, user in
                        Button {
                            Task { selectedUserDetail = try? await ApiService.adminUserDetail(userId: user.id) }
                        } label: {
                            adminUserListRow(user)
                        }
                        .buttonStyle(.plain)
                        if index < filtered.count - 1 { adminDivider }
                    }
                }
            }
        }
    }

    private var businessesSection: some View {
        let filtered = filteredBusinesses()
        return VStack(alignment: .leading, spacing: 16) {
            adminBusinessFilters
            if let actionMessage {
                Text(actionMessage)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(AdminPortalStyle.green)
            }
            if filtered.isEmpty {
                adminEmpty("Không có business phù hợp.")
            } else {
                VStack(spacing: 14) {
                    ForEach(filtered) { biz in
                        businessApprovalCard(biz)
                    }
                }
            }
        }
    }

    private var logsSection: some View {
        let filtered = filteredLogs()
        return VStack(alignment: .leading, spacing: 16) {
            adminLogFilters
            adminSectionTitle("TÀI NGUYÊN HỆ THỐNG")
            VStack(spacing: 12) {
                systemResourceBar(title: "AI API usage hôm nay", value: aiUsageRatio(), tint: Color.orange)
                systemResourceBar(title: "DB connections", value: dbConnectionRatio(), tint: AdminPortalStyle.green)
            }
            adminSectionTitle("LOG GẦN NHẤT")
            if filtered.isEmpty {
                adminEmpty("Chưa có system log.")
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(filtered.enumerated()), id: \.element.id) { index, log in
                        systemLogRow(log)
                        if index < filtered.count - 1 { adminDivider }
                    }
                }
            }
        }
    }

    private var aiSection: some View {
        VStack(spacing: 10) {
            ForEach(aiConfigs) { cfg in
                PremiumSurfaceCard {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(cfg.key).font(.system(size: 15, weight: .semibold))
                        if let value = cfg.value {
                            ForEach(value.keys.sorted(), id: \.self) { k in
                                HStack {
                                    Text(k).font(.system(size: 12)).foregroundStyle(PremiumTheme.textMuted)
                                    Spacer()
                                    Text(value[k]?.displayText ?? "—").font(.system(size: 12))
                                }
                            }
                        }
                        if cfg.key != "ota_pricing", let enabled = cfg.value?["enabled"] {
                            if case .bool(let on) = enabled {
                                Button(on ? "Tắt module" : "Bật module") {
                                    Task { await toggleAi(cfg.key, enabled: !on) }
                                }
                                .font(.system(size: 12, weight: .medium))
                                .buttonStyle(.bordered)
                            }
                        }
                    }
                }
            }
        }
    }

    private var settingsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            adminPayoutsSection
            adminAiRulesSection
            logsSection
        }
    }

    private var adminMediaSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            adminSectionTitle("DUYỆT MEDIA")
            if media.isEmpty {
                adminEmpty("Chưa có media chờ duyệt.")
            } else {
                VStack(spacing: 10) {
                    ForEach(media) { item in
                        VStack(alignment: .leading, spacing: 10) {
                            Text((item.type == "video" ? "🎬 " : "🖼 ") + item.url)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(AdminPortalStyle.text)
                                .lineLimit(2)
                            HStack {
                                statusPill(item.status ?? "pending", bad: item.status == "rejected")
                                Spacer()
                                if item.status == "pending" {
                                    Button("Từ chối") { Task { await updateMedia(item.id, "rejected") } }
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundStyle(Color(red: 0.48, green: 0.08, blue: 0.08))
                                    Button("Duyệt") { Task { await updateMedia(item.id, "approved") } }
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundStyle(AdminPortalStyle.green)
                                        .padding(.leading, 14)
                                }
                            }
                        }
                        .padding(14)
                        .background(AdminPortalStyle.card)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
            }
        }
    }

    private var adminPayoutsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            adminSectionTitle("PAYOUT")
            if payouts.isEmpty {
                adminEmpty("Chưa có khoản payout nào.")
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(payouts.enumerated()), id: \.element.id) { index, payout in
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(formatPlatformVnd(payout.amount))
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundStyle(AdminPortalStyle.text)
                                Text(payout.created_at.map { String($0.prefix(10)) } ?? "")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(AdminPortalStyle.muted)
                            }
                            Spacer()
                            if ["pending", "scheduled", "failed"].contains(payout.status ?? "") {
                                Button("Chi trả") { Task { await processPayout(payout.id) } }
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundStyle(AdminPortalStyle.green)
                            } else {
                                statusPill(payout.status ?? "pending")
                            }
                        }
                        .padding(.vertical, 12)
                        if index < payouts.count - 1 { adminDivider }
                    }
                }
            }
        }
    }

    private var adminAiRulesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            adminSectionTitle("AI RECOMMENDATION RULES")
            if aiRules.isEmpty {
                adminEmpty("Chưa có rule nào.")
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(aiRules.enumerated()), id: \.element.id) { index, rule in
                        HStack {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(rule.name).font(.system(size: 14, weight: .bold)).foregroundStyle(AdminPortalStyle.text)
                                Text(rule.status == "active" ? "Đang bật" : "Đang tắt")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(AdminPortalStyle.muted)
                            }
                            Spacer()
                            Button(rule.status == "active" ? "Tắt" : "Bật") {
                                Task { await toggleRule(rule.id, current: rule.status) }
                            }
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(rule.status == "active" ? Color(red: 0.48, green: 0.08, blue: 0.08) : AdminPortalStyle.green)
                        }
                        .padding(.vertical, 12)
                        if index < aiRules.count - 1 { adminDivider }
                    }
                }
            }
        }
    }

    private func updateMedia(_ id: String, _ status: String) async {
        do {
            _ = try await ApiService.adminUpdateMediaStatus(id: id, status: status, rejectionReason: status == "rejected" ? "Không đạt yêu cầu" : nil)
            actionMessage = status == "approved" ? "Đã duyệt media." : "Đã từ chối media."
            await load()
        } catch {
            actionMessage = formatApiError(error, fallback: "Lỗi cập nhật media")
        }
    }

    private func processPayout(_ id: String) async {
        do {
            _ = try await ApiService.adminProcessPayout(id: id)
            actionMessage = "Đã xử lý payout."
            await load()
        } catch {
            actionMessage = formatApiError(error, fallback: "Lỗi xử lý payout")
        }
    }

    private func toggleRule(_ id: String, current: String?) async {
        do {
            let next = current == "active" ? "inactive" : "active"
            _ = try await ApiService.adminUpdateAiRule(id: id, patch: AiRecommendationRulePatch(name: nil, status: next))
            actionMessage = "Đã cập nhật rule."
            await load()
        } catch {
            actionMessage = formatApiError(error, fallback: "Lỗi cập nhật rule")
        }
    }

    private func metricCard(_ title: String, _ value: String, subtitle: String? = nil, valueColor: Color = AdminPortalStyle.text) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AdminPortalStyle.muted)
            Text(value)
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(valueColor)
            if let subtitle {
                Text(subtitle)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(AdminPortalStyle.green)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(AdminPortalStyle.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func adminSectionTitle(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 15, weight: .bold))
            .foregroundStyle(AdminPortalStyle.muted)
            .tracking(0.7)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var revenueBars: some View {
        let values = lastSevenRevenueValues()
        let maxValue = max(values.max() ?? 0, 1)
        return Group {
            if values.allSatisfy({ $0 <= 0 }) {
                adminEmpty("Chưa có dữ liệu doanh thu 7 ngày.")
            } else {
                HStack(alignment: .bottom, spacing: 8) {
                    ForEach(Array(values.enumerated()), id: \.offset) { index, value in
                        VStack(spacing: 8) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(index == values.count - 2 ? AdminPortalStyle.purple : AdminPortalStyle.lavender)
                                .frame(height: CGFloat(value / maxValue) * 76)
                            Text(lastSevenDayLabels()[index])
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(AdminPortalStyle.muted)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 30)
                .padding(.bottom, 18)
                .frame(height: 150)
                .background(AdminPortalStyle.card)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func adminAlertCard(_ log: SystemLogRow) -> some View {
        let isError = log.level.lowercased() == "error"
        return HStack(alignment: .top, spacing: 12) {
            Image(systemName: isError ? "exclamationmark.triangle" : "clock")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(isError ? Color.red : Color.orange)
                .padding(.top, 2)
            VStack(alignment: .leading, spacing: 4) {
                Text(log.title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(isError ? Color(red: 0.45, green: 0.06, blue: 0.06) : Color(red: 0.35, green: 0.18, blue: 0.02))
                Text([log.detail, relativeTime(log.created_at)].compactMap { $0 }.joined(separator: " — "))
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(isError ? Color(red: 0.45, green: 0.06, blue: 0.06) : Color(red: 0.35, green: 0.18, blue: 0.02))
            }
            Spacer()
        }
        .padding(16)
        .background(isError ? Color(red: 1, green: 0.91, blue: 0.91) : Color(red: 1, green: 0.95, blue: 0.84))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(isError ? Color.red.opacity(0.5) : Color.orange.opacity(0.6)))
    }

    private var adminPromotionManagerCard: some View {
        Button {
            showPromotionManager = true
        } label: {
            HStack(spacing: 14) {
                Image(systemName: "ticket.fill")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 52, height: 52)
                    .background(AdminPortalStyle.purple)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                VStack(alignment: .leading, spacing: 5) {
                    Text("Khám phá ưu đãi")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(AdminPortalStyle.text)
                    Text("\(promotionVouchers.count) voucher · \(promotionPosts.count) bài viết")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(AdminPortalStyle.muted)
                    Text("Tạo voucher, bài viết chính 3:4 và bài viết phụ 1:1 cho Home user.")
                        .font(.system(size: 12))
                        .foregroundStyle(AdminPortalStyle.muted)
                        .lineLimit(2)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(AdminPortalStyle.muted)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AdminPortalStyle.card)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(AdminPortalStyle.stroke))
        }
        .buttonStyle(.plain)
    }

    private func adminUserInlineRow(_ user: AdminUserRow) -> some View {
        HStack(spacing: 14) {
            Text(initials(for: user.display_name ?? user.email))
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(user.status == "banned" ? Color(red: 0.45, green: 0.08, blue: 0.08) : AdminPortalStyle.purple)
                .frame(width: 48, height: 48)
                .background(user.status == "banned" ? Color(red: 1, green: 0.92, blue: 0.92) : Color(red: 0.90, green: 0.89, blue: 1))
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 3) {
                Text(user.display_name ?? user.email ?? user.id)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(AdminPortalStyle.text)
                Text(user.email ?? "—")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(AdminPortalStyle.muted)
            }
            Spacer()
            statusPill(user.status == "banned" ? "Banned" : "Active", bad: user.status == "banned")
        }
        .padding(.vertical, 12)
    }

    private var adminSearchField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(AdminPortalStyle.muted)
            TextField("Tìm tên, email...", text: $userSearch)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(AdminPortalStyle.text)
        }
        .padding(.horizontal, 14)
        .frame(height: 46)
        .background(AdminPortalStyle.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AdminPortalStyle.stroke))
    }

    private var adminUserFilters: some View {
        HStack(spacing: 8) {
            ForEach(["Tất cả", "Active", "Banned", "Business"], id: \.self) { filter in
                Button { userFilter = filter } label: {
                    Text(filter)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(userFilter == filter ? AdminPortalStyle.purple : AdminPortalStyle.muted)
                        .padding(.horizontal, 15)
                        .frame(height: 34)
                        .background(userFilter == filter ? Color(red: 0.90, green: 0.89, blue: 1) : Color.clear)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(userFilter == filter ? Color.clear : AdminPortalStyle.stroke))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func adminUserListRow(_ user: AdminUserRow) -> some View {
        HStack(spacing: 14) {
            Text(initials(for: user.display_name ?? user.email))
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(userTint(user))
                .frame(width: 50, height: 50)
                .background(userAvatarBg(user))
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 3) {
                Text(user.display_name ?? user.email ?? user.id)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(AdminPortalStyle.text)
                    .lineLimit(1)
                Text(user.email ?? "—")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(AdminPortalStyle.muted)
                    .lineLimit(1)
            }
            Spacer()
            statusPill(userListBadge(user), bad: user.status == "banned")
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(AdminPortalStyle.muted)
        }
        .padding(.vertical, 13)
    }

    private func filteredAdminUsers() -> [AdminUserRow] {
        users.filter { user in
            let matchesFilter: Bool
            switch userFilter {
            case "Active": matchesFilter = user.status != "banned"
            case "Banned": matchesFilter = user.status == "banned"
            case "Business": matchesFilter = user.is_business
            default: matchesFilter = true
            }
            guard matchesFilter else { return false }

            let query = userSearch.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            guard !query.isEmpty else { return true }
            return [user.display_name, user.email, user.phone, user.id]
                .compactMap { $0?.lowercased() }
                .contains { $0.contains(query) }
        }
    }

    private func userListBadge(_ user: AdminUserRow) -> String {
        if user.status == "banned" { return "Banned" }
        if user.is_business { return "Business" }
        return "Active"
    }

    private func userTint(_ user: AdminUserRow) -> Color {
        if user.status == "banned" { return Color(red: 0.45, green: 0.08, blue: 0.08) }
        if user.is_business { return AdminPortalStyle.purple }
        return AdminPortalStyle.green
    }

    private func userAvatarBg(_ user: AdminUserRow) -> Color {
        if user.status == "banned" { return Color(red: 1, green: 0.92, blue: 0.92) }
        if user.is_business { return Color(red: 0.90, green: 0.89, blue: 1) }
        return Color(red: 0.86, green: 1, blue: 0.95)
    }

    private var adminBusinessFilters: some View {
        HStack(spacing: 8) {
            ForEach(["Chờ duyệt", "Đã duyệt", "Từ chối"], id: \.self) { filter in
                let count = filter == "Chờ duyệt" ? businesses.filter { normalizedBusinessStatus($0) == "pending" }.count : nil
                Button { businessFilter = filter } label: {
                    Text(count.map { "\(filter) (\($0))" } ?? filter)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(businessFilter == filter ? AdminPortalStyle.purple : AdminPortalStyle.muted)
                        .padding(.horizontal, 15)
                        .frame(height: 34)
                        .background(businessFilter == filter ? Color(red: 0.90, green: 0.89, blue: 1) : Color.clear)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(businessFilter == filter ? Color.clear : AdminPortalStyle.stroke))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func businessApprovalCard(_ biz: AdminBusinessRow) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 14) {
                Text(initials(for: biz.name))
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(AdminPortalStyle.green)
                    .frame(width: 58, height: 58)
                    .background(Color(red: 0.86, green: 1, blue: 0.95))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                VStack(alignment: .leading, spacing: 4) {
                    Text(biz.name ?? "—")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(AdminPortalStyle.text)
                        .lineLimit(1)
                    Text(relativeBusinessTime(biz.created_at))
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(AdminPortalStyle.muted)
                }
                Spacer()
                statusPill(businessStatusLabel(biz), bad: normalizedBusinessStatus(biz) == "suspended")
            }
            HStack(spacing: 8) {
                businessMetaChip(systemName: "mappin.circle", text: biz.region ?? "—")
                businessMetaChip(systemName: "building.2", text: biz.business_type ?? "—")
                if let license = biz.license_no, !license.isEmpty {
                    businessMetaChip(systemName: "doc.text", text: "GPKD: \(license)")
                }
            }
            Text(biz.description ?? biz.contact_email ?? "Chưa có mô tả doanh nghiệp.")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(AdminPortalStyle.text.opacity(0.78))
                .lineLimit(3)

            if normalizedBusinessStatus(biz) == "pending" {
                HStack(spacing: 10) {
                    Button("Từ chối") { Task { await setBusinessStatus(biz.id, "suspended") } }
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Color(red: 0.48, green: 0.08, blue: 0.08))
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color(red: 1, green: 0.92, blue: 0.92))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    Button("Duyệt") { Task { await setBusinessStatus(biz.id, "active") } }
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(AdminPortalStyle.purple)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            } else if normalizedBusinessStatus(biz) == "active" {
                Button("Tạm dừng business") { Task { await setBusinessStatus(biz.id, "suspended") } }
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(Color(red: 0.48, green: 0.08, blue: 0.08))
                    .frame(maxWidth: .infinity)
                    .frame(height: 46)
                    .background(Color(red: 1, green: 0.92, blue: 0.92))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            } else {
                Button("Kích hoạt lại") { Task { await setBusinessStatus(biz.id, "active") } }
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 46)
                    .background(AdminPortalStyle.purple)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .padding(18)
        .background(AdminPortalStyle.bg)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(AdminPortalStyle.stroke))
    }

    private func businessMetaChip(systemName: String, text: String) -> some View {
        Label(text, systemImage: systemName)
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(AdminPortalStyle.text.opacity(0.75))
            .lineLimit(1)
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(AdminPortalStyle.card)
            .clipShape(Capsule())
    }

    private func filteredBusinesses() -> [AdminBusinessRow] {
        businesses.filter { biz in
            switch businessFilter {
            case "Đã duyệt": return normalizedBusinessStatus(biz) == "active"
            case "Từ chối": return normalizedBusinessStatus(biz) == "suspended"
            default: return normalizedBusinessStatus(biz) == "pending"
            }
        }
    }

    private func normalizedBusinessStatus(_ biz: AdminBusinessRow) -> String {
        (biz.status ?? "pending").lowercased()
    }

    private func businessStatusLabel(_ biz: AdminBusinessRow) -> String {
        switch normalizedBusinessStatus(biz) {
        case "active": return "Đã duyệt"
        case "suspended": return "Từ chối"
        default: return "Chờ duyệt"
        }
    }

    private func relativeBusinessTime(_ raw: String?) -> String {
        guard let raw else { return "Chưa rõ thời gian" }
        return "Gửi \(String(raw.prefix(16)).replacingOccurrences(of: "T", with: " "))"
    }

    private var adminLogFilters: some View {
        HStack(spacing: 8) {
            ForEach(["Tất cả", "Error", "Warning", "Info"], id: \.self) { filter in
                Button { logFilter = filter } label: {
                    Text(filter)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(logFilter == filter ? AdminPortalStyle.purple : AdminPortalStyle.muted)
                        .padding(.horizontal, 15)
                        .frame(height: 34)
                        .background(logFilter == filter ? Color(red: 0.90, green: 0.89, blue: 1) : Color.clear)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(logFilter == filter ? Color.clear : AdminPortalStyle.stroke))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func systemResourceBar(title: String, value: Double, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(AdminPortalStyle.muted)
                Spacer()
                Text("\(Int(value * 100))%")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(tint)
            }
            GeometryReader { proxy in
                Capsule()
                    .fill(Color.black.opacity(0.22))
                    .overlay(alignment: .leading) {
                        Capsule()
                            .fill(tint)
                            .frame(width: max(8, proxy.size.width * value))
                    }
            }
            .frame(height: 8)
        }
        .padding(16)
        .background(AdminPortalStyle.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func systemLogRow(_ log: SystemLogRow) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .fill(logColor(log.level))
                .frame(width: 12, height: 12)
                .padding(.top, 6)
            VStack(alignment: .leading, spacing: 4) {
                Text(log.title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(AdminPortalStyle.text)
                Text([log.source, log.detail].compactMap { $0 }.joined(separator: " · "))
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(AdminPortalStyle.muted)
                    .lineLimit(2)
                if let date = log.created_at {
                    Text(String(date.prefix(16)).replacingOccurrences(of: "T", with: " "))
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(AdminPortalStyle.muted)
                }
            }
            Spacer()
        }
        .padding(.vertical, 14)
    }

    private func filteredLogs() -> [SystemLogRow] {
        logs.filter { log in
            switch logFilter {
            case "Error": return log.level.lowercased() == "error"
            case "Warning": return log.level.lowercased() == "warning"
            case "Info": return !["error", "warning"].contains(log.level.lowercased())
            default: return true
            }
        }
    }

    private func aiUsageRatio() -> Double {
        guard !logs.isEmpty else { return 0 }
        let aiRelated = logs.filter {
            [$0.source, $0.title, $0.detail]
                .compactMap { $0?.lowercased() }
                .contains { $0.contains("ai") || $0.contains("gemini") || $0.contains("api") }
        }.count
        return min(1, Double(aiRelated) / Double(max(logs.count, 1)))
    }

    private func dbConnectionRatio() -> Double {
        guard !logs.isEmpty else { return 0 }
        let dbRelated = logs.filter {
            [$0.source, $0.title, $0.detail]
                .compactMap { $0?.lowercased() }
                .contains { $0.contains("db") || $0.contains("database") || $0.contains("supabase") }
        }.count
        return min(1, Double(dbRelated) / Double(max(logs.count, 1)))
    }

    private var adminDivider: some View {
        Rectangle().fill(AdminPortalStyle.stroke).frame(height: 1)
    }

    private func adminEmpty(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 13, weight: .medium))
            .foregroundStyle(AdminPortalStyle.muted)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(AdminPortalStyle.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func statusPill(_ text: String, bad: Bool = false) -> some View {
        Text(text)
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(bad ? Color(red: 0.48, green: 0.08, blue: 0.08) : AdminPortalStyle.green)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(bad ? Color(red: 1, green: 0.92, blue: 0.92) : Color(red: 0.84, green: 1, blue: 0.94))
            .clipShape(Capsule())
    }

    private func trendSubtitle(_ value: Int, label: String) -> String {
        guard value > 0 else { return "chưa có dữ liệu" }
        return "đã đồng bộ"
    }

    private func lastSevenRevenueValues() -> [Double] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let days = (0..<7).compactMap { calendar.date(byAdding: .day, value: $0 - 6, to: today) }
        var totals = Array(repeating: 0.0, count: days.count)

        for transaction in transactions {
            guard
                let rawDate = transaction.created_at,
                let date = parsePortalDate(rawDate),
                let index = days.firstIndex(of: calendar.startOfDay(for: date))
            else { continue }
            switch transaction.kind {
            case "booking_commission", "commission":
                totals[index] += transaction.commission_amount ?? 0
            case "ad_purchase", "business_subscription", "user_subscription":
                totals[index] += transaction.gross_amount ?? transaction.net_amount ?? 0
            default:
                continue
            }
        }

        return totals
    }

    private func lastSevenDayLabels() -> [String] {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "vi_VN")
        formatter.dateFormat = "E"
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0 - 6, to: today) }
            .map { formatter.string(from: $0).uppercased() }
    }

    private func parsePortalDate(_ raw: String) -> Date? {
        let isoWithFraction = ISO8601DateFormatter()
        isoWithFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = isoWithFraction.date(from: raw) { return date }

        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime]
        if let date = iso.date(from: raw) { return date }

        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: String(raw.prefix(10)))
    }

    private func formatCompactVnd(_ value: Double) -> String {
        guard value.isFinite else { return "₫0" }
        if value >= 1_000_000 {
            return String(format: "₫%.1fM", value / 1_000_000)
        }
        if value >= 1_000 {
            return String(format: "₫%.0fK", value / 1_000)
        }
        return "₫\(Int(value))"
    }

    private func initials(for name: String?) -> String {
        let parts = (name ?? "User").split(separator: " ").prefix(2).compactMap { $0.first }
        let result = String(parts).uppercased()
        return result.isEmpty ? "U" : result
    }

    private func relativeTime(_ raw: String?) -> String? {
        guard let raw else { return nil }
        return String(raw.prefix(16)).replacingOccurrences(of: "T", with: " ")
    }

    private func roleChip(_ label: String, active: Bool) -> some View {
        Text(label)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(active ? PremiumTheme.accent : PremiumTheme.textMuted)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(active ? PremiumTheme.accentLight : PremiumTheme.inputBg)
            .clipShape(Capsule())
    }

    private func load() async {
        loading = true
        error = nil
        do {
            async let o = ApiService.adminOverview()
            async let t = ApiService.adminTransactions()
            async let u = ApiService.adminUsers()
            async let b = ApiService.adminBusinesses()
            async let a = ApiService.adminAiConfig()
            async let l = ApiService.adminSystemLogs()
            async let m = ApiService.adminMedia()
            async let pay = ApiService.adminPayouts()
            async let rules = ApiService.adminAiRecommendationRules()
            async let promoVouchers = ApiService.adminPromotionVouchers()
            async let promoPosts = ApiService.adminPromotionPosts()
            overview = try await o
            transactions = try await t.items
            users = try await u.items
            businesses = try await b.items
            aiConfigs = try await a.items
            logs = try await l.items
            media = try await m.items
            payouts = try await pay.items
            aiRules = try await rules.items
            promotionVouchers = try await promoVouchers.items
            promotionPosts = try await promoPosts.items
        } catch {
            self.error = formatApiError(error, fallback: "Không tải được dữ liệu admin")
        }
        loading = false
    }

    private func toggleBusiness(_ user: AdminUserRow) async {
        do {
            _ = try await ApiService.adminUpdateUserRole(
                userId: user.id,
                patch: UserRolePatch(is_business: !user.is_business)
            )
            actionMessage = "Đã cập nhật quyền doanh nghiệp."
            await load()
        } catch {
            actionMessage = formatApiError(error, fallback: "Lỗi cập nhật")
        }
    }

    private func setBusinessStatus(_ id: String, _ status: String) async {
        do {
            _ = try await ApiService.adminUpdateBusinessStatus(businessId: id, status: status)
            actionMessage = "Đã cập nhật trạng thái doanh nghiệp."
            await load()
        } catch {
            actionMessage = formatApiError(error, fallback: "Lỗi cập nhật")
        }
    }

    private func setUserStatus(_ id: String, _ status: String) async {
        do {
            _ = try await ApiService.adminUpdateUserStatus(userId: id, status: status)
            actionMessage = status == "banned" ? "Đã ban user." : "Đã mở ban user."
            await load()
        } catch {
            actionMessage = formatApiError(error, fallback: "Lỗi cập nhật user")
        }
    }

    private func toggleAi(_ key: String, enabled: Bool) async {
        do {
            _ = try await ApiService.adminToggleAiEnabled(key: key, enabled: enabled)
            actionMessage = enabled ? "Đã bật module AI." : "Đã tắt module AI."
            await load()
        } catch {
            actionMessage = formatApiError(error, fallback: "Lỗi cập nhật AI")
        }
    }

    private func logColor(_ level: String) -> Color {
        switch level {
        case "error": return .red
        case "warning": return .orange
        case "success": return PremiumTheme.statDestIcon
        default: return .blue
        }
    }
}

private enum AdminPortalStyle {
    private static var darkMode: Bool { UserDefaults.standard.bool(forKey: "dark_mode") }
    static var bg: Color { darkMode ? Color(red: 0.18, green: 0.19, blue: 0.17) : Color(red: 0.96, green: 0.95, blue: 0.93) }
    static var card: Color { darkMode ? Color(red: 0.13, green: 0.14, blue: 0.12) : Color.white }
    static var stroke: Color { darkMode ? Color.white.opacity(0.10) : Color.black.opacity(0.08) }
    static var text: Color { darkMode ? Color.white.opacity(0.94) : Color(red: 0.10, green: 0.09, blue: 0.08) }
    static var muted: Color { darkMode ? Color.white.opacity(0.58) : Color(red: 0.43, green: 0.42, blue: 0.38) }
    static let green = Color(red: 0.05, green: 0.75, blue: 0.58)
    static let purple = Color(red: 0.39, green: 0.32, blue: 0.92)
    static let lavender = Color(red: 0.67, green: 0.63, blue: 0.91)
}

private struct AdminPromotionManagerSheet: View {
    let vouchers: [Promotion]
    let posts: [PromotionPost]
    let onCreateVoucher: (PromotionVoucherCreate) async throws -> Void
    let onCreatePost: (PromotionPostCreate) async throws -> Void
    let onUpdateVoucher: (String, PromotionVoucherCreate) async throws -> Void
    let onDeleteVoucher: (String) async throws -> Void
    let onUpdatePost: (String, PromotionPostCreate) async throws -> Void
    let onDeletePost: (String) async throws -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var mode = 0
    @State private var selectedVoucherId: String?
    @State private var selectedPostId: String?
    @State private var code = ""
    @State private var voucherTitle = ""
    @State private var voucherDescription = ""
    @State private var discountPercent = ""
    @State private var discountAmount = ""
    @State private var validFrom = String(Date().ISO8601Format().prefix(10))
    @State private var validUntil = String(Date().addingTimeInterval(60 * 60 * 24 * 30).ISO8601Format().prefix(10))
    @State private var postTitle = ""
    @State private var postSubtitle = ""
    @State private var postBody = ""
    @State private var coverUrl = ""
    @State private var postType = "main"
    @State private var attachedVoucherId = ""
    @State private var error: String?
    @State private var saving = false

    var body: some View {
        NavigationStack {
            Form {
                Picker("Loại", selection: $mode) {
                    Text("Voucher").tag(0)
                    Text("Bài viết").tag(1)
                }
                .pickerStyle(.segmented)

                if mode == 0 {
                    Section(selectedVoucherId == nil ? "Tạo voucher" : "Sửa voucher") {
                        TextField("Mã voucher", text: $code).textInputAutocapitalization(.characters)
                        TextField("Tiêu đề", text: $voucherTitle)
                        TextField("Mô tả", text: $voucherDescription, axis: .vertical)
                        TextField("Giảm phần trăm", text: $discountPercent).keyboardType(.decimalPad)
                        TextField("Giảm số tiền", text: $discountAmount).keyboardType(.numberPad)
                        TextField("Ngày bắt đầu yyyy-mm-dd", text: $validFrom)
                        TextField("Ngày kết thúc yyyy-mm-dd", text: $validUntil)
                    }
                    Section("Voucher hiện có") {
                        if vouchers.isEmpty {
                            Text("Chưa có voucher.").foregroundStyle(.secondary)
                        } else {
                            ForEach(vouchers) { voucher in
                                Button { fillVoucher(voucher) } label: {
                                    voucherRow(voucher)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                } else {
                    Section(selectedPostId == nil ? "Tạo bài viết" : "Sửa bài viết") {
                        TextField("Tiêu đề", text: $postTitle)
                        TextField("Phụ đề", text: $postSubtitle)
                        TextField("URL ảnh bìa", text: $coverUrl)
                            .textInputAutocapitalization(.never)
                            .keyboardType(.URL)
                        Picker("Loại bài viết", selection: $postType) {
                            Text("Chính 3:4").tag("main")
                            Text("Phụ 1:1").tag("secondary")
                        }
                        Picker("Voucher đính kèm", selection: $attachedVoucherId) {
                            Text("Không có").tag("")
                            ForEach(vouchers) { voucher in
                                Text("\(voucher.code) · \(voucher.title)").tag(voucher.id)
                            }
                        }
                        TextField("Nội dung", text: $postBody, axis: .vertical).lineLimit(5...10)
                    }
                    Section("Bài viết hiện có") {
                        if posts.isEmpty {
                            Text("Chưa có bài viết.").foregroundStyle(.secondary)
                        } else {
                            ForEach(posts) { post in
                                Button { fillPost(post) } label: {
                                    postRow(post)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }

                if let error { Text(error).foregroundStyle(.red) }
            }
            .navigationTitle("Quản lý ưu đãi")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Đóng") { dismiss() } }
                ToolbarItem(placement: .topBarLeading) {
                    if (mode == 0 && selectedVoucherId != nil) || (mode == 1 && selectedPostId != nil) {
                        Button("Tạo mới") { resetCurrentForm() }
                    }
                }
                ToolbarItem(placement: .destructiveAction) {
                    if (mode == 0 && selectedVoucherId != nil) || (mode == 1 && selectedPostId != nil) {
                        Button("Xoá", role: .destructive) { Task { await deleteSelected() } }
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Đang lưu..." : (isEditing ? "Cập nhật" : "Tạo")) { Task { await submit() } }
                        .disabled(saving)
                }
            }
        }
    }

    private var isEditing: Bool { mode == 0 ? selectedVoucherId != nil : selectedPostId != nil }

    private func voucherRow(_ voucher: Promotion) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(voucher.code).font(.system(size: 16, weight: .bold))
                Spacer()
                Text(discountLabel(voucher)).font(.system(size: 12, weight: .bold)).foregroundStyle(AdminPortalStyle.purple)
            }
            Text(voucher.title).font(.system(size: 14, weight: .semibold))
            Text("\(voucher.valid_from ?? "—") → \(voucher.valid_until ?? "—")")
                .font(.system(size: 12)).foregroundStyle(.secondary)
        }
        .padding(.vertical, 6)
    }

    private func postRow(_ post: PromotionPost) -> some View {
        HStack(spacing: 12) {
            RemoteImage(url: post.cover_image_url, fallback: post.title, contentMode: .fill)
                .frame(width: 54, height: post.post_type == "main" ? 72 : 54)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            VStack(alignment: .leading, spacing: 4) {
                Text(post.title).font(.system(size: 15, weight: .bold)).lineLimit(1)
                Text(post.post_type == "main" ? "Bài chính 3:4" : "Bài phụ 1:1")
                    .font(.system(size: 12)).foregroundStyle(.secondary)
                if let voucher = post.voucher { Text("Voucher: \(voucher.code)").font(.system(size: 12)).foregroundStyle(AdminPortalStyle.purple) }
            }
        }
        .padding(.vertical, 6)
    }

    private func fillVoucher(_ voucher: Promotion) {
        mode = 0
        selectedVoucherId = voucher.id
        code = voucher.code
        voucherTitle = voucher.title
        voucherDescription = voucher.description ?? ""
        discountPercent = voucher.discount_percent.map { String(Int($0)) } ?? ""
        discountAmount = voucher.discount_amount.map { String(Int($0)) } ?? ""
        validFrom = voucher.valid_from ?? validFrom
        validUntil = voucher.valid_until ?? validUntil
    }

    private func fillPost(_ post: PromotionPost) {
        mode = 1
        selectedPostId = post.id
        postTitle = post.title
        postSubtitle = post.subtitle ?? ""
        postBody = post.body ?? ""
        coverUrl = post.cover_image_url
        postType = post.post_type
        attachedVoucherId = post.voucher_id ?? ""
    }

    private func resetCurrentForm() {
        error = nil
        if mode == 0 {
            selectedVoucherId = nil
            code = ""; voucherTitle = ""; voucherDescription = ""; discountPercent = ""; discountAmount = ""
        } else {
            selectedPostId = nil
            postTitle = ""; postSubtitle = ""; postBody = ""; coverUrl = ""; attachedVoucherId = ""; postType = "main"
        }
    }

    private func submit() async {
        saving = true; error = nil
        do {
            if mode == 0 {
                let input = PromotionVoucherCreate(
                    code: code,
                    title: voucherTitle,
                    description: voucherDescription.isEmpty ? nil : voucherDescription,
                    discount_percent: Double(discountPercent.replacingOccurrences(of: ",", with: ".")),
                    discount_amount: Double(discountAmount.replacingOccurrences(of: ".", with: "")),
                    valid_from: validFrom,
                    valid_until: validUntil
                )
                if let selectedVoucherId { try await onUpdateVoucher(selectedVoucherId, input) } else { try await onCreateVoucher(input) }
                resetCurrentForm()
            } else {
                let input = PromotionPostCreate(
                    title: postTitle,
                    subtitle: postSubtitle.isEmpty ? nil : postSubtitle,
                    body: postBody.isEmpty ? nil : postBody,
                    cover_image_url: coverUrl,
                    post_type: postType,
                    voucher_id: attachedVoucherId.isEmpty ? nil : attachedVoucherId,
                    status: "published",
                    sort_order: postType == "main" ? 10 : 0,
                    starts_at: nil,
                    ends_at: nil
                )
                if let selectedPostId { try await onUpdatePost(selectedPostId, input) } else { try await onCreatePost(input) }
                resetCurrentForm()
            }
        } catch {
            self.error = formatApiError(error, fallback: "Không lưu được ưu đãi")
        }
        saving = false
    }

    private func deleteSelected() async {
        saving = true; error = nil
        do {
            if mode == 0, let selectedVoucherId { try await onDeleteVoucher(selectedVoucherId) }
            if mode == 1, let selectedPostId { try await onDeletePost(selectedPostId) }
            resetCurrentForm()
        } catch {
            self.error = formatApiError(error, fallback: "Không xoá được ưu đãi")
        }
        saving = false
    }

    private func discountLabel(_ voucher: Promotion) -> String {
        if let pct = voucher.discount_percent, pct > 0 { return "Giảm \(Int(pct))%" }
        if let amount = voucher.discount_amount, amount > 0 { return FormatUtils.formatVnd(amount) }
        return "Ưu đãi"
    }
}

private struct AdminCreateUserSheet: View {
    let onCreate: (AdminUserCreate) async throws -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var isAdmin = false
    @State private var isBusiness = false
    @State private var isBanned = false
    @State private var error: String?
    @State private var saving = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Thông tin") {
                    TextField("Tên hiển thị", text: $name)
                    TextField("Email", text: $email)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                    SecureField("Mật khẩu", text: $password)
                }
                Section("Role") {
                    Toggle("Admin", isOn: $isAdmin)
                    Toggle("Doanh nghiệp", isOn: $isBusiness)
                    Toggle("Banned", isOn: $isBanned)
                }
                if let error {
                    Text(error).foregroundStyle(.red)
                }
            }
            .navigationTitle("Thêm user")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Huỷ") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Đang tạo..." : "Tạo") {
                        Task {
                            saving = true
                            do {
                                try await onCreate(AdminUserCreate(
                                    email: email,
                                    password: password,
                                    display_name: name,
                                    is_admin: isAdmin,
                                    is_business: isBusiness,
                                    status: isBanned ? "banned" : "active"
                                ))
                                dismiss()
                            } catch {
                                self.error = formatApiError(error, fallback: "Không tạo được user")
                            }
                            saving = false
                        }
                    }
                    .disabled(email.isEmpty || password.count < 6 || saving)
                }
            }
        }
    }
}

extension AdminUserDetail: Identifiable {
    var id: String { user.id }
}

private struct AdminUserDetailView: View {
    let detail: AdminUserDetail
    let onStatus: (String) async throws -> Void
    let onRoleToggle: () async throws -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack {
                    Button { dismiss() } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 19, weight: .semibold))
                            .foregroundStyle(AdminPortalStyle.text)
                            .frame(width: 48, height: 48)
                            .background(AdminPortalStyle.card)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(AdminPortalStyle.stroke))
                    }
                    Spacer()
                    Text("Chi tiết user")
                        .font(.system(size: 23, weight: .bold))
                        .foregroundStyle(AdminPortalStyle.text)
                    Spacer()
                    Color.clear.frame(width: 48, height: 48)
                }
                .padding(.horizontal, 22)
                .padding(.top, 18)
                .padding(.bottom, 16)
                .overlay(Rectangle().fill(AdminPortalStyle.stroke).frame(height: 1), alignment: .bottom)

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        HStack(spacing: 18) {
                            Text(initials(for: detail.user.display_name ?? detail.user.email))
                                .font(.system(size: 28, weight: .bold))
                                .foregroundStyle(AdminPortalStyle.purple)
                                .frame(width: 78, height: 78)
                                .background(AdminPortalStyle.lavender.opacity(0.65))
                                .clipShape(Circle())
                            VStack(alignment: .leading, spacing: 6) {
                                Text(detail.user.display_name ?? detail.user.email ?? detail.user.id)
                                    .font(.system(size: 22, weight: .bold))
                                    .foregroundStyle(Color(red: 0.18, green: 0.16, blue: 0.48))
                                    .lineLimit(1)
                                Text(detail.user.email ?? "—")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(AdminPortalStyle.purple)
                                    .lineLimit(1)
                                HStack(spacing: 8) {
                                    detailPill(detail.user.status == "banned" ? "Banned" : "Active", bad: detail.user.status == "banned")
                                    detailPill(accountPlanLabel(detail.user), dark: true)
                                }
                            }
                        }
                        .padding(22)
                        .background(Color(red: 0.91, green: 0.90, blue: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 14))

                        adminDetailSectionTitle("THÔNG TIN")
                        VStack(spacing: 0) {
                            infoRow("Ngày đăng ký", formatShortDate(detail.user.created_at))
                            detailDivider
                            infoRow("Lần đăng nhập cuối", formatShortDateTime(detail.user.last_login_at))
                            detailDivider
                            infoRow("Thiết bị", detail.user.last_device ?? "—")
                            detailDivider
                            infoRow("Tổng chuyến đi", "\(detail.trips.count) chuyến")
                            detailDivider
                            infoRow("Role", detail.user.is_admin ? "Admin" : (detail.user.is_business ? "Business" : "User"))
                        }

                        adminDetailSectionTitle("CHUYẾN ĐI GẦN NHẤT")
                        if detail.trips.isEmpty {
                            Text("User chưa có chuyến đi.")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(AdminPortalStyle.muted)
                                .padding(.vertical, 10)
                        } else {
                            VStack(spacing: 0) {
                                ForEach(Array(detail.trips.prefix(3).enumerated()), id: \.element.id) { index, trip in
                                    tripRow(trip)
                                    if index < min(detail.trips.count, 3) - 1 { detailDivider }
                                }
                            }
                        }

                        HStack(spacing: 12) {
                            Button(detail.user.is_business ? "Thu hồi role" : "Đổi role") {
                                Task {
                                    try? await onRoleToggle()
                                    dismiss()
                                }
                            }
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(AdminPortalStyle.text)
                            .frame(maxWidth: .infinity)
                            .frame(height: 54)
                            .background(AdminPortalStyle.bg)
                            .clipShape(RoundedRectangle(cornerRadius: 13))
                            .overlay(RoundedRectangle(cornerRadius: 13).stroke(AdminPortalStyle.stroke))

                            Button(detail.user.status == "banned" ? "Mở ban" : "Ban user") {
                                Task {
                                    try? await onStatus(detail.user.status == "banned" ? "active" : "banned")
                                    dismiss()
                                }
                            }
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(Color(red: 0.48, green: 0.08, blue: 0.08))
                            .frame(maxWidth: .infinity)
                            .frame(height: 54)
                            .background(Color(red: 1, green: 0.92, blue: 0.92))
                            .clipShape(RoundedRectangle(cornerRadius: 13))
                        }
                    }
                    .padding(22)
                }
            }
            .background(AdminPortalStyle.bg.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    private func infoRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).foregroundStyle(AdminPortalStyle.muted)
            Spacer()
            Text(value)
                .fontWeight(.bold)
                .foregroundStyle(AdminPortalStyle.text)
                .multilineTextAlignment(.trailing)
        }
        .font(.system(size: 15))
        .padding(.vertical, 12)
    }

    private var detailDivider: some View {
        Rectangle().fill(AdminPortalStyle.stroke).frame(height: 1)
    }

    private func adminDetailSectionTitle(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 14, weight: .bold))
            .foregroundStyle(AdminPortalStyle.muted)
            .tracking(0.7)
    }

    private func detailPill(_ text: String, bad: Bool = false, dark: Bool = false) -> some View {
        Text(text)
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(dark ? AdminPortalStyle.text : (bad ? Color(red: 0.48, green: 0.08, blue: 0.08) : AdminPortalStyle.green))
            .padding(.horizontal, 12)
            .padding(.vertical, 5)
            .background(dark ? AdminPortalStyle.bg.opacity(0.95) : (bad ? Color(red: 1, green: 0.92, blue: 0.92) : Color(red: 0.80, green: 1, blue: 0.91)))
            .clipShape(Capsule())
            .overlay(Capsule().stroke(dark ? AdminPortalStyle.stroke : Color.clear))
    }

    private func accountPlanLabel(_ user: AdminUserRow) -> String {
        let tier = user.subscription_tier?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if user.is_premium == true || tier == "premium" || tier == "pro" {
            return "Premium"
        }
        return "Free"
    }

    private func tripRow(_ trip: AdminTripBrief) -> some View {
        HStack(spacing: 14) {
            Image(systemName: "mappin.circle")
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(AdminPortalStyle.green)
                .frame(width: 52, height: 52)
                .background(Color(red: 0.86, green: 1, blue: 0.95))
                .clipShape(RoundedRectangle(cornerRadius: 11))
            VStack(alignment: .leading, spacing: 4) {
                Text(trip.destination)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(AdminPortalStyle.text)
                    .lineLimit(1)
                Text("\(formatDateRange(trip.start_date, trip.end_date)) · \(trip.travelers ?? 1) người")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(AdminPortalStyle.muted)
                    .lineLimit(1)
            }
            Spacer()
            Text("AI trip")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Color(red: 0.09, green: 0.36, blue: 0.62))
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color(red: 0.85, green: 0.93, blue: 1))
                .clipShape(Capsule())
        }
        .padding(.vertical, 13)
    }

    private func initials(for name: String?) -> String {
        let parts = (name ?? "User").split(separator: " ").prefix(2).compactMap { $0.first }
        let result = String(parts).uppercased()
        return result.isEmpty ? "U" : result
    }

    private func formatShortDate(_ raw: String?) -> String {
        guard let raw else { return "—" }
        let parts = String(raw.prefix(10)).split(separator: "-")
        guard parts.count == 3 else { return String(raw.prefix(10)) }
        return "\(parts[2])/\(parts[1])/\(parts[0])"
    }

    private func formatShortDateTime(_ raw: String?) -> String {
        guard let raw else { return "—" }
        let date = formatShortDate(raw)
        let time = raw.count >= 16 ? String(raw.dropFirst(11).prefix(5)) : ""
        return time.isEmpty ? date : "\(date), \(time)"
    }

    private func formatDateRange(_ start: String?, _ end: String?) -> String {
        "\(formatShortDate(start))-\(formatShortDate(end))"
    }
}
