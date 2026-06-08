import SwiftUI
import PhotosUI
import CoreImage.CIFilterBuiltins
import UIKit

struct BusinessPortalView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState
    @State private var section = 0
    @State private var overview: BusinessOverview?
    @State private var transactions: [PlatformTransaction] = []
    @State private var packages: [AdPackage] = []
    @State private var campaigns: [BusinessCampaignRow] = []
    @State private var vouchers: [BusinessVoucherRow] = []
    @State private var locations: [BusinessLocationRow] = []
    @State private var reviews: [BusinessReviewRow] = []
    @State private var media: [BusinessMediaRow] = []
    @State private var payouts: [PayoutRecord] = []
    @State private var loading = true
    @State private var error: String?
    @State private var purchaseMessage: String?
    @State private var showingCampaignForm = false
    @State private var showingVoucherForm = false
    @State private var showingLocationForm = false
    @State private var showingMediaForm = false
    @State private var adPayResponse: AdPurchaseResponse?
    @State private var purchaseLoading = false
    @State private var voucherFilter = "active"
    @State private var reviewFilter = "all"
    @State private var notifications: [BusinessNotification] = []
    @State private var showNotifications = false

    private let sections = ["Dashboard", "Quảng cáo", "Voucher", "Hồ sơ"]

    var body: some View {
        VStack(spacing: 0) {
            businessTopBar
            ScrollView {
                if loading {
                    ProgressView().tint(.white).padding(.top, 40)
                } else if let error {
                    Text(error).foregroundStyle(.red).padding()
                } else {
                    Group {
                        switch section {
                        case 0: overviewSection
                        case 1: adsSection
                        case 2: vouchersSection
                        default: profileSection
                        }
                    }
                    .padding(.horizontal, PremiumTheme.screenPadding)
                    .padding(.bottom, 72)
                }
            }
        }
        .overlay(alignment: .bottom) {
            businessBottomBar
        }
        .background(BusinessPortalStyle.bg.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 15_000_000_000)
                if Task.isCancelled { break }
                await refreshLight()
            }
        }
        .sheet(isPresented: $showingCampaignForm) {
            BusinessCampaignForm { input in
                try await ApiService.createBusinessCampaign(input)
                await load()
            }
        }
        .sheet(isPresented: $showingVoucherForm) {
            BusinessVoucherForm { input in
                try await ApiService.createBusinessVoucher(input)
                await load()
            }
        }
        .sheet(isPresented: $showingLocationForm) {
            BusinessLocationForm { input, imageURLs in
                let loc = try await ApiService.createBusinessLocation(input)
                for url in imageURLs.prefix(6) {
                    _ = try? await ApiService.uploadBusinessMedia(
                        BusinessMediaCreate(url: url, type: "image", location_id: loc.id, thumbnail_url: nil)
                    )
                }
                if !imageURLs.isEmpty {
                    purchaseMessage = "Đã thêm địa điểm + \(min(imageURLs.count, 6)) ảnh. Ảnh chờ admin duyệt."
                }
                await load()
            }
        }
        .sheet(isPresented: $showingMediaForm) {
            BusinessMediaForm { inputs in
                for input in inputs.prefix(6) {
                    _ = try await ApiService.uploadBusinessMedia(input)
                }
                purchaseMessage = "Đã gửi \(min(inputs.count, 6)) media. Chờ admin duyệt."
                await load()
            }
        }
        .sheet(item: $adPayResponse) { response in
            AdPackagePaymentSheet(response: response) {
                adPayResponse = nil
                Task { await load() }
            }
        }
        .sheet(isPresented: $showNotifications) {
            BusinessNotificationsSheet(notifications: notifications)
        }
    }

    private var businessTopBar: some View {
        HStack {
            Menu {
                Button("Thông tin cá nhân") { purchaseMessage = appState.accountInfo?.profile?.email ?? "Chưa có thông tin tài khoản." }
                Button(appState.darkMode ? "Chuyển sang Light mode" : "Chuyển sang Dark mode") { appState.setDarkMode(!appState.darkMode) }
                Button("Đăng xuất", role: .destructive) { appState.signOut() }
            } label: {
                Image(systemName: "line.3.horizontal")
                    .font(.system(size: 19, weight: .semibold))
                    .foregroundStyle(BusinessPortalStyle.text)
                    .frame(width: 48, height: 48)
                    .background(BusinessPortalStyle.card)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(BusinessPortalStyle.stroke))
            }
            Spacer()
            Text(topBarTitle)
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(BusinessPortalStyle.text)
            Spacer()
            Button {
                showNotifications = true
            } label: {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: "bell")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(BusinessPortalStyle.text)
                        .frame(width: 48, height: 48)
                        .background(BusinessPortalStyle.card)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(BusinessPortalStyle.stroke))
                    if !notifications.isEmpty {
                        Text("\(min(notifications.count, 9))")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 16, height: 16)
                            .background(Color.red)
                            .clipShape(Circle())
                            .offset(x: -4, y: 4)
                    }
                }
            }
            Button { handleTopBarAction() } label: {
                Image(systemName: topBarIcon)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(BusinessPortalStyle.text)
                    .frame(width: 48, height: 48)
                    .background(BusinessPortalStyle.card)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(BusinessPortalStyle.stroke))
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 18)
        .padding(.bottom, 14)
        .background(BusinessPortalStyle.bg)
    }

    private var topBarTitle: String {
        switch section {
        case 1: return "Quảng cáo"
        case 2: return "Voucher"
        case 3: return "Hồ sơ"
        default: return "Dashboard"
        }
    }

    private var topBarIcon: String {
        switch section {
        case 1: return "plus"
        case 2: return "plus"
        case 3: return "plus"
        default: return "bell"
        }
    }

    private func handleTopBarAction() {
        switch section {
        case 1:
            showingCampaignForm = true
        case 2:
            showingVoucherForm = true
        case 3:
            showingLocationForm = true
        default:
            purchaseMessage = reviews.first(where: { ($0.reply ?? "").isEmpty })?.comment ?? "Chưa có thông báo mới."
        }
    }

    private var businessBottomBar: some View {
        HStack(spacing: 0) {
            ForEach(sections.indices, id: \.self) { i in
                Button {
                    section = i
                } label: {
                    VStack(spacing: 3) {
                        Image(systemName: bottomIcon(for: i))
                            .font(.system(size: 19, weight: .semibold))
                        Text(sections[i])
                            .font(.system(size: 11, weight: .medium))
                    }
                    .foregroundStyle(section == i ? BusinessPortalStyle.accent : BusinessPortalStyle.muted)
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
            BusinessPortalStyle.bg.opacity(0.98)
                .ignoresSafeArea(edges: .bottom)
        }
        .overlay(Rectangle().fill(BusinessPortalStyle.stroke).frame(height: 1), alignment: .top)
        .offset(y: PremiumTheme.portalBottomBarDrop)
        .ignoresSafeArea(.container, edges: .bottom)
    }

    private func bottomIcon(for index: Int) -> String {
        switch index {
        case 0: return "square.grid.2x2"
        case 1: return "megaphone"
        case 2: return "ticket"
        default: return "person.crop.circle"
        }
    }

    @ViewBuilder
    private var overviewSection: some View {
        if let o = overview {
            VStack(alignment: .leading, spacing: 18) {
                businessIdentity(o.business)
                sectionTitle("DOANH THU BOOKING")
                HStack(spacing: 12) {
                    metricCard("Doanh thu (net)", formatPlatformVnd(o.net_revenue_vnd), subtitle: "sau hoa hồng")
                    metricCard("Tổng booking", "\(o.booking_count)", subtitle: "đã xác nhận")
                }
                if let expiry = o.ad_package_expiry {
                    Text("Hạn gói quảng bá: \(String(expiry.prefix(10)))")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(BusinessPortalStyle.muted)
                }
                sectionTitle("HIỆU QUẢ HÔM NAY")
                HStack(spacing: 12) {
                    metricCard("Lượt hiển thị", "\(o.impressions)", subtitle: "campaign")
                    metricCard("Click ads", "\(o.clicks)", subtitle: "CTR \(Int(o.ctr * 1000) / 10)%")
                }
                HStack(spacing: 12) {
                    metricCard("Trong trip AI", "\(o.suggested_count)", subtitle: "lượt được gợi ý")
                    metricCard("Ngân sách còn", formatPlatformVnd(o.remaining_budget_vnd))
                }
                sectionTitle("LƯỢT HIỂN THỊ 7 NGÀY")
                impressionsChart
                sectionTitle("VOUCHER ĐANG CHẠY")
                if activeVouchers.isEmpty {
                    darkEmptyState("Chưa có voucher đang chạy.")
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(activeVouchers.prefix(2).enumerated()), id: \.element.id) { index, voucher in
                            voucherInlineRow(voucher)
                            if index < min(activeVouchers.count, 2) - 1 { darkDivider }
                        }
                    }
                }
                sectionTitle("REVIEW GẦN NHẤT")
                if reviews.isEmpty {
                    darkEmptyState("Chưa có đánh giá.")
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(reviews.prefix(2).enumerated()), id: \.element.id) { index, review in
                            reviewInlineRow(review)
                            if index < min(reviews.count, 2) - 1 { darkDivider }
                        }
                    }
                }
            }
        }
    }

    private func businessIdentity(_ business: BusinessProfileRow?) -> some View {
        HStack(spacing: 16) {
            Text(initials(for: business?.name))
                .font(.system(size: 19, weight: .bold))
                .foregroundStyle(BusinessPortalStyle.accent)
                .frame(width: 60, height: 60)
                .background(BusinessPortalStyle.accentSoft)
                .clipShape(RoundedRectangle(cornerRadius: 14))
            VStack(alignment: .leading, spacing: 4) {
                Text(business?.name ?? "Doanh nghiệp")
                    .font(.system(size: 19, weight: .bold))
                    .foregroundStyle(BusinessPortalStyle.text)
                HStack(spacing: 4) {
                    Image(systemName: "checkmark.seal")
                    Text(statusLabel(business?.status ?? "pending"))
                }
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(BusinessPortalStyle.accent)
            }
            Spacer()
        }
        .padding(.top, 12)
    }

    private func sectionTitle(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 15, weight: .bold))
            .foregroundStyle(BusinessPortalStyle.muted)
            .tracking(0.6)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var impressionsChart: some View {
        let values = chartValues
        return ZStack(alignment: .bottom) {
            RoundedRectangle(cornerRadius: 12).fill(BusinessPortalStyle.card)
            if values.allSatisfy({ $0 == 0 }) {
                Text("Chưa có dữ liệu hiển thị.")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(BusinessPortalStyle.muted)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                GeometryReader { proxy in
                    let maxValue = max(values.max() ?? 1, 1)
                    Path { path in
                        for index in values.indices {
                            let x = proxy.size.width * CGFloat(index) / CGFloat(max(values.count - 1, 1))
                            let y = proxy.size.height - (CGFloat(values[index]) / CGFloat(maxValue) * (proxy.size.height - 34)) - 24
                            if index == values.startIndex {
                                path.move(to: CGPoint(x: x, y: y))
                            } else {
                                path.addLine(to: CGPoint(x: x, y: y))
                            }
                        }
                    }
                    .stroke(BusinessPortalStyle.accent, style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
                    Path { path in
                        for index in values.indices {
                            let x = proxy.size.width * CGFloat(index) / CGFloat(max(values.count - 1, 1))
                            let y = proxy.size.height - (CGFloat(values[index]) / CGFloat(maxValue) * (proxy.size.height - 34)) - 24
                            if index == values.startIndex {
                                path.move(to: CGPoint(x: x, y: y))
                            } else {
                                path.addLine(to: CGPoint(x: x, y: y))
                            }
                        }
                        path.addLine(to: CGPoint(x: proxy.size.width, y: proxy.size.height - 24))
                        path.addLine(to: CGPoint(x: 0, y: proxy.size.height - 24))
                        path.closeSubpath()
                    }
                    .fill(BusinessPortalStyle.accent.opacity(0.18))
                }
                .padding(.horizontal, 18)
                .padding(.top, 18)
                HStack {
                    ForEach(["T2", "T3", "T4", "T5", "T6", "T7", "CN"], id: \.self) { day in
                        Text(day)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(BusinessPortalStyle.muted)
                            .frame(maxWidth: .infinity)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 12)
            }
        }
        .frame(height: 150)
    }

    private var chartValues: [Int] {
        let sorted = campaigns.sorted { ($0.created_at ?? "") < ($1.created_at ?? "") }
        let values = sorted.suffix(7).map { $0.impressions ?? 0 }
        return Array(repeating: 0, count: max(0, 7 - values.count)) + values
    }

    private var activeVouchers: [BusinessVoucherRow] {
        vouchers.filter { voucherStatus($0) == "active" || $0.status == "active" }
    }

    private var darkDivider: some View {
        Rectangle()
            .fill(BusinessPortalStyle.stroke)
            .frame(height: 1)
    }

    private func darkEmptyState(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 13, weight: .medium))
            .foregroundStyle(BusinessPortalStyle.muted)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(BusinessPortalStyle.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func voucherInlineRow(_ voucher: BusinessVoucherRow) -> some View {
        HStack(spacing: 14) {
            Image(systemName: voucher.discount_type == "free_shipping" ? "gift" : "seal")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(voucher.discount_type == "free_shipping" ? .orange : .indigo)
                .frame(width: 48, height: 48)
                .background(voucher.discount_type == "free_shipping" ? Color.orange.opacity(0.16) : Color.indigo.opacity(0.18))
                .clipShape(RoundedRectangle(cornerRadius: 9))
            VStack(alignment: .leading, spacing: 3) {
                Text(voucher.code)
                    .font(.system(size: 18, weight: .bold, design: .monospaced))
                    .foregroundStyle(BusinessPortalStyle.text)
                Text("\(voucher.title) · Còn \(max((voucher.usage_limit ?? 0) - (voucher.used_count ?? 0), 0))/\(voucher.usage_limit ?? 0) lượt")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(BusinessPortalStyle.muted)
                    .lineLimit(1)
            }
            Spacer()
            statusChip(voucherStatus(voucher))
        }
        .padding(.vertical, 10)
    }

    private func reviewInlineRow(_ review: BusinessReviewRow) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Text(initials(for: review.author_name))
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(BusinessPortalStyle.accent)
                .frame(width: 44, height: 44)
                .background(BusinessPortalStyle.accentSoft)
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 4) {
                Text(review.author_name ?? "Người dùng")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(BusinessPortalStyle.text)
                Text(stars(review.rating))
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.orange)
                Text(review.comment ?? "—")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(BusinessPortalStyle.muted)
                    .lineLimit(2)
            }
            Spacer()
        }
        .padding(.vertical, 12)
    }

    private var transactionsSection: some View {
        VStack(spacing: 10) {
            if transactions.isEmpty {
                Text("Chưa có giao dịch.").foregroundStyle(PremiumTheme.textMuted)
            } else {
                ForEach(transactions) { tx in
                    PremiumSurfaceCard {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(tx.description ?? tx.kind ?? "Giao dịch")
                                .font(.system(size: 14, weight: .semibold))
                            HStack {
                                Text(formatPlatformVnd(tx.net_amount))
                                    .foregroundStyle(PremiumTheme.accent)
                                Spacer()
                                if let c = tx.commission_amount, c > 0 {
                                    Text("HH: \(formatPlatformVnd(c))")
                                        .font(.system(size: 11))
                                        .foregroundStyle(PremiumTheme.textMuted)
                                }
                            }
                            if let date = tx.created_at {
                                Text(String(date.prefix(16).replacingOccurrences(of: "T", with: " ")))
                                    .font(.system(size: 11))
                                    .foregroundStyle(PremiumTheme.textMuted)
                            }
                        }
                    }
                }
            }
        }
    }

    private var adsSection: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(spacing: 12) {
                metricCard("Tổng hiển thị", compactNumber(overview?.impressions ?? campaigns.reduce(0) { $0 + ($1.impressions ?? 0) }), subtitle: "+\(weeklyGrowthEstimate)% tuần này")
                metricCard("Ngân sách còn", formatPlatformVnd(overview?.remaining_budget_vnd ?? 0), subtitle: remainingBudgetSubtitle)
            }
            sectionTitle("CHIẾN DỊCH ĐANG CHẠY")
            Button {
                showingCampaignForm = true
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: "plus")
                        .font(.system(size: 17, weight: .bold))
                    Text("Tạo chiến dịch mới")
                        .font(.system(size: 17, weight: .bold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 58)
                .background(BusinessPortalStyle.accent.opacity(0.78))
                .clipShape(RoundedRectangle(cornerRadius: 13))
            }
            .buttonStyle(.plain)
            if campaigns.isEmpty {
                darkEmptyState("Chưa có chiến dịch quảng cáo.")
            } else {
                ForEach(campaigns) { c in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(c.name)
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(BusinessPortalStyle.text)
                            Spacer()
                            statusChip(c.status ?? "active")
                        }
                        Text("\(c.target_type ?? "Target") · \(c.region ?? "Toàn quốc") · \(c.season ?? "Luôn bật")")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(BusinessPortalStyle.muted)
                        HStack {
                            Text("Hiển thị \(c.impressions ?? 0)")
                            Text("Click \(c.clicks ?? 0)")
                            Text("Gợi ý \(c.suggested_count ?? 0)")
                        }
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(BusinessPortalStyle.accent)
                        Text("Ngân sách: \(formatPlatformVnd(c.budget_vnd))")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(BusinessPortalStyle.text)
                    }
                    .padding(16)
                    .background(BusinessPortalStyle.card)
                    .clipShape(RoundedRectangle(cornerRadius: 13))
                }
            }

            if let purchaseMessage {
                Text(purchaseMessage)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(BusinessPortalStyle.accent)
            }
            if !packages.isEmpty {
                sectionTitle("GÓI QUẢNG CÁO")
                ForEach(packages) { pkg in
                    let isCurrent = overview?.active_ad_package?.package_id == pkg.id
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(pkg.name)
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(BusinessPortalStyle.text)
                            if isCurrent {
                                Text("Đang dùng")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 8).padding(.vertical, 3)
                                    .background(BusinessPortalStyle.accent)
                                    .clipShape(Capsule())
                            }
                            Spacer()
                        }
                        if let desc = pkg.description {
                            Text(desc)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(BusinessPortalStyle.muted)
                        }
                        HStack {
                            Text(formatPlatformVnd(pkg.price_vnd))
                                .font(.system(size: 18, weight: .bold))
                                .foregroundStyle(BusinessPortalStyle.accent)
                            Spacer()
                            Text("\(pkg.duration_days ?? 0) ngày")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(BusinessPortalStyle.muted)
                        }
                        if isCurrent {
                            HStack(spacing: 6) {
                                Image(systemName: "checkmark.seal.fill")
                                Text(currentPackageExpiryText)
                            }
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(BusinessPortalStyle.accent)
                            .frame(maxWidth: .infinity)
                            .frame(height: 42)
                            .background(BusinessPortalStyle.accent.opacity(0.12))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        } else {
                            Button {
                                Task { await purchase(pkg.id) }
                            } label: {
                                HStack(spacing: 8) {
                                    if purchaseLoading {
                                        ProgressView().tint(.white).scaleEffect(0.8)
                                    }
                                    Text(purchaseLoading ? "Đang xử lý…" : "Mua gói")
                                }
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 42)
                                .background(purchaseLoading ? BusinessPortalStyle.accent.opacity(0.6) : BusinessPortalStyle.accent)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                            .disabled(purchaseLoading)
                        }
                    }
                    .padding(16)
                    .background(BusinessPortalStyle.card)
                    .clipShape(RoundedRectangle(cornerRadius: 13))
                    .overlay(
                        RoundedRectangle(cornerRadius: 13)
                            .stroke(isCurrent ? BusinessPortalStyle.accent : Color.clear, lineWidth: 1.5)
                    )
                }
            }
        }
    }

    private var currentPackageExpiryText: String {
        guard let ends = overview?.active_ad_package?.ends_at else { return "Đang sử dụng" }
        let isoFrac = ISO8601DateFormatter()
        isoFrac.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let iso = ISO8601DateFormatter()
        if let date = isoFrac.date(from: ends) ?? iso.date(from: ends) {
            let df = DateFormatter()
            df.locale = Locale(identifier: "vi_VN")
            df.dateFormat = "dd/MM/yyyy"
            return "Hết hạn \(df.string(from: date))"
        }
        return "Đang sử dụng"
    }

    private var weeklyGrowthEstimate: Int {
        let total = campaigns.reduce(0) { $0 + ($1.impressions ?? 0) }
        guard total > 0 else { return 0 }
        let active = max(campaigns.filter { ($0.status ?? "active") == "active" }.count, 1)
        return min(99, max(1, total / active / 100))
    }

    private var remainingBudgetSubtitle: String {
        let active = campaigns.filter { ($0.status ?? "active") == "active" }
        guard !active.isEmpty else { return "Chưa chạy" }
        return "\(active.count) chiến dịch"
    }

    private func compactNumber(_ value: Int) -> String {
        if value >= 1_000_000 {
            return String(format: "%.1fM", Double(value) / 1_000_000)
        }
        if value >= 1_000 {
            return String(format: "%.1fK", Double(value) / 1_000)
        }
        return "\(value)"
    }

    private var vouchersSection: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(spacing: 10) {
                voucherFilterButton("Đang chạy", value: "active")
                voucherFilterButton("Sắp hết", value: "ending")
                voucherFilterButton("Đã kết thúc", value: "ended")
            }
            if filteredVouchers.isEmpty {
                darkEmptyState("Chưa có voucher trong nhóm này.")
            } else {
                ForEach(filteredVouchers) { voucher in
                    voucherCard(voucher)
                }
            }
            Button {
                showingVoucherForm = true
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: "plus")
                        .font(.system(size: 17, weight: .bold))
                    Text("Tạo voucher mới")
                        .font(.system(size: 17, weight: .bold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 60)
                .background(BusinessPortalStyle.accent.opacity(0.78))
                .clipShape(RoundedRectangle(cornerRadius: 13))
            }
            .buttonStyle(.plain)
        }
    }

    private var filteredVouchers: [BusinessVoucherRow] {
        vouchers.filter { voucherDisplayStatus($0) == voucherFilter }
    }

    private func voucherFilterButton(_ title: String, value: String) -> some View {
        Button {
            voucherFilter = value
        } label: {
            Text(title)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(voucherFilter == value ? BusinessPortalStyle.accent : BusinessPortalStyle.muted)
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
                .background(voucherFilter == value ? BusinessPortalStyle.accentSoft : BusinessPortalStyle.bg)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(voucherFilter == value ? BusinessPortalStyle.accentSoft : BusinessPortalStyle.stroke))
        }
        .buttonStyle(.plain)
    }

    private func voucherCard(_ voucher: BusinessVoucherRow) -> some View {
        let status = voucherDisplayStatus(voucher)
        let progress = voucherUsage(voucher)
        return VStack(alignment: .leading, spacing: 13) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 5) {
                    Text(voucher.code)
                        .font(.system(size: 22, weight: .bold, design: .monospaced))
                        .foregroundStyle(status == "ended" ? BusinessPortalStyle.muted : BusinessPortalStyle.text)
                    Text(voucher.title)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(BusinessPortalStyle.muted)
                }
                Spacer()
                statusChip(status)
            }
            HStack {
                Text(status == "ended" ? "Kết thúc" : "Hết hạn")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(BusinessPortalStyle.muted)
                Spacer()
                Text(formatVoucherDate(voucher.valid_until))
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(status == "ended" ? BusinessPortalStyle.muted : BusinessPortalStyle.text)
            }
            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.black.opacity(0.18))
                    Capsule()
                        .fill(status == "ended" ? BusinessPortalStyle.muted : (status == "ending" ? .orange : BusinessPortalStyle.accent))
                        .frame(width: proxy.size.width * progress)
                }
            }
            .frame(height: 5)
            HStack {
                Spacer()
                Text("\(voucher.used_count ?? 0)/\(voucher.usage_limit ?? 0) lượt dùng")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(BusinessPortalStyle.muted)
            }
        }
        .padding(18)
        .background(BusinessPortalStyle.bg)
        .clipShape(RoundedRectangle(cornerRadius: 13))
        .overlay(
            RoundedRectangle(cornerRadius: 13)
                .stroke(style: StrokeStyle(lineWidth: 1, dash: [3, 3]))
                .foregroundStyle(BusinessPortalStyle.stroke)
        )
        .opacity(status == "ended" ? 0.62 : 1)
    }

    private var profileSection: some View {
        VStack(alignment: .leading, spacing: 22) {
            if let business = overview?.business {
                HStack(spacing: 16) {
                    Text(initials(for: business.name))
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(Color(red: 0.0, green: 0.22, blue: 0.18))
                        .frame(width: 82, height: 82)
                        .background(Color(red: 0.37, green: 0.80, blue: 0.66))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                    VStack(alignment: .leading, spacing: 8) {
                        Text(business.name ?? "Doanh nghiệp")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(Color(red: 0.02, green: 0.22, blue: 0.18))
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark.seal")
                            Text(statusLabel(business.status ?? "pending"))
                        }
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color(red: 0.0, green: 0.48, blue: 0.38))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color(red: 0.66, green: 0.90, blue: 0.82))
                        .clipShape(Capsule())
                        Text("Tham gia \(formatBusinessJoinDate(business.created_at))")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color(red: 0.0, green: 0.43, blue: 0.34))
                        if let pkgName = overview?.active_ad_package?.name {
                            HStack(spacing: 4) {
                                Image(systemName: "crown.fill")
                                Text(pkgName)
                            }
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(Color(red: 0.0, green: 0.48, blue: 0.38))
                            .clipShape(Capsule())
                        }
                    }
                    Spacer()
                }
                .padding(22)
                .background(BusinessPortalStyle.accentSoft)
                .clipShape(RoundedRectangle(cornerRadius: 17))

                sectionTitle("THÔNG TIN DOANH NGHIỆP")
                VStack(spacing: 0) {
                    businessInfoRow("Loại hình", business.business_type ?? "—")
                    darkDivider
                    businessInfoRow("Khu vực", business.region ?? "—")
                    darkDivider
                    businessInfoRow("Hotline", business.hotline ?? "—", valueColor: BusinessPortalStyle.accent)
                    darkDivider
                    businessInfoRow("Rating", "★ \(String(format: "%.1f", business.rating_avg ?? 0)) (\(business.rating_count ?? 0) đánh giá)", valueColor: .orange)
                }
            }
            sectionTitle("ĐỊA ĐIỂM ĐÃ ĐĂNG KÝ")
            if locations.isEmpty {
                darkEmptyState("Chưa có địa điểm.")
            } else {
                ForEach(locations) { loc in
                    HStack(spacing: 14) {
                        Image(systemName: (loc.category ?? "").localizedCaseInsensitiveContains("tour") ? "storefront" : "mappin.circle")
                            .font(.system(size: 26, weight: .semibold))
                            .foregroundStyle(BusinessPortalStyle.text)
                            .frame(width: 68, height: 68)
                            .background(BusinessPortalStyle.card)
                            .clipShape(RoundedRectangle(cornerRadius: 11))
                        VStack(alignment: .leading, spacing: 5) {
                            Text(loc.name)
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(BusinessPortalStyle.text)
                            Text([loc.address, loc.category].compactMap { $0 }.joined(separator: " · "))
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(BusinessPortalStyle.muted)
                                .lineLimit(2)
                        }
                        Spacer()
                        statusChip(loc.status ?? "live")
                    }
                    .padding(18)
                    .background(BusinessPortalStyle.bg)
                    .clipShape(RoundedRectangle(cornerRadius: 13))
                    .overlay(RoundedRectangle(cornerRadius: 13).stroke(BusinessPortalStyle.stroke))
                }
            }
            Button {
                showingLocationForm = true
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: "plus")
                    Text("Thêm địa điểm mới")
                }
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 58)
                .background(BusinessPortalStyle.accent.opacity(0.78))
                .clipShape(RoundedRectangle(cornerRadius: 13))
            }
            .buttonStyle(.plain)

            sectionTitle("MEDIA (ẢNH/VIDEO)")
            Button {
                showingMediaForm = true
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: "plus")
                    Text("Thêm media (URL)")
                }
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .background(BusinessPortalStyle.accent.opacity(0.78))
                .clipShape(RoundedRectangle(cornerRadius: 13))
            }
            .buttonStyle(.plain)
            if media.isEmpty {
                darkEmptyState("Chưa có media. Thêm ảnh/video cho địa điểm — admin sẽ duyệt.")
            } else {
                ForEach(media) { item in
                    mediaRow(item)
                }
            }

            sectionTitle("GIAO DỊCH GẦN ĐÂY")
            if transactions.isEmpty {
                darkEmptyState("Chưa có giao dịch.")
            } else {
                ForEach(transactions.prefix(20)) { tx in
                    transactionRow(tx)
                }
            }

            sectionTitle("PAYOUT (THỰC NHẬN)")
            if payouts.isEmpty {
                darkEmptyState("Chưa có khoản payout nào.")
            } else {
                ForEach(payouts) { p in
                    payoutRow(p)
                }
            }

            sectionTitle("ĐÁNH GIÁ")
            reviewsManagementSection
        }
    }

    private func mediaRow(_ item: BusinessMediaRow) -> some View {
        HStack(spacing: 12) {
            Image(systemName: item.type == "video" ? "video" : "photo")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(BusinessPortalStyle.accent)
            VStack(alignment: .leading, spacing: 3) {
                Text(item.url)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(BusinessPortalStyle.text)
                    .lineLimit(1)
                if let reason = item.rejection_reason, !reason.isEmpty {
                    Text("Lý do: \(reason)")
                        .font(.system(size: 11))
                        .foregroundStyle(BusinessPortalStyle.muted)
                }
            }
            Spacer()
            statusChip(item.status ?? "pending")
        }
        .padding(14)
        .background(BusinessPortalStyle.bg)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(BusinessPortalStyle.stroke))
    }

    private func transactionRow(_ tx: PlatformTransaction) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(tx.description ?? tx.kind ?? "Giao dịch")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(BusinessPortalStyle.text)
                Text([tx.kind, tx.created_at.map { String($0.prefix(10)) }].compactMap { $0 }.joined(separator: " · "))
                    .font(.system(size: 11))
                    .foregroundStyle(BusinessPortalStyle.muted)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 3) {
                Text(formatPlatformVnd(tx.net_amount ?? tx.gross_amount))
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(BusinessPortalStyle.accent)
                Text(tx.status ?? "")
                    .font(.system(size: 11))
                    .foregroundStyle(BusinessPortalStyle.muted)
            }
        }
        .padding(14)
        .background(BusinessPortalStyle.bg)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(BusinessPortalStyle.stroke))
    }

    private func payoutRow(_ payout: PayoutRecord) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(formatPlatformVnd(payout.amount))
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(BusinessPortalStyle.text)
                Text(payout.created_at.map { String($0.prefix(10)) } ?? "")
                    .font(.system(size: 11))
                    .foregroundStyle(BusinessPortalStyle.muted)
            }
            Spacer()
            statusChip(payout.status ?? "pending")
        }
        .padding(14)
        .background(BusinessPortalStyle.bg)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(BusinessPortalStyle.stroke))
    }

    private func businessInfoRow(_ label: String, _ value: String, valueColor: Color = BusinessPortalStyle.text) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(BusinessPortalStyle.muted)
            Spacer()
            Text(value)
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(valueColor)
        }
        .padding(.vertical, 13)
    }

    private var reviewsManagementSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 12) {
                metricCard("Rating trung bình", "★ \(String(format: "%.1f", overview?.business?.rating_avg ?? 0))", subtitle: "\(overview?.business?.rating_count ?? reviews.count) đánh giá")
                metricCard("Chưa phản hồi", "\(reviews.filter { ($0.reply ?? "").isEmpty }.count)", subtitle: "cần xử lý")
            }
            HStack(spacing: 8) {
                reviewFilterButton("Tất cả", value: "all")
                reviewFilterButton("5 sao", value: "five")
                reviewFilterButton("Chưa reply", value: "unreplied")
                reviewFilterButton("Xấu", value: "bad")
            }
            if filteredReviews.isEmpty {
                darkEmptyState("Chưa có đánh giá trong nhóm này.")
            } else {
                ForEach(filteredReviews) { review in
                    reviewManagementCard(review)
                }
            }
        }
    }

    private var filteredReviews: [BusinessReviewRow] {
        switch reviewFilter {
        case "five": return reviews.filter { $0.rating == 5 }
        case "unreplied": return reviews.filter { ($0.reply ?? "").isEmpty }
        case "bad": return reviews.filter { $0.rating <= 3 }
        default: return reviews
        }
    }

    private func reviewFilterButton(_ title: String, value: String) -> some View {
        Button {
            reviewFilter = value
        } label: {
            Text(title)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(reviewFilter == value ? BusinessPortalStyle.accent : BusinessPortalStyle.muted)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(reviewFilter == value ? BusinessPortalStyle.accentSoft : BusinessPortalStyle.bg)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(reviewFilter == value ? BusinessPortalStyle.accentSoft : BusinessPortalStyle.stroke))
        }
        .buttonStyle(.plain)
    }

    private func reviewManagementCard(_ review: BusinessReviewRow) -> some View {
        let unreplied = (review.reply ?? "").isEmpty
        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 14) {
                Text(initials(for: review.author_name))
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Color(red: 0.0, green: 0.25, blue: 0.20))
                    .frame(width: 46, height: 46)
                    .background(review.rating <= 3 ? Color(red: 1.0, green: 0.92, blue: 0.80) : BusinessPortalStyle.accentSoft)
                    .clipShape(Circle())
                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(review.author_name ?? "Người dùng")
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(BusinessPortalStyle.text)
                            Text(formatReviewDate(review.created_at))
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(BusinessPortalStyle.muted)
                        }
                        Spacer()
                        Text(stars(review.rating))
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.orange)
                    }
                    Text(review.comment ?? "—")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(BusinessPortalStyle.muted)
                        .lineLimit(3)
                }
            }
            if unreplied && review.rating <= 3 {
                Text("ⓘ Chưa phản hồi · Cần xử lý")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Color(red: 0.55, green: 0.08, blue: 0.08))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color(red: 1.0, green: 0.90, blue: 0.90))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            HStack(spacing: 10) {
                if unreplied {
                    Button(review.rating <= 3 ? "Phản hồi ngay" : "Phản hồi") {
                        Task {
                            _ = try? await ApiService.replyBusinessReview(id: review.id, reply: "Cảm ơn bạn đã đánh giá. Doanh nghiệp sẽ tiếp thu và cải thiện dịch vụ.")
                            await load()
                        }
                    }
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(BusinessPortalStyle.accent)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 9)
                    .background(BusinessPortalStyle.accentSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                } else {
                    Text("✓ Đã phản hồi")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(BusinessPortalStyle.accent)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(BusinessPortalStyle.accentSoft)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                if unreplied {
                    Text("Báo cáo")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(BusinessPortalStyle.muted)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 9)
                        .background(BusinessPortalStyle.card)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(BusinessPortalStyle.stroke))
                }
            }
        }
        .padding(18)
        .background(BusinessPortalStyle.bg)
        .clipShape(RoundedRectangle(cornerRadius: 13))
        .overlay(RoundedRectangle(cornerRadius: 13).stroke(review.rating <= 3 && unreplied ? Color.red.opacity(0.7) : BusinessPortalStyle.stroke))
    }

    private var reviewsSection: some View {
        VStack(spacing: 10) {
            HStack(spacing: 12) {
                metricCard("Rating TB", String(format: "%.1f", overview?.business?.rating_avg ?? 0), subtitle: "\(overview?.business?.rating_count ?? 0) đánh giá")
                metricCard("Chưa phản hồi", "\(reviews.filter { ($0.reply ?? "").isEmpty }.count)", subtitle: "cần xử lý")
            }
            if reviews.isEmpty {
                emptyState("Chưa có đánh giá.")
            } else {
                ForEach(reviews) { review in
                    PremiumSurfaceCard {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text(review.author_name ?? "Người dùng").font(.system(size: 15, weight: .semibold))
                                Spacer()
                                Text(String(repeating: "★", count: max(0, review.rating)))
                                    .foregroundStyle(.orange)
                            }
                            if let c = review.comment {
                                Text(c).font(.system(size: 13)).foregroundStyle(PremiumTheme.muted)
                            }
                            if let reply = review.reply, !reply.isEmpty {
                                Text("Đã phản hồi: \(reply)")
                                    .font(.system(size: 12)).foregroundStyle(PremiumTheme.statDestIcon)
                            } else {
                                Button("Phản hồi") {
                                    Task {
                                        _ = try? await ApiService.replyBusinessReview(id: review.id, reply: "Cảm ơn bạn đã đánh giá. Doanh nghiệp sẽ tiếp thu và cải thiện dịch vụ.")
                                        await load()
                                    }
                                }
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(PremiumTheme.statDestIcon)
                            }
                        }
                    }
                }
            }
        }
    }

    private func metricCard(_ title: String, _ value: String, subtitle: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(BusinessPortalStyle.muted)
            Text(value)
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(BusinessPortalStyle.text)
            if let subtitle {
                Text(subtitle)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(BusinessPortalStyle.accent)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(BusinessPortalStyle.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func lightMetricCard(_ title: String, _ value: String, subtitle: String? = nil) -> some View {
        PremiumSurfaceCard {
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.system(size: 12)).foregroundStyle(PremiumTheme.textMuted)
                Text(value).font(.system(size: 22, weight: .bold))
                if let subtitle {
                    Text(subtitle).font(.system(size: 11)).foregroundStyle(PremiumTheme.muted)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func load() async {
        loading = true
        error = nil
        do {
            async let o = ApiService.businessOverview()
            async let t = ApiService.businessTransactions()
            async let p = ApiService.businessAdPackages()
            async let c = ApiService.businessCampaigns()
            async let v = ApiService.businessVouchers()
            async let l = ApiService.businessLocations()
            async let r = ApiService.businessReviews()
            async let m = ApiService.businessMedia()
            async let pay = ApiService.businessPayouts()
            overview = try await o
            transactions = try await t.items
            packages = try await p.items
            campaigns = try await c.items
            vouchers = try await v.items
            locations = try await l.items
            reviews = try await r.items
            media = try await m.items
            payouts = try await pay.items
            notifications = (try? await ApiService.businessNotifications())?.items ?? []
        } catch {
            self.error = formatApiError(error, fallback: "Không tải được dữ liệu doanh nghiệp")
        }
        loading = false
    }

    /// Làm mới nhẹ (không hiện loading) — dùng cho real-time poll: media duyệt, booking, notifications.
    private func refreshLight() async {
        async let m = ApiService.businessMedia()
        async let n = ApiService.businessNotifications()
        async let o = ApiService.businessOverview()
        if let mm = try? await m { media = mm.items }
        if let nn = try? await n { notifications = nn.items }
        if let oo = try? await o { overview = oo }
    }

    private func purchase(_ id: String) async {
        purchaseLoading = true
        purchaseMessage = nil
        defer { purchaseLoading = false }
        do {
            let res = try await ApiService.purchaseAdPackage(id: id)
            if let url = res.checkout_url, !url.isEmpty {
                withAnimation(.easeInOut(duration: 0.3)) {
                    adPayResponse = res
                }
                purchaseMessage = "Thanh toán để kích hoạt gói."
            } else {
                purchaseMessage = "Đã kích hoạt gói quảng cáo."
                await load()
            }
        } catch {
            purchaseMessage = formatApiError(error, fallback: "Không mua được gói")
        }
    }

    private func emptyState(_ text: String) -> some View {
        PremiumSurfaceCard {
            Text(text)
                .font(.system(size: 13))
                .foregroundStyle(PremiumTheme.textMuted)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func statusChip(_ text: String) -> some View {
        Text(statusLabel(text))
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(BusinessPortalStyle.accent)
            .padding(.horizontal, 9)
            .padding(.vertical, 4)
            .background(BusinessPortalStyle.accentSoft)
            .clipShape(Capsule())
    }

    private func statusLabel(_ status: String) -> String {
        switch status {
        case "active": return "Đang chạy"
        case "ending": return "Sắp hết"
        case "pending": return "Chờ duyệt"
        case "suspended": return "Tạm dừng"
        case "ended", "expired": return "Kết thúc"
        case "live": return "Live"
        default: return status
        }
    }

    private func voucherUsage(_ voucher: BusinessVoucherRow) -> Double {
        guard let limit = voucher.usage_limit, limit > 0 else { return 0 }
        return min(1, Double(voucher.used_count ?? 0) / Double(limit))
    }

    private func voucherStatus(_ voucher: BusinessVoucherRow) -> String {
        if voucher.status == "ended" { return "ended" }
        if let limit = voucher.usage_limit, (voucher.used_count ?? 0) >= limit { return "expired" }
        return "active"
    }

    private func voucherDisplayStatus(_ voucher: BusinessVoucherRow) -> String {
        if voucher.status == "ended" || voucher.status == "expired" { return "ended" }
        if let limit = voucher.usage_limit, limit > 0 {
            let used = voucher.used_count ?? 0
            if used >= limit { return "ended" }
            if Double(used) / Double(limit) >= 0.8 { return "ending" }
        }
        if let validUntil = voucher.valid_until, isPastDate(validUntil) { return "ended" }
        return "active"
    }

    private func formatVoucherDate(_ raw: String?) -> String {
        guard let raw else { return "—" }
        if raw.contains("/") { return raw }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let date = formatter.date(from: String(raw.prefix(10))) {
            formatter.dateFormat = "dd/MM/yyyy"
            return formatter.string(from: date)
        }
        return String(raw.prefix(10))
    }

    private func formatBusinessJoinDate(_ raw: String?) -> String {
        guard let raw else { return "—" }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let date = formatter.date(from: String(raw.prefix(10))) {
            formatter.dateFormat = "MM/yyyy"
            return formatter.string(from: date)
        }
        return String(raw.prefix(7)).replacingOccurrences(of: "-", with: "/")
    }

    private func formatReviewDate(_ raw: String?) -> String {
        guard let raw else { return "—" }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let date = formatter.date(from: String(raw.prefix(10))) {
            formatter.dateFormat = "dd/MM/yyyy"
            return formatter.string(from: date)
        }
        return String(raw.prefix(10))
    }

    private func isPastDate(_ raw: String) -> Bool {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: String(raw.prefix(10))) else { return false }
        return date < Calendar.current.startOfDay(for: Date())
    }

    private func initials(for name: String?) -> String {
        let parts = (name ?? "Business")
            .split(separator: " ")
            .prefix(2)
            .compactMap { $0.first }
        let result = String(parts).uppercased()
        return result.isEmpty ? "BT" : result
    }

    private func stars(_ rating: Int) -> String {
        let filled = max(0, min(rating, 5))
        return String(repeating: "★", count: filled) + String(repeating: "☆", count: 5 - filled)
    }
}

private enum BusinessPortalStyle {
    private static var darkMode: Bool { UserDefaults.standard.bool(forKey: "dark_mode") }
    static var bg: Color { darkMode ? Color(red: 0.18, green: 0.19, blue: 0.17) : Color(red: 0.96, green: 0.95, blue: 0.93) }
    static var card: Color { darkMode ? Color(red: 0.13, green: 0.14, blue: 0.12) : Color.white }
    static var stroke: Color { darkMode ? Color.white.opacity(0.10) : Color.black.opacity(0.08) }
    static var text: Color { darkMode ? Color.white.opacity(0.94) : Color(red: 0.10, green: 0.09, blue: 0.08) }
    static var muted: Color { darkMode ? Color.white.opacity(0.58) : Color(red: 0.43, green: 0.42, blue: 0.38) }
    static let accent = Color(red: 0.05, green: 0.75, blue: 0.58)
    static var accentSoft: Color { darkMode ? Color(red: 0.82, green: 1.0, blue: 0.94) : Color(red: 0.86, green: 1.0, blue: 0.95) }
}

private struct BusinessCampaignForm: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var target = "Cặp đôi"
    @State private var region = "Miền Nam"
    @State private var season = ""
    @State private var budget = ""
    @State private var start = Date.portalDateString()
    @State private var end = Date.portalDateString(monthsFromNow: 1)
    @State private var error: String?
    let onSave: (BusinessCampaignCreate) async throws -> Void
    private let targets = ["Cặp đôi", "Gia đình", "Solo", "Nhóm bạn"]
    private let regions = ["Miền Nam", "Miền Bắc", "Miền Trung", "Toàn quốc"]

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button { dismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(BusinessPortalStyle.text)
                        .frame(width: 48, height: 48)
                        .background(BusinessPortalStyle.card)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(BusinessPortalStyle.stroke))
                }
                Spacer()
                Text("Tạo chiến dịch")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(BusinessPortalStyle.text)
                Spacer()
                Color.clear.frame(width: 48, height: 48)
            }
            .padding(.horizontal, 22)
            .padding(.top, 18)
            .padding(.bottom, 14)

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    darkField("Tên chiến dịch", text: $name, placeholder: "Nhập tên chiến dịch...")
                    darkChipGroup("Loại hình target", options: targets, selection: $target)
                    darkChipGroup("Vùng địa lý", options: regions, selection: $region)
                    darkField("Mùa / dịp", text: $season, placeholder: "Ví dụ: Cuối tuần, hè, lễ...")
                    darkField("Ngân sách (VNĐ)", text: $budget, placeholder: "Nhập ngân sách", keyboard: .numberPad)
                    VStack(alignment: .leading, spacing: 9) {
                        Text("Thời gian chạy")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(BusinessPortalStyle.muted)
                        HStack(spacing: 12) {
                            darkPlainTextField(text: $start, placeholder: "dd/mm/yyyy")
                            Text("—")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundStyle(BusinessPortalStyle.muted)
                            darkPlainTextField(text: $end, placeholder: "dd/mm/yyyy")
                        }
                    }
                    estimatedImpressions
                    if let error {
                        Text(error)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.red)
                    }
                    Button {
                        Task {
                            do {
                                let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
                                let budgetValue = Double(budget.digitsOnly) ?? 0
                                guard !trimmedName.isEmpty else {
                                    self.error = "Nhập tên chiến dịch."
                                    return
                                }
                                guard budgetValue > 0 else {
                                    self.error = "Nhập ngân sách hợp lệ."
                                    return
                                }
                                guard !start.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                                      !end.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                                    self.error = "Nhập thời gian chạy."
                                    return
                                }
                                try await onSave(
                                    BusinessCampaignCreate(
                                        name: trimmedName,
                                        target_type: target,
                                        region: region,
                                        season: season,
                                        budget_vnd: budgetValue,
                                        starts_at: start.toIsoDate,
                                        ends_at: end.toIsoDate
                                    )
                                )
                                dismiss()
                            } catch {
                                self.error = formatApiError(error, fallback: "Không tạo được chiến dịch")
                            }
                        }
                    } label: {
                        Text("Tạo chiến dịch")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 60)
                            .background(BusinessPortalStyle.accent.opacity(name.trimmingCharacters(in: .whitespaces).isEmpty ? 0.45 : 0.78))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 22)
                .padding(.top, 18)
                .padding(.bottom, 28)
            }
        }
        .background(BusinessPortalStyle.bg.ignoresSafeArea())
    }

    private var estimatedImpressions: some View {
        let budgetValue = Double(budget.digitsOnly) ?? 0
        let low = Int(max(0, budgetValue / 240))
        let high = max(low, Int(budgetValue / 145))
        return VStack(alignment: .leading, spacing: 5) {
            Text("Ước tính hiển thị")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(BusinessPortalStyle.muted)
            VStack(alignment: .leading, spacing: 5) {
                Text("\(low.formatted()) - \(high.formatted())")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(BusinessPortalStyle.accent)
                Text("lượt / tháng · dựa trên ngân sách & target")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(BusinessPortalStyle.muted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(18)
            .background(BusinessPortalStyle.card)
            .clipShape(RoundedRectangle(cornerRadius: 13))
        }
    }
}

private struct BusinessVoucherForm: View {
    @Environment(\.dismiss) private var dismiss
    @State private var code = ""
    @State private var title = ""
    @State private var discountType = "% phần trăm"
    @State private var value = ""
    @State private var maxDiscount = ""
    @State private var audience = "User mới"
    @State private var limit = ""
    @State private var start = Date.portalDateString()
    @State private var end = Date.portalDateString(monthsFromNow: 1)
    @State private var error: String?
    let onSave: (BusinessVoucherCreate) async throws -> Void
    private let discountTypes = ["% phần trăm", "Số tiền cố định", "Miễn phí"]
    private let audiences = ["User mới", "Tất cả user", "User premium"]

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button { dismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(BusinessPortalStyle.text)
                        .frame(width: 48, height: 48)
                        .background(BusinessPortalStyle.card)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(BusinessPortalStyle.stroke))
                }
                Spacer()
                Text("Tạo voucher")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(BusinessPortalStyle.text)
                Spacer()
                Color.clear.frame(width: 48, height: 48)
            }
            .padding(.horizontal, 22)
            .padding(.top, 18)
            .padding(.bottom, 14)

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    darkField("Mã voucher", text: $code, placeholder: "Nhập mã voucher")
                    darkChipGroup("Loại giảm giá", options: discountTypes, selection: $discountType)
                    VStack(alignment: .leading, spacing: 9) {
                        Text("Giá trị giảm")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(BusinessPortalStyle.muted)
                        HStack(spacing: 0) {
                            darkPlainTextField(text: $value, placeholder: "Nhập giá trị", keyboard: .numberPad)
                            if discountType == "% phần trăm" {
                                Text("%")
                                    .font(.system(size: 17, weight: .bold))
                                    .foregroundStyle(BusinessPortalStyle.text)
                                    .padding(.leading, 10)
                            }
                        }
                    }
                    darkField("Giảm tối đa", text: $maxDiscount, placeholder: "Tuỳ chọn", keyboard: .numberPad)
                    darkChipGroup("Điều kiện áp dụng", options: audiences, selection: $audience)
                    darkField("Số lượt tối đa", text: $limit, placeholder: "Tuỳ chọn", keyboard: .numberPad)
                    VStack(alignment: .leading, spacing: 9) {
                        Text("Thời hạn")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(BusinessPortalStyle.muted)
                        HStack(spacing: 12) {
                            darkPlainTextField(text: $start, placeholder: "dd/mm/yyyy")
                            Text("—")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundStyle(BusinessPortalStyle.muted)
                            darkPlainTextField(text: $end, placeholder: "dd/mm/yyyy")
                        }
                    }
                    if let error {
                        Text(error)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.red)
                    }
                    Button {
                        Task {
                            do {
                                let trimmedCode = code.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
                                let discountValue = Double(value.digitsOnly) ?? 0
                                guard !trimmedCode.isEmpty else {
                                    self.error = "Nhập mã voucher."
                                    return
                                }
                                guard discountType == "Miễn phí" || discountValue > 0 else {
                                    self.error = "Nhập giá trị giảm hợp lệ."
                                    return
                                }
                                guard !start.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                                      !end.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                                    self.error = "Nhập thời hạn voucher."
                                    return
                                }
                                let resolvedTitle = title.isEmpty ? voucherTitle : title
                                try await onSave(
                                    BusinessVoucherCreate(
                                        code: trimmedCode,
                                        title: resolvedTitle,
                                        description: nil,
                                        discount_type: apiDiscountType,
                                        discount_value: discountValue,
                                        max_discount_vnd: Double(maxDiscount.digitsOnly),
                                        audience: apiAudience,
                                        usage_limit: Int(limit.digitsOnly),
                                        valid_from: start.toIsoDate,
                                        valid_until: end.toIsoDate
                                    )
                                )
                                dismiss()
                            } catch {
                                self.error = formatApiError(error, fallback: "Không tạo được voucher")
                            }
                        }
                    } label: {
                        Text("Tạo voucher")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 60)
                            .background(BusinessPortalStyle.accent.opacity(code.trimmingCharacters(in: .whitespaces).isEmpty ? 0.45 : 0.78))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .disabled(code.trimmingCharacters(in: .whitespaces).isEmpty)
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 22)
                .padding(.top, 18)
                .padding(.bottom, 28)
            }
        }
        .background(BusinessPortalStyle.bg.ignoresSafeArea())
    }

    private var apiDiscountType: String {
        switch discountType {
        case "Số tiền cố định": return "fixed"
        case "Miễn phí": return "free_shipping"
        default: return "percent"
        }
    }

    private var apiAudience: String {
        switch audience {
        case "Tất cả user": return "all"
        case "User premium": return "premium"
        default: return "new_user"
        }
    }

    private var voucherTitle: String {
        switch discountType {
        case "Số tiền cố định": return "Giảm \(maxDiscount) đ"
        case "Miễn phí": return "Miễn phí dịch vụ"
        default: return "Giảm \(value)%"
        }
    }
}

