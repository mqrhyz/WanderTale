import SwiftUI

struct ProfileView: View {
    @Environment(AppState.self) private var appState
    @Binding var path: NavigationPath

    @State private var phone = ""
    @State private var saved = false
    @State private var saveError: String?
    @State private var showUpgrade = false
    @State private var isProMember = false
    @State private var showSignOutConfirm = false

    private var isPremium: Bool {
        // Server là source of truth; isProMember chỉ dùng khi accountInfo chưa load
        if appState.accountInfo?.profile?.is_premium == true { return true }
        if appState.accountInfo?.profile?.subscription_tier?.lowercased() == "pro" { return true }
        return isProMember
    }

    // Sync isProMember từ server sau khi load
    private func syncProStatus(from overview: UserSubscriptionOverview) {
        isProMember = overview.is_premium
    }

    var body: some View {
        VStack(spacing: 10) {
            profileHeader

            profileCard {
                VStack(spacing: 10) {
                    profileReadOnlyField(
                        label: "Tên hiển thị",
                        value: appState.accountInfo?.displayName ?? appState.displayName
                    )
                    profileReadOnlyField(
                        label: "Email",
                        value: appState.accountInfo?.email ?? ""
                    )
                    profilePhoneField
                    profileSaveButton
                    if saved {
                        Text("Đã lưu.")
                            .font(.system(size: 12))
                            .foregroundStyle(PremiumTheme.statDestIcon)
                            .task {
                                try? await Task.sleep(nanoseconds: 3_000_000_000)
                                saved = false
                            }
                    }
                    if let saveError {
                        Text(saveError)
                            .font(.system(size: 12))
                            .foregroundStyle(PremiumTheme.logoutRed)
                    }
                }
            }

            profileCard {
                VStack(spacing: 0) {
                    settingsRow("Cài đặt", icon: "gearshape.fill") { path.append(Route.settings) }
                    divider
                    settingsRow("Ưu đãi", icon: "tag.fill") { path.append(Route.savedOffers) }
                    divider
                    settingsRow("Thông báo", icon: "bell.fill") {
                        // TODO: Mở màn hình thông báo khi ra mắt
                    }
                    divider
                    settingsRow("Trợ giúp & FAQ", icon: "questionmark.circle.fill") {
                        if let url = URL(string: "https://wandertale.app/faq") {
                            UIApplication.shared.open(url)
                        }
                    }
                    divider
                    settingsRow("Điều khoản sử dụng", icon: "doc.text.fill") {
                        if let url = URL(string: "https://wandertale.app/terms") {
                            UIApplication.shared.open(url)
                        }
                    }
                    if appState.accountInfo?.profile?.is_business == true {
                        divider
                        settingsRow("Doanh nghiệp", icon: "building.2.fill") { path.append(Route.business) }
                    }
                    if appState.accountInfo?.profile?.is_admin == true {
                        divider
                        settingsRow("Admin", icon: "star.fill") { path.append(Route.admin) }
                    }
                }
            }

            Button("Đăng xuất") {
                showSignOutConfirm = true
            }
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(PremiumTheme.logoutRed)
            .padding(.top, 2)
            .alert("Đăng xuất?", isPresented: $showSignOutConfirm) {
                Button("Hủy", role: .cancel) { }
                Button("Đăng xuất", role: .destructive) {
                    Task { await appState.signOut() }
                }
            } message: {
                Text("Bạn sẽ cần đăng nhập lại để tiếp tục.")
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, PremiumTheme.screenPadding)
        .padding(.top, 6)
        .padding(.bottom, 4)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(PremiumTheme.bg)
        .appTabRoot()
        .onAppear {
            phone = appState.accountInfo?.phone ?? ""
            Task { await refreshProStatus() }
        }
    }

    private func refreshProStatus() async {
        await appState.loadAccountInfo()
        if let overview = try? await ApiService.userSubscription() {
            syncProStatus(from: overview)
        }
    }

    private var profileHeader: some View {
        HStack(alignment: .center, spacing: 12) {
            Circle()
                .fill(PremiumTheme.accentLight)
                .frame(width: 52, height: 52)
                .overlay(
                    Text(initial)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(PremiumTheme.accent)
                )

            HStack(spacing: 8) {
                Text(appState.accountInfo?.displayName ?? appState.displayName)
                    .font(.system(size: 17, weight: .bold))
                    .lineLimit(1)

                if isPremium {
                    ProMemberBadge()
                }
            }

            Spacer(minLength: 0)

            if !isPremium {
                Button { showUpgrade = true } label: {
                    Image("UpgradeIcon")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 128, height: 58)
                }
                .buttonStyle(.plain)
            }
        }
        .sheet(isPresented: $showUpgrade) {
            UserUpgradeSheet {
                await refreshProStatus()
            }
        }
    }

