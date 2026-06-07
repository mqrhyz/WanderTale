import SwiftUI

struct PremiumSurfaceCard<Content: View>: View {
    var content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(PremiumTheme.cardPadding)
            .background(PremiumTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: PremiumTheme.cardRadius))
            .overlay(RoundedRectangle(cornerRadius: PremiumTheme.cardRadius).stroke(PremiumTheme.border))
            .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
    }
}

struct PremiumAccentButton: View {
    let title: String
    var loading = false
    var enabled = true
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                if loading {
                    ProgressView().tint(.white)
                } else {
                    Text(title)
                        .font(.system(size: 15, weight: .semibold))
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .foregroundStyle(.white)
            .background(enabled ? PremiumTheme.accent : Color.gray)
            .clipShape(RoundedRectangle(cornerRadius: PremiumTheme.buttonRadius))
        }
        .disabled(!enabled || loading)
    }
}

struct PremiumTextField: View {
    let label: String
    @Binding var text: String
    var placeholder = ""
    var secure = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(PremiumTheme.textMuted)
            Group {
                if secure {
                    SecureField(placeholder, text: $text)
                } else {
                    TextField(placeholder, text: $text)
                }
            }
            .padding(14)
            .background(PremiumTheme.inputBg)
            .clipShape(RoundedRectangle(cornerRadius: PremiumTheme.inputRadius))
        }
    }
}

struct PageHeader: View {
    var kicker: String?
    let title: String
    var description: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let kicker {
                Text(kicker.uppercased())
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(PremiumTheme.textMuted)
                    .tracking(0.8)
            }
            Text(title)
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(PremiumTheme.ink)
            if let description {
                Text(description)
                    .font(.system(size: 14))
                    .foregroundStyle(PremiumTheme.textMuted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct MetricCard: View {
    let label: String
    let value: String
    var icon: String = ""
    var iconBg: Color = .clear
    var iconTint: Color = .clear
    var backgroundImage: String?
    var subtitle: String?
    var labelColor: Color?

    var body: some View {
        if let bgImage = backgroundImage {
            imageCard(bgImage)
        } else {
            iconCard
        }
    }

    private func imageCard(_ bgImage: String) -> some View {
        ZStack {
            Image(bgImage)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(maxWidth: .infinity, maxHeight: .infinity)

            HStack {
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(label)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(labelColor ?? PremiumTheme.ink)
                    Text(value)
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(PremiumTheme.ink)
                    if let sub = subtitle {
                        Text(sub)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(PremiumTheme.textMuted)
                    }
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(PremiumTheme.textMuted)
                        .frame(width: 22, height: 22)
                        .background(Color.white.opacity(0.8))
                        .clipShape(Circle())
                }
                .padding(.trailing, 14)
                .padding(.vertical, 10)
            }
        }
        .frame(height: 100)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var iconCard: some View {
        PremiumSurfaceCard {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(iconTint)
                    .frame(width: 40, height: 40)
                    .background(iconBg)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(.system(size: 12))
                        .foregroundStyle(PremiumTheme.textMuted)
                    Text(value)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(PremiumTheme.ink)
                }
                Spacer()
            }
        }
    }
}

struct TripCardView: View {
    let trip: TripRecord
    var isFavorite = false
    var onFavorite: (() -> Void)?

    private var phase: TripPhase {
        TripUtils.getTripPhase(start: trip.start_date, end: trip.end_date)
    }

    var body: some View {
        PremiumSurfaceCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text(TripUtils.tripPhaseLabel(phase))
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(phaseColor)
                        .clipShape(Capsule())
                    Spacer()
                    if let onFavorite {
                        Button(action: onFavorite) {
                            Image(systemName: isFavorite ? "heart.fill" : "heart")
                                .foregroundStyle(isFavorite ? PremiumTheme.accent : PremiumTheme.textMuted)
                        }
                    }
                }
                Text(trip.destination)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(PremiumTheme.ink)
                Text(FormatUtils.formatDateRange(start: trip.start_date, end: trip.end_date))
                    .font(.system(size: 13))
                    .foregroundStyle(PremiumTheme.muted)
                HStack {
                    Text(FormatUtils.formatCompactVnd(trip.budget))
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(PremiumTheme.accent)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .foregroundStyle(PremiumTheme.textMuted)
                }
            }
        }
    }

    private var phaseColor: Color {
        switch phase {
        case .upcoming: return PremiumTheme.badgeUpcoming
        case .ongoing: return PremiumTheme.badgeActive
        case .completed: return PremiumTheme.badgePast
        }
    }
}
