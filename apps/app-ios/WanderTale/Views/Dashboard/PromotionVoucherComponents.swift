import SwiftUI

struct VoucherTicketShape: Shape {
    var cornerRadius: CGFloat = 14
    var notchRadius: CGFloat = 9

    func path(in rect: CGRect) -> Path {
        var path = Path()
        let r = cornerRadius
        let nr = notchRadius
        let midY = rect.midY

        path.move(to: CGPoint(x: rect.minX + r, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX - r, y: rect.minY))
        path.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.minY + r), control: CGPoint(x: rect.maxX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: midY - nr))
        path.addArc(
            center: CGPoint(x: rect.maxX, y: midY),
            radius: nr,
            startAngle: .degrees(-90),
            endAngle: .degrees(90),
            clockwise: true
        )
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - r))
        path.addQuadCurve(to: CGPoint(x: rect.maxX - r, y: rect.maxY), control: CGPoint(x: rect.maxX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX + r, y: rect.maxY))
        path.addQuadCurve(to: CGPoint(x: rect.minX, y: rect.maxY - r), control: CGPoint(x: rect.minX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + r))
        path.addQuadCurve(to: CGPoint(x: rect.minX + r, y: rect.minY), control: CGPoint(x: rect.minX, y: rect.minY))
        path.closeSubpath()
        return path
    }
}

struct PromotionVoucherCard: View {
    let promo: Promotion
    var carousel: Bool = false
    let onSave: () async -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            ZStack {
                Circle()
                    .fill(PremiumTheme.accent)
                    .frame(width: 46, height: 46)
                Image(systemName: voucherIconName(promo))
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(.white)
            }
            .padding(.top, 2)

            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .top, spacing: 6) {
                    Text(voucherHeadline(promo))
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(PremiumTheme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                    Button {
                        Task { await onSave() }
                    } label: {
                        Image(systemName: promo.is_saved == true ? "bookmark.fill" : "bookmark")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(PremiumTheme.textMuted)
                    }
                    .buttonStyle(.plain)
                }

                Text(voucherDetailText(promo))
                    .font(.system(size: 12))
                    .foregroundStyle(PremiumTheme.muted)
                    .fixedSize(horizontal: false, vertical: true)

                VoucherDottedDivider()
                    .padding(.top, 2)

                HStack(spacing: 8) {
                    Text(promo.code)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(PremiumTheme.accent)
                    Text("·")
                        .foregroundStyle(PremiumTheme.textMuted)
                    Text(promotionApplicabilityText(promo))
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(PremiumTheme.textMuted)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                    Text(promotionDiscountText(promo))
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(PremiumTheme.accent)
                }
            }
        }
        .padding(14)
        .frame(width: carousel ? 300 : nil, alignment: .leading)
        .frame(maxWidth: carousel ? nil : .infinity, alignment: .leading)
        .background(PremiumTheme.surface)
        .clipShape(VoucherTicketShape())
        .overlay(VoucherTicketShape().stroke(Color.black.opacity(0.06), lineWidth: 1))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 3)
    }
}

struct VoucherDottedDivider: View {
    var body: some View {
        GeometryReader { geo in
            Path { path in
                path.move(to: CGPoint(x: 0, y: 0))
                path.addLine(to: CGPoint(x: geo.size.width, y: 0))
            }
            .stroke(
                PremiumTheme.accent.opacity(0.35),
                style: StrokeStyle(lineWidth: 1, dash: [4, 4])
            )
        }
        .frame(height: 1)
    }
}

func voucherIconName(_ promo: Promotion) -> String {
    switch promo.applicability ?? "hotel_places" {
    case "user_subscription", "pro_plan":
        return "crown.fill"
    default:
        return "building.2.fill"
    }
}

func voucherHeadline(_ promo: Promotion) -> String {
    if let pct = promo.discount_percent, pct > 0 {
        return "Giảm \(Int(pct))% · \(promo.title)"
    }
    if let amt = promo.discount_amount, amt > 0 {
        return "Giảm đến \(FormatUtils.formatVnd(amt)) · \(promo.title)"
    }
    return promo.title
}

func voucherDetailText(_ promo: Promotion) -> String {
    if let desc = promo.description, !desc.isEmpty { return desc }
    return "Mã \(promo.code) · \(promotionApplicabilityText(promo))"
}

func promotionDiscountText(_ promo: Promotion) -> String {
    if let pct = promo.discount_percent, pct > 0 { return "Giảm \(Int(pct))%" }
    if let amt = promo.discount_amount, amt > 0 { return "Giảm \(FormatUtils.formatVnd(amt))" }
    return "Ưu đãi"
}

func promotionApplicabilityText(_ promo: Promotion) -> String {
    switch promo.applicability ?? "hotel_places" {
    case "user_subscription":
        return "Dùng cho subscription"
    case "pro_plan":
        switch promo.billing_cycle ?? "both" {
        case "monthly": return "Pro theo tháng"
        case "yearly": return "Pro theo năm"
        default: return "Pro tháng/năm"
        }
    default:
        return "Khách sạn/địa điểm"
    }
}

func promotionIsExpired(_ promo: Promotion) -> Bool {
    guard let until = promo.valid_until, !until.isEmpty else { return false }
    let today = String(Date().ISO8601Format().prefix(10))
    return until < today
}