    private var profilePhoneField: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Số điện thoại")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(PremiumTheme.textMuted)
            TextField("", text: $phone)
                .keyboardType(.phonePad)
                .font(.system(size: 14))
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(PremiumTheme.inputBg)
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private var profileSaveButton: some View {
        Button {
            Task {
                saveError = nil
                saved = false
                do {
                    try await appState.updatePhone(phone)
                    saved = true
                } catch {
                    saveError = "Không thể lưu số điện thoại."
                }
            }
        } label: {
            Text("Lưu thay đổi")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 40)
                .background(PremiumTheme.accent)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private var initial: String {
        let name = appState.accountInfo?.displayName ?? appState.displayName
        return String(name.prefix(1)).uppercased()
    }

    private func profileCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        content()
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(PremiumTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: PremiumTheme.cardRadius))
            .overlay(RoundedRectangle(cornerRadius: PremiumTheme.cardRadius).stroke(PremiumTheme.border))
            .shadow(color: .black.opacity(0.05), radius: 6, y: 2)
    }

    private func profileReadOnlyField(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(PremiumTheme.textMuted)
            Text(value)
                .font(.system(size: 14))
                .foregroundStyle(PremiumTheme.ink)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(PremiumTheme.inputBg)
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private func settingsRow(_ title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundStyle(PremiumTheme.accent)
                    .frame(width: 18)
                Text(title)
                    .font(.system(size: 14))
                    .foregroundStyle(PremiumTheme.ink)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(PremiumTheme.textMuted)
            }
            .padding(.vertical, 8)
        }
        .buttonStyle(.plain)
    }

    private var divider: some View {
        Rectangle().fill(PremiumTheme.divider).frame(height: 1)
    }
}

