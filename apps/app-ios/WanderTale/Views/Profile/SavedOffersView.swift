import SwiftUI

struct SavedOffersView: View {
    @State private var vouchers: [Promotion] = []
    @State private var loading = true
    @State private var message: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if loading {
                    ProgressView()
                        .tint(PremiumTheme.accent)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 40)
                } else if vouchers.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "tag.fill")
                            .font(.system(size: 36))
                            .foregroundStyle(PremiumTheme.accent.opacity(0.7))
                        Text("Chưa lưu voucher nào")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundStyle(PremiumTheme.ink)
                        Text("Khám phá ưu đãi trên Trang chủ và nhấn lưu để dùng khi đặt chỗ hoặc nâng cấp Pro.")
                            .font(.system(size: 14))
                            .foregroundStyle(PremiumTheme.muted)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 48)
                    .padding(.horizontal, 12)
                } else {
                    ForEach(vouchers) { promo in
                        VStack(alignment: .leading, spacing: 8) {
                            if promotionIsExpired(promo) {
                                Text("Đã hết hạn")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundStyle(PremiumTheme.logoutRed)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(PremiumTheme.logoutRed.opacity(0.08))
                                    .clipShape(Capsule())
                            }
                            PromotionVoucherCard(promo: promo) {
                                await toggleSave(promo)
                            }
                        }
                    }
                }

                if let message {
                    Text(message)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(PremiumTheme.accent)
                }
            }
            .padding(PremiumTheme.screenPadding)
        }
        .background(PremiumTheme.bg.ignoresSafeArea())
        .navigationTitle("Ưu đãi")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            vouchers = try await ApiService.savedPromotionVouchers()
        } catch {
            message = formatApiError(error, fallback: "Không tải được ưu đãi đã lưu")
        }
    }

    private func toggleSave(_ promo: Promotion) async {
        message = nil
        if promo.is_saved == true {
            try? await ApiService.unsavePromotionVoucher(id: promo.id)
        } else {
            try? await ApiService.savePromotionVoucher(id: promo.id)
        }
        await load()
    }
}