private struct BusinessLocationForm: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var address = ""
    @State private var category = ""
    @State private var city = ""
    @State private var price = ""
    @State private var locationDescription = ""
    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var previewImages: [UIImage] = []
    @State private var uploading = false
    @State private var error: String?
    let onSave: (BusinessLocationCreate, [String]) async throws -> Void

    var body: some View {
        PortalFormShell(title: "Thêm địa điểm", error: error) {
            field("Tên địa điểm", text: $name)
            field("Địa chỉ", text: $address)
            field("Thành phố (vd: Đà Lạt)", text: $city)
            field("Loại hình", text: $category)
            field("Giá niêm yết (VND)", text: $price)
            field("Mô tả ngắn", text: $locationDescription)
            PhotosPicker(selection: $pickerItems, maxSelectionCount: 6, matching: .images) {
                Label("Chọn ảnh từ thiết bị (tối đa 6)", systemImage: "photo.on.rectangle")
            }
            if !previewImages.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(previewImages.enumerated()), id: \.offset) { _, image in
                            Image(uiImage: image)
                                .resizable()
                                .scaledToFill()
                                .frame(width: 72, height: 72)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }
                }
            }
            saveButton(uploading ? "Đang tải ảnh..." : "Thêm địa điểm") {
                uploading = true
                defer { uploading = false }
                var urls: [String] = []
                for (index, item) in pickerItems.prefix(6).enumerated() {
                    if let data = try? await item.loadTransferable(type: Data.self) {
                        let url = try await ApiService.uploadImage(data: data, filename: "location-\(index).jpg")
                        urls.append(url)
                    }
                }
                try await onSave(BusinessLocationCreate(
                    name: name,
                    address: address,
                    category: category,
                    city: city.isEmpty ? nil : city,
                    price_vnd: Double(price.filter(\.isNumber)),
                    description: locationDescription.isEmpty ? nil : locationDescription
                ), urls)
                dismiss()
            }
        }
        .onChange(of: pickerItems) { _, items in
            Task {
                var images: [UIImage] = []
                for item in items.prefix(6) {
                    if let data = try? await item.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        images.append(image)
                    }
                }
                previewImages = images
            }
        }
    }
}