struct UserUpgradeSheet: View {
    let onPurchased: () async -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var overview: UserSubscriptionOverview?
    @State private var selectedPackageId = "pro_monthly"
    @State private var selectedVoucherId = ""
    @State private var loading = true
    @State private var paying = false
    @State private var message: String?
    @State private var paymentResult: UserSubscriptionPurchaseResponse?
    @State private var showPayment = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if loading {
                        ProgressView().frame(maxWidth: .infinity).padding(.top, 30)
                    } else if let overview {
                        planHeader(overview)
                        packagePicker(overview)
                        voucherPicker(overview)
                        priceSummary(overview)
                        benefits(overview)
                        Text("Gói Pro mặc định tự động gia hạn. Bạn có thể tắt trong Cài đặt bất cứ lúc nào.")
                            .font(.system(size: 13))
                            .foregroundStyle(PremiumTheme.textMuted)
                        Button {
                            Task { await purchase() }
                        } label: {
                            Text(purchaseButtonTitle(overview))
                                .font(.system(size: 15, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 48)
                                .background(PremiumTheme.accent)
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .disabled(paying || overview.is_premium)
                    }
                    if let message {
                        Text(message)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(PremiumTheme.accent)
                    }
                }
                .padding(20)
            }
            .background(PremiumTheme.bg.ignoresSafeArea())
            .navigationTitle("WanderTale Pro")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Đóng") { dismiss() } } }
            .task { await load() }
            .sheet(isPresented: $showPayment) {
                if let paymentResult {
                    SubscriptionPaymentSheet(response: paymentResult) {
                        Task {
                            await onPurchased()
                            await load()
                        }
                    }
                }
            }
            .onChange(of: selectedPackageId) { _, _ in
                selectedVoucherId = ""
            }
        }
    }

    private func planHeader(_ overview: UserSubscriptionOverview) -> some View {
        PremiumSurfaceCard {
            VStack(alignment: .leading, spacing: 8) {
                Text(overview.is_premium ? "Bạn đang dùng Pro" : "Bạn đang dùng Free")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(PremiumTheme.ink)
                Text(overview.is_premium
                     ? "Tạo chuyến đi AI không giới hạn."
                     : "Free còn \(max(0, (overview.monthly_trip_limit ?? 5) - overview.monthly_trip_count))/\(overview.monthly_trip_limit ?? 5) chuyến trong tháng này.")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(PremiumTheme.muted)
                if overview.is_premium {
                    Text(overview.auto_renew
                         ? "Gói sẽ tự động gia hạn. Bạn có thể tắt trong Cài đặt."
                         : "Gia hạn tự động đã tắt. Gói hết hạn sẽ không gia hạn thêm.")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(PremiumTheme.textMuted)
                }
                if let expires = overview.subscription_expires_at {
                    Text("Hết hạn: \(expires.prefix(10))")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(PremiumTheme.accent)
                }
            }
        }
    }

    private func packagePicker(_ overview: UserSubscriptionOverview) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Chọn gói").font(.system(size: 15, weight: .bold))
            ForEach(overview.packages) { pkg in
                Button { selectedPackageId = pkg.id } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(pkg.name).font(.system(size: 15, weight: .bold))
                            Text("\(FormatUtils.formatVnd(pkg.price_vnd)) · \(pkg.billing_cycle == "yearly" ? "theo năm" : "theo tháng")")
                                .font(.system(size: 13)).foregroundStyle(PremiumTheme.muted)
                        }
                        Spacer()
                        Image(systemName: selectedPackageId == pkg.id ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(PremiumTheme.accent)
                    }
                    .padding(14)
                    .background(PremiumTheme.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(selectedPackageId == pkg.id ? PremiumTheme.accent : PremiumTheme.border))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func voucherPicker(_ overview: UserSubscriptionOverview) -> some View {
        let vouchers = applicableVouchers(overview)
        return VStack(alignment: .leading, spacing: 10) {
            Text("Voucher đã lưu").font(.system(size: 15, weight: .bold))
            Text("Lưu voucher Pro ở mục Khám phá ưu đãi trên Trang chủ trước khi áp dụng khi nâng cấp.")
                .font(.system(size: 12))
                .foregroundStyle(PremiumTheme.textMuted)
            if vouchers.isEmpty {
                Text("Chưa có voucher Pro/subscription phù hợp gói đã chọn.")
                    .font(.system(size: 13))
                    .foregroundStyle(PremiumTheme.muted)
            } else {
                Picker("Voucher", selection: $selectedVoucherId) {
                    Text("Không áp dụng").tag("")
                    ForEach(vouchers) { voucher in
                        Text("\(voucher.code) · \(upgradeDiscountText(voucher))").tag(voucher.id)
                    }
                }
                .pickerStyle(.menu)
            }
        }
    }

    private func priceSummary(_ overview: UserSubscriptionOverview) -> some View {
        guard let pkg = overview.packages.first(where: { $0.id == selectedPackageId }) ?? overview.packages.first else {
            return AnyView(EmptyView())
        }
        let original = pkg.price_vnd
        let voucher = applicableVouchers(overview).first(where: { $0.id == selectedVoucherId })
        let discount = upgradeDiscountAmount(voucher, original: original)
        let finalAmount = max(0, original - discount)
        let giftDays = voucher?.gift_days ?? 0
        let durationDays = giftDays > 0 ? giftDays : (pkg.duration_days ?? 30)
        return AnyView(
            VStack(alignment: .leading, spacing: 6) {
                Text("Tạm tính").font(.system(size: 15, weight: .bold))
                HStack {
                    Text("Giá gói")
                    Spacer()
                    Text(FormatUtils.formatVnd(original))
                }
                .font(.system(size: 13))
                if discount > 0 {
                    HStack {
                        Text(giftDays > 0 ? "Voucher (\(upgradeDiscountText(voucher!)))" : "Voucher")
                        Spacer()
                        Text("-\(FormatUtils.formatVnd(discount))")
                            .foregroundStyle(PremiumTheme.accent)
                    }
                    .font(.system(size: 13))
                }
                HStack {
                    Text("Thời hạn Pro")
                    Spacer()
                    Text(
                        durationDays >= 30 && durationDays % 30 == 0
                            ? "\(durationDays / 30) tháng"
                            : "\(durationDays) ngày"
                    )
                }
                .font(.system(size: 13))
                if let from = voucher?.valid_from, let until = voucher?.valid_until, !from.isEmpty, !until.isEmpty {
                    Text("Áp dụng từ \(from) đến \(until)")
                        .font(.system(size: 12))
                        .foregroundStyle(PremiumTheme.textMuted)
                } else if let until = voucher?.valid_until, !until.isEmpty {
                    Text("Hết hạn \(until)")
                        .font(.system(size: 12))
                        .foregroundStyle(PremiumTheme.textMuted)
                }
                HStack {
                    Text("Thanh toán")
                        .font(.system(size: 14, weight: .bold))
                    Spacer()
                    Text(finalAmount <= 0 ? "Miễn phí" : FormatUtils.formatVnd(finalAmount))
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(PremiumTheme.accent)
                }
            }
            .padding(14)
            .background(PremiumTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(PremiumTheme.border))
        )
    }

    private func purchaseButtonTitle(_ overview: UserSubscriptionOverview) -> String {
        if paying { return "Đang xử lý..." }
        if overview.is_premium { return "Đang dùng Pro" }
        guard let pkg = overview.packages.first(where: { $0.id == selectedPackageId }) else {
            return "Thanh toán / nâng cấp"
        }
        let voucher = applicableVouchers(overview).first(where: { $0.id == selectedVoucherId })
        let finalAmount = max(0, pkg.price_vnd - upgradeDiscountAmount(voucher, original: pkg.price_vnd))
        return finalAmount <= 0 ? "Nâng cấp miễn phí" : "Thanh toán / nâng cấp"
    }

    private func applicableVouchers(_ overview: UserSubscriptionOverview) -> [Promotion] {
        guard let cycle = overview.packages.first(where: { $0.id == selectedPackageId })?.billing_cycle else {
            return overview.vouchers
        }
        return overview.vouchers.filter { voucherAppliesToPackage($0, billingCycle: cycle) }
    }

    private func benefits(_ overview: UserSubscriptionOverview) -> some View {
        let selected = overview.packages.first(where: { $0.id == selectedPackageId }) ?? overview.packages.first
        return VStack(alignment: .leading, spacing: 10) {
            Text("Quyền lợi").font(.system(size: 15, weight: .bold))
            ForEach(selected?.benefits ?? [], id: \.self) { item in
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.seal.fill").foregroundStyle(PremiumTheme.accent)
                    Text(item).font(.system(size: 14)).foregroundStyle(PremiumTheme.ink)
                }
            }
        }
        .padding(14)
        .background(PremiumTheme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(PremiumTheme.border))
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            overview = try await ApiService.userSubscription()
            selectedPackageId = overview?.packages.first?.id ?? "pro_monthly"
        } catch {
            message = formatApiError(error, fallback: "Không tải được gói Pro")
        }
    }

    private func purchase() async {
        paying = true; message = nil
        defer { paying = false }
        do {
            let result = try await ApiService.purchaseUserSubscription(
                packageId: selectedPackageId,
                voucherId: selectedVoucherId.isEmpty ? nil : selectedVoucherId
            )
            if result.payment_status == "paid" || result.subscription != nil {
                message = "Đã nâng cấp Pro."
                await onPurchased()
                await load()
            } else if result.qr_code != nil || result.account_number != nil {
                paymentResult = result
                showPayment = true
            } else {
                message = "Không tạo được thông tin thanh toán. Thử lại sau."
            }
        } catch {
            let text = formatApiError(error, fallback: "Không tạo được thanh toán")
            message = text.contains("voucher_not_applicable")
                ? "Voucher không áp dụng cho gói này. Hãy chọn voucher đã lưu phù hợp."
                : text
        }
    }
}

