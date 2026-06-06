import SwiftUI

struct ProfileView: View {
    @Environment(AppState.self) private var appState
    @Binding var path: NavigationPath

    @State private var phone = ""
    @State private var saved = false
    @State private var saveError: String?

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
                    settingsRow("Đặt chỗ & thanh toán", icon: "cart.fill") { path.append(Route.booking) }
                    divider
                    settingsRow("Thông báo", icon: "bell.fill") { }
                    divider
                    settingsRow("Trợ giúp & FAQ", icon: "questionmark.circle.fill") { }
                    divider
                    settingsRow("Điều khoản sử dụng", icon: "doc.text.fill") { }
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
                appState.signOut()
            }
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(PremiumTheme.logoutRed)
            .padding(.top, 2)

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

            Text(appState.accountInfo?.displayName ?? appState.displayName)
                .font(.system(size: 17, weight: .bold))
                .lineLimit(1)

            Spacer(minLength: 0)
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

struct SettingsView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        PremiumSurfaceCard {
            Toggle("Giao diện tối", isOn: Binding(
                get: { appState.darkMode },
                set: { appState.setDarkMode($0) }
            ))
            .padding(.vertical, 8)
            Text("Thông báo chuyến đi — sắp ra mắt")
                .font(.system(size: 14))
                .foregroundStyle(PremiumTheme.textMuted)
                .padding(.top, 8)
        }
        .padding(PremiumTheme.screenPadding)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(PremiumTheme.bg)
        .navigationTitle("Cài đặt")
        .navigationBarTitleDisplayMode(.inline)
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