private struct BusinessMediaForm: View {
    @Environment(\.dismiss) private var dismiss
    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var previewImages: [UIImage] = []
    @State private var type = "Ảnh"
    @State private var uploading = false
    @State private var error: String?
    let onSave: ([BusinessMediaCreate]) async throws -> Void

    var body: some View {
        PortalFormShell(title: "Thêm media", error: error) {
            PhotosPicker(selection: $pickerItems, maxSelectionCount: 6, matching: .images) {
                Label("Chọn ảnh từ thiết bị (tối đa 6)", systemImage: "photo.on.rectangle")
            }
            if !previewImages.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(previewImages.enumerated()), id: \.offset) { _, image in
                            Image(uiImage: image)
                                .resizable()
                                .scaledToFill()
                                .frame(width: 72, height: 72)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }
                }
            }
            darkChipGroup("Loại", options: ["Ảnh", "Video"], selection: $type)
            saveButton(uploading ? "Đang tải ảnh..." : "Gửi media") {
                guard !pickerItems.isEmpty else {
                    error = "Chọn ít nhất 1 ảnh."
                    return
                }
                uploading = true
                defer { uploading = false }
                var inputs: [BusinessMediaCreate] = []
                for (index, item) in pickerItems.prefix(6).enumerated() {
                    if let data = try? await item.loadTransferable(type: Data.self) {
                        let url = try await ApiService.uploadImage(data: data, filename: "media-\(index).jpg")
                        inputs.append(BusinessMediaCreate(
                            url: url,
                            type: type == "Video" ? "video" : "image",
                            location_id: nil,
                            thumbnail_url: nil
                        ))
                    }
                }
                guard !inputs.isEmpty else {
                    error = "Không tải được ảnh."
                    return
                }
                try await onSave(inputs)
                dismiss()
            }
        }
        .onChange(of: pickerItems) { _, items in
            Task {
                var images: [UIImage] = []
                for item in items.prefix(6) {
                    if let data = try? await item.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        images.append(image)
                    }
                }
                previewImages = images
            }
        }
    }
}

