import SwiftUI

struct BusinessNotificationsSheet: View {
    let notifications: [BusinessNotification]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if notifications.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "bell.slash")
                            .font(.system(size: 40))
                            .foregroundStyle(PremiumTheme.muted)
                        Text("Chưa có thông báo")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(PremiumTheme.muted)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(spacing: 10) {
                            ForEach(notifications) { n in
                                row(n)
                            }
                        }
                        .padding(PremiumTheme.screenPadding)
                    }
                }
            }
            .background(PremiumTheme.bg)
            .navigationTitle("Thông báo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Đóng") { dismiss() } }
            }
        }
    }

    private func row(_ n: BusinessNotification) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon(n))
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(tint(n))
                .frame(width: 38, height: 38)
                .background(tint(n).opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 4) {
                Text(n.title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(PremiumTheme.ink)
                Text(n.message)
                    .font(.system(size: 13))
                    .foregroundStyle(PremiumTheme.muted)
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PremiumTheme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(PremiumTheme.border))
    }

    private func icon(_ n: BusinessNotification) -> String {
        if n.type == "media" { return n.status == "approved" ? "checkmark.seal.fill" : "xmark.seal.fill" }
        return "calendar.badge.plus"
    }

    private func tint(_ n: BusinessNotification) -> Color {
        if n.type == "media" { return n.status == "approved" ? PremiumTheme.statDestIcon : PremiumTheme.logoutRed }
        return PremiumTheme.accent
    }
}