private func upgradeDiscountText(_ promo: Promotion) -> String {
    if let days = promo.gift_days, days > 0 {
        let months = days / 30
        if months >= 1 && days % 30 == 0 { return "Tặng \(months) tháng Pro" }
        return "Tặng \(days) ngày Pro"
    }
    if let pct = promo.discount_percent, pct > 0 { return "Giảm \(Int(pct))%" }
    if let amt = promo.discount_amount, amt > 0 { return "Giảm \(FormatUtils.formatVnd(amt))" }
    return "Ưu đãi"
}

private func upgradeDiscountAmount(_ promo: Promotion?, original: Double) -> Double {
    guard let promo else { return 0 }
    // Gift-duration vouchers make checkout free.
    if let days = promo.gift_days, days > 0 { return original }
    let byPercent = (promo.discount_percent ?? 0) > 0
        ? original * (promo.discount_percent ?? 0) / 100
        : 0
    let byAmount = promo.discount_amount ?? 0
    return min(original, max(byPercent, byAmount)).rounded()
}

private func voucherAppliesToPackage(_ voucher: Promotion, billingCycle: String?) -> Bool {
    if let days = voucher.gift_days, days > 0 { return true }
    switch voucher.applicability ?? "hotel_places" {
    case "user_subscription":
        return true
    case "pro_plan":
        let cycle = voucher.billing_cycle ?? "both"
        return cycle == "both" || cycle == billingCycle
    default:
        return false
    }
}