private struct AdPackagePaymentSheet: View {
    let response: AdPurchaseResponse
    let onDone: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var activated = false
    @State private var pollTask: Task<Void, Never>?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if activated {
                        VStack(spacing: 12) {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 48))
                                .foregroundStyle(PremiumTheme.statDestIcon)
                            Text("Gói đã kích hoạt thành công!")
                                .font(.system(size: 18, weight: .bold))
                        }
                        .padding(.top, 20)
                    } else {
                        Text("Thanh toán gói quảng cáo")
                            .font(.system(size: 18, weight: .bold))

                        if let qr = response.qr_code, let img = qrImage(from: qr) {
                            Image(uiImage: img)
                                .interpolation(.none)
                                .resizable()
                                .frame(width: 200, height: 200)
                                .background(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            if let acc = response.account_number { infoRow("Số tài khoản", acc) }
                            if let name = response.account_name { infoRow("Chủ tài khoản", name) }
                            infoRow("Số tiền", FormatUtils.formatVnd(response.amount))
                            if let content = response.transfer_content { infoRow("Nội dung CK", content) }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(14)
                        .background(PremiumTheme.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(PremiumTheme.border))

                        Text("Quét QR hoặc chuyển khoản. Gói sẽ kích hoạt khi thanh toán thành công.")
                            .font(.system(size: 13))
                            .foregroundStyle(PremiumTheme.muted)
                            .multilineTextAlignment(.center)

                        HStack(spacing: 8) {
                            ProgressView().tint(PremiumTheme.accent).scaleEffect(0.8)
                            Text("Đang chờ xác nhận thanh toán…")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(PremiumTheme.accent)
                        }
                        .frame(maxWidth: .infinity).frame(height: 44)
                        .background(PremiumTheme.accentLight)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                .padding(PremiumTheme.screenPadding)
            }
            .background(Color.white)
            .navigationTitle("Thanh toán")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Xong") { dismiss(); onDone() }
                }
            }
            .task { startPolling() }
            .onDisappear { pollTask?.cancel() }
        }
    }

    private func startPolling() {
        guard let orderId = response.order?.id else { return }
        pollTask?.cancel()
        pollTask = Task {
            while !Task.isCancelled && !activated {
                try? await Task.sleep(nanoseconds: 4_000_000_000)
                if Task.isCancelled { break }
                if let order = try? await ApiService.businessAdOrderStatus(id: orderId),
                   order.status == "active" {
                    await MainActor.run {
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) { activated = true }
                    }
                    break
                }
            }
        }
    }

    private func infoRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.system(size: 13)).foregroundStyle(PremiumTheme.textMuted)
            Spacer()
            Text(value).font(.system(size: 14, weight: .semibold)).foregroundStyle(PremiumTheme.ink).textSelection(.enabled)
        }
    }

    private func qrImage(from string: String) -> UIImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 10, y: 10)),
              let cg = context.createCGImage(output, from: output.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}

