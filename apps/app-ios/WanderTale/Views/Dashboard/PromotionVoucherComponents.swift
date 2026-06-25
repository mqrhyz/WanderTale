import SwiftUI

private let voucherCardRadius: CGFloat = 16

enum VoucherCardMetrics {
    /// ~78% màn hình, để lộ mép voucher kế tiếp trong carousel.
    static var carouselWidth: CGFloat {
        let screen = UIScreen.main.bounds.width
        let inset = PremiumTheme.screenPadding * 2
        let peek: CGFloat = 52
        return max(268, screen - inset - peek)
    }
}

struct PromotionVoucherCard: View {
    let promo: Promotion
    var carousel: Bool = false
    let onSave: () async -> Void

    private var fullTitle: String { voucherDisplayTitle(promo) }
    private var isSaved: Bool { promo.is_saved == true }
    private var compact: Bool { carousel }

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: voucherCardRadius, style: .continuous)
        let hPad: CGFloat = compact ? 12 : 14
        let iconSize: CGFloat = compact ? 34 : 40
        let ticketIconSize: CGFloat = compact ? 24 : 28

        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: compact ? 10 : 12) {
                Image(systemName: "ticket.fill")
                    .font(.system(size: ticketIconSize, weight: .semibold))
                    .foregroundStyle(PremiumTheme.accent)
                    .frame(width: iconSize, height: iconSize)

                VStack(alignment: .leading, spacing: 4) {
                    VoucherTitleLine(title: fullTitle, promo: promo, compact: compact)

                    Text(voucherSubtitlePrimary(promo))
                        .font(.system(size: 12))
                        .foregroundStyle(PremiumTheme.muted)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .frame(minHeight: 34, alignment: .top)
                }
                .frame(minWidth: 0, maxWidth: .infinity, alignment: .leading)
            }
            .padding(.horizontal, hPad)
            .padding(.top, compact ? 12 : 14)
            .padding(.bottom, compact ? 10 : 12)

            VoucherDottedDivider()
                .padding(.horizontal, hPad)

            HStack(spacing: compact ? 8 : 10) {
                HStack(spacing: 6) {
                    Image(systemName: "doc.on.doc")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(PremiumTheme.muted)
                    Text(promo.code)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(PremiumTheme.muted)
                        .lineLimit(1)
                }
                .padding(.horizontal, compact ? 10 : 12)
                .padding(.vertical, compact ? 8 : 10)
                .background(PremiumTheme.inputBg)
                .clipShape(RoundedRectangle(cornerRadius: 10))

                Spacer(minLength: 0)

                Button {
                    guard !isSaved else { return }
                    Task { await onSave() }
                } label: {
                    Text(isSaved ? "Đã lưu" : "Lưu")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(isSaved ? PremiumTheme.muted : PremiumTheme.accent)
                        .padding(.horizontal, compact ? 14 : 18)
                        .padding(.vertical, compact ? 8 : 10)
                        .background(isSaved ? PremiumTheme.inputBg : PremiumTheme.accentLight)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .disabled(isSaved)
            }
            .padding(.horizontal, hPad)
            .padding(.top, compact ? 10 : 12)
            .padding(.bottom, compact ? 12 : 14)
        }
        .frame(width: carousel ? VoucherCardMetrics.carouselWidth : nil, alignment: .leading)
        .frame(maxWidth: carousel ? nil : .infinity, alignment: .leading)
        .background(PremiumTheme.surface, in: shape)
        .clipShape(shape)
        .overlay(shape.stroke(Color.black.opacity(0.06), lineWidth: 1))
        .compositingGroup()
        .shadow(color: .black.opacity(0.05), radius: 8, y: 3)
    }
}

private struct VoucherTitleLine: View {
    let title: String
    let promo: Promotion
    var compact: Bool = false

    @State private var showDetails = false

    var body: some View {
        HStack(alignment: .center, spacing: 4) {
            Text(title)
                .font(.system(size: compact ? 15 : 16, weight: .bold))
                .foregroundStyle(PremiumTheme.ink)
                .lineLimit(1)
                .truncationMode(.tail)
                .frame(minWidth: 0, maxWidth: .infinity, alignment: .leading)

            Button { showDetails = true } label: {
                Image(systemName: "info.circle")
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(PremiumTheme.textMuted)
            }
            .buttonStyle(.plain)
        }
        .alert("Chi tiết ưu đãi", isPresented: $showDetails) {
            Button("Đóng", role: .cancel) {}
        } message: {
            Text(voucherInfoPopupText(promo))
        }
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
                PremiumTheme.accent.opacity(0.28),
                style: StrokeStyle(lineWidth: 1, dash: [5, 5])
            )
        }
        .frame(height: 1)
    }
}

func voucherDisplayTitle(_ promo: Promotion) -> String {
    if let pct = promo.discount_percent, pct > 0 {
        return "Giảm \(Int(pct))% · \(promo.title)"
    }
    if let amt = promo.discount_amount, amt > 0 {
        return "Giảm đến \(FormatUtils.formatVnd(amt)) · \(promo.title)"
    }
    return promo.title
}

func voucherValidityText(_ promo: Promotion) -> String? {
    let from = promo.valid_from?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let until = promo.valid_until?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    if !from.isEmpty, !until.isEmpty {
        return "Áp dụng từ \(from) đến \(until)"
    }
    if !until.isEmpty {
        return "Hết hạn \(until)"
    }
    if !from.isEmpty {
        return "Áp dụng từ \(from)"
    }
    return nil
}

func voucherInfoPopupText(_ promo: Promotion) -> String {
    var lines = [voucherDisplayTitle(promo)]
    if let validity = voucherValidityText(promo) {
        lines.append(validity)
    }
    return lines.joined(separator: "\n\n")
}

func voucherSubtitlePrimary(_ promo: Promotion) -> String {
    if let desc = promo.description?.trimmingCharacters(in: .whitespacesAndNewlines), !desc.isEmpty {
        return desc
    }
    return promotionApplicabilityText(promo)
}

func voucherIconName(_ promo: Promotion) -> String {
    "ticket.fill"
}

func voucherHeadline(_ promo: Promotion) -> String {
    voucherDisplayTitle(promo)
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