struct ProMemberBadge: View {
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "crown.fill")
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(Color(red: 1.0, green: 0.82, blue: 0.22))
            Text("PRO")
                .font(.system(size: 11, weight: .heavy))
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(
            LinearGradient(
                colors: [Color(red: 0.49, green: 0.32, blue: 0.92), Color(red: 0.58, green: 0.38, blue: 0.98)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(Capsule())
        .overlay(Capsule().stroke(Color.white.opacity(0.28), lineWidth: 0.8))
    }
}

struct SettingsView: View {
    @State private var overview: UserSubscriptionOverview?
    @State private var autoRenew = true
    @State private var loading = true
    @State private var saving = false
    @State private var message: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                PremiumSurfaceCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Gói WanderTale Pro")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(PremiumTheme.ink)
                        if loading {
                            ProgressView().tint(PremiumTheme.accent)
                        } else if overview?.is_premium == true {
                            Text("Bạn đang dùng Pro.")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(PremiumTheme.muted)
                            overview?.subscription_expires_at.map {
                                Text("Hết hạn: \(String($0.prefix(10)))")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(PremiumTheme.accent)
                            }
                            Toggle("Tự động gia hạn", isOn: Binding(
                                get: { autoRenew },
                                set: { newValue in Task { await updateAutoRenew(newValue) } }
                            ))
                            .disabled(saving)
                            Text("Khi bật, gói sẽ tự gia hạn khi hết hạn. Tắt nếu bạn không muốn gia hạn thêm.")
                                .font(.system(size: 13))
                                .foregroundStyle(PremiumTheme.textMuted)
                        } else {
                            Text("Bạn đang dùng gói Free. Nâng cấp Pro tại tab Hồ sơ.")
                                .font(.system(size: 14))
                                .foregroundStyle(PremiumTheme.muted)
                        }
                        message.map {
                            Text($0)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(PremiumTheme.accent)
                        }
                    }
                    .padding(.vertical, 8)
                }

                PremiumSurfaceCard {
                    Text("Thông báo chuyến đi — sắp ra mắt")
                        .font(.system(size: 14))
                        .foregroundStyle(PremiumTheme.textMuted)
                        .padding(.vertical, 8)
                }
            }
            .padding(PremiumTheme.screenPadding)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(PremiumTheme.bg)
        .navigationTitle("Cài đặt")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        guard let data = try? await ApiService.userSubscription() else { return }
        overview = data
        autoRenew = data.auto_renew
    }

    private func updateAutoRenew(_ enabled: Bool) async {
        saving = true
        message = nil
        let previous = autoRenew
        autoRenew = enabled
        do {
            let response = try await ApiService.updateUserSubscriptionAutoRenew(enabled)
            autoRenew = response.auto_renew
            overview?.auto_renew = response.auto_renew
            message = enabled ? "Đã bật tự động gia hạn." : "Đã tắt tự động gia hạn."
        } catch {
            autoRenew = previous
            message = formatApiError(error, fallback: "Không cập nhật được gia hạn")
        }
        saving = false
    }
}