private struct PortalFormShell<Content: View>: View {
    let title: String
    let error: String?
    @ViewBuilder let content: Content

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) { content }
                    .padding(PremiumTheme.screenPadding)
            }
            .background(PremiumTheme.bg)
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

private func darkChipGroup(_ title: String, options: [String], selection: Binding<String>) -> some View {
    VStack(alignment: .leading, spacing: 9) {
        Text(title)
            .font(.system(size: 14, weight: .bold))
            .foregroundStyle(BusinessPortalStyle.muted)
        FlowLayout(spacing: 8) {
            ForEach(options, id: \.self) { option in
                Button {
                    selection.wrappedValue = option
                } label: {
                    Text(option)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(selection.wrappedValue == option ? BusinessPortalStyle.accent : BusinessPortalStyle.text.opacity(0.72))
                        .padding(.horizontal, 13)
                        .padding(.vertical, 8)
                        .background(selection.wrappedValue == option ? BusinessPortalStyle.accentSoft : BusinessPortalStyle.bg)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(selection.wrappedValue == option ? BusinessPortalStyle.accentSoft : BusinessPortalStyle.stroke)
                        )
                }
                .buttonStyle(.plain)
            }
        }
    }
}

private func darkField(_ label: String, text: Binding<String>, placeholder: String, keyboard: UIKeyboardType = .default) -> some View {
    VStack(alignment: .leading, spacing: 9) {
        Text(label)
            .font(.system(size: 14, weight: .bold))
            .foregroundStyle(BusinessPortalStyle.muted)
        darkPlainTextField(text: text, placeholder: placeholder, keyboard: keyboard)
    }
}

