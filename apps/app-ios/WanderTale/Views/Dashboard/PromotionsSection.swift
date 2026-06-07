import SwiftUI

struct PromotionsSection: View {
    @State private var promotions: [Promotion] = []

    var body: some View {
        Group {
            if !promotions.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Khám phá ưu đãi dành riêng cho bạn")
                        .font(.system(size: 18, weight: .semibold))

                    ScrollView(.horizontal, showsIndicators: false) {
                        LazyHStack(spacing: 12) {
                            ForEach(promotions) { promo in
                                PromotionCard(promo: promo)
                            }
                        }
                    }
                    .frame(height: 130)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .task {
            promotions = (try? await ApiService.promotions())?.items ?? []
        }
    }
}

private struct PromotionCard: View {
    let promo: Promotion

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: "tag.fill")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(PremiumTheme.accent)
                Text(promo.code)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(PremiumTheme.accent)
            }
            Text(promo.title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(PremiumTheme.ink)
                .lineLimit(2)
            if let desc = promo.description, !desc.isEmpty {
                Text(desc)
                    .font(.system(size: 12))
                    .foregroundStyle(PremiumTheme.muted)
                    .lineLimit(2)
            }
            Spacer(minLength: 0)
            HStack {
                if let pct = promo.discount_percent, pct > 0 {
                    Text("Giảm \(Int(pct))%")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(PremiumTheme.accent).clipShape(Capsule())
                } else if let amt = promo.discount_amount, amt > 0 {
                    Text("Giảm \(FormatUtils.formatVnd(amt))")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(PremiumTheme.accent).clipShape(Capsule())
                }
                Spacer()
                if let partner = promo.partner_name, !partner.isEmpty {
                    Text(partner)
                        .font(.system(size: 11))
                        .foregroundStyle(PremiumTheme.textMuted)
                }
            }
        }
        .padding(14)
        .frame(width: 220, height: 130, alignment: .topLeading)
        .background(PremiumTheme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(PremiumTheme.border))
    }
}