struct AdminView: View {
    @State private var partners: [PartnerRow] = []
    @State private var vouchers: [VoucherRow] = []
    @State private var isAdmin: Bool?
    @State private var loading = true

    var body: some View {
        ScrollView {
            if loading {
                ProgressView().padding(.top, 40)
            } else if isAdmin != true {
                Text("Không có quyền admin.").padding()
            } else {
                VStack(alignment: .leading, spacing: PremiumTheme.sectionGap) {
                    Text("Đối tác").font(.system(size: 17, weight: .semibold))
                    ForEach(partners) { p in
                        PremiumSurfaceCard {
                            VStack(alignment: .leading) {
                                Text(p.name).font(.system(size: 15, weight: .semibold))
                                if let w = p.website { Text(w).font(.system(size: 13)).foregroundStyle(PremiumTheme.muted) }
                            }
                        }
                    }
                    Text("Voucher").font(.system(size: 17, weight: .semibold))
                    ForEach(vouchers) { v in
                        PremiumSurfaceCard {
                            VStack(alignment: .leading) {
                                Text(v.code).font(.system(size: 15, weight: .semibold))
                                Text("\(v.title) · \(v.valid_from) → \(v.valid_until)")
                                    .font(.system(size: 13))
                                    .foregroundStyle(PremiumTheme.muted)
                            }
                        }
                    }
                }
                .padding(PremiumTheme.screenPadding)
            }
        }
        .background(PremiumTheme.bg)
        .navigationTitle("Admin")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func load() async {
        loading = true
        do {
            let profile = try await SupabaseClient.fetchProfile(userId: jwtUserId() ?? "")
            isAdmin = profile?.is_admin == true
            if isAdmin == true {
                partners = try await SupabaseClient.listPartners()
                vouchers = try await SupabaseClient.listVouchersAdmin()
            }
        } catch {
            isAdmin = false
        }
        loading = false
    }

    private func jwtUserId() -> String? {
        guard let token = SupabaseClient.accessToken else { return nil }
        let parts = token.split(separator: ".")
        guard parts.count >= 2 else { return nil }
        // JWT segments are Base64URL ("-" "_") — convert to standard Base64 before decoding.
        var b64 = String(parts[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        while b64.count % 4 != 0 { b64.append("=") }
        guard let data = Data(base64Encoded: b64),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return json["sub"] as? String
    }
}