private func darkPlainTextField(text: Binding<String>, placeholder: String, keyboard: UIKeyboardType = .default) -> some View {
    TextField(placeholder, text: text)
        .keyboardType(keyboard)
        .textInputAutocapitalization(.never)
        .foregroundStyle(BusinessPortalStyle.text)
        .font(.system(size: 16, weight: .semibold))
        .padding(.horizontal, 16)
        .frame(height: 52)
        .background(BusinessPortalStyle.card)
        .clipShape(RoundedRectangle(cornerRadius: 11))
        .overlay(RoundedRectangle(cornerRadius: 11).stroke(BusinessPortalStyle.stroke))
}

private func field(_ label: String, text: Binding<String>, keyboard: UIKeyboardType = .default) -> some View {
    VStack(alignment: .leading, spacing: 6) {
        Text(label).font(.system(size: 12, weight: .semibold)).foregroundStyle(PremiumTheme.textMuted)
        TextField(label, text: text)
            .keyboardType(keyboard)
            .textInputAutocapitalization(.never)
            .padding(12)
            .background(PremiumTheme.inputBg)
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

private extension String {
    var digitsOnly: String {
        filter(\.isNumber)
    }

    var toIsoDate: String {
        let parts = split(separator: "/")
        guard parts.count == 3 else { return self }
        return "\(parts[2])-\(parts[1])-\(parts[0])"
    }
}

private extension Date {
    static func portalDateString(monthsFromNow: Int = 0) -> String {
        let base = Calendar.current.date(byAdding: .month, value: monthsFromNow, to: Date()) ?? Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "dd/MM/yyyy"
        return formatter.string(from: base)
    }
}

private func saveButton(_ title: String, action: @escaping () async throws -> Void) -> some View {
    Button {
        Task { try? await action() }
    } label: {
        Text(title)
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .background(PremiumTheme.statDestIcon)
            .clipShape(RoundedRectangle(cornerRadius: 14))
    }
    .buttonStyle(.plain)
}
