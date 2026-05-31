import SwiftUI

struct DashboardHeroCard: View {
    let greeting: String
    let tripCount: Int
    let onCreateTrip: () -> Void

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .bottomLeading) {
                Image("dashboard_bg")
                    .resizable()
                    .scaledToFill()
                    .frame(width: geo.size.width, height: geo.size.height)
                    .clipped()

                LinearGradient(
                    colors: [Color.black.opacity(0.1), Color.black.opacity(0.65)],
                    startPoint: .top,
                    endPoint: .bottom
                )

                VStack(alignment: .leading, spacing: 8) {
                    Text("BẢNG ĐIỀU KHIỂN")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.75))
                    Text("Chào, \(greeting)!")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .minimumScaleFactor(0.85)
                    Text(tripCount > 0 ? "Bạn đang quản lý \(tripCount) hành trình." : "Bắt đầu hành trình đầu tiên của bạn.")
                        .font(.system(size: 14))
                        .foregroundStyle(.white.opacity(0.85))
                        .lineLimit(2)
                    Button(action: onCreateTrip) {
                        Text("Tạo chuyến AI")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 18)
                            .padding(.vertical, 12)
                            .background(PremiumTheme.accent)
                            .clipShape(RoundedRectangle(cornerRadius: PremiumTheme.buttonRadius))
                    }
                    .padding(.top, 4)
                }
                .padding(16)
            }
        }
        .frame(height: 200)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .shadow(color: .black.opacity(0.12), radius: 12, y: 4)
    }
}

struct CompactTripCard: View {
    let trip: TripRecord
    let index: Int
    let onTap: () -> Void

    private var phase: TripPhase { TripUtils.getTripPhase(start: trip.start_date, end: trip.end_date) }

    var body: some View {
        Button(action: onTap) {
            ZStack(alignment: .bottomLeading) {
                cover
                LinearGradient(colors: [Color.black.opacity(0.15), Color.black.opacity(0.75)], startPoint: .top, endPoint: .bottom)
                VStack(alignment: .leading, spacing: 4) {
                    phaseBadge
                    Spacer()
                    Text(trip.destination)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                    Text(FormatUtils.formatDateRange(start: trip.start_date, end: trip.end_date))
                        .font(.system(size: 11.5))
                        .foregroundStyle(.white.opacity(0.8))
                        .lineLimit(1)
                        .minimumScaleFactor(0.78)
                }
                .padding(12)
            }
            .frame(width: 160, height: 200)
            .clipShape(RoundedRectangle(cornerRadius: PremiumTheme.cardRadius))
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var cover: some View {
        if let url = TripUtils.tripCoverImageUrl(trip) {
            RemoteImage(url: url, fallback: trip.destination)
                .frame(width: 160, height: 200)
                .clipped()
        } else {
            LinearGradient(
                colors: TripUtils.tripGradients[index % TripUtils.tripGradients.count],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .frame(width: 160, height: 200)
        }
    }

    private var phaseBadge: some View {
        Text(phaseLabel)
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(phaseColor)
            .clipShape(Capsule())
    }

    private var phaseLabel: String {
        switch phase {
        case .upcoming: return "SẮP TỚI"
        case .ongoing: return "ĐANG ĐI"
        case .completed: return "ĐÃ QUA"
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

struct TallTripListCard: View {
    let trip: TripRecord
    let index: Int
    var showFavoriteHeart = false
    let onTap: () -> Void

    private var phase: TripPhase { TripUtils.getTripPhase(start: trip.start_date, end: trip.end_date) }

    var body: some View {
        Button(action: onTap) {
            GeometryReader { geo in
                ZStack(alignment: .bottomLeading) {
                    cover(width: geo.size.width, height: geo.size.height)
                    LinearGradient(colors: [Color.black.opacity(0.08), Color.black.opacity(0.78)], startPoint: .top, endPoint: .bottom)
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            phaseBadge
                            Spacer()
                            if showFavoriteHeart {
                                Image(systemName: "heart.fill").foregroundStyle(PremiumTheme.accent)
                            }
                        }
                        Spacer()
                        Text(trip.destination)
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(.white)
                            .lineLimit(2)
                        Text(FormatUtils.formatDateRange(start: trip.start_date, end: trip.end_date))
                            .font(.system(size: 13))
                            .foregroundStyle(.white.opacity(0.82))
                            .lineLimit(1)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                chip("\(max(TripUtils.tripActivityCount(trip), trip.travelers ?? 1)) điểm")
                                chip(TripUtils.tripBudgetChip(trip))
                                chip(TripUtils.tripWeatherChip(trip))
                            }
                        }
                    }
                    .padding(16)
                }
            }
            .frame(height: 220)
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .shadow(color: .black.opacity(0.1), radius: 10, y: 4)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func cover(width: CGFloat, height: CGFloat) -> some View {
        if let url = TripUtils.tripCoverImageUrl(trip) {
            RemoteImage(url: url, fallback: trip.destination)
                .frame(width: width, height: height)
                .clipped()
        } else {
            LinearGradient(
                colors: TripUtils.tripGradients[index % TripUtils.tripGradients.count],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .frame(width: width, height: height)
        }
    }

    private var phaseBadge: some View {
        Text(TripUtils.tripPhaseLabel(phase).uppercased())
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(phase == .upcoming ? PremiumTheme.badgeUpcoming : phase == .ongoing ? PremiumTheme.badgeActive : PremiumTheme.badgePast)
            .clipShape(Capsule())
    }

    private func chip(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11, weight: .medium))
            .foregroundStyle(.white)
            .lineLimit(1)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color.white.opacity(0.16))
            .clipShape(Capsule())
    }
}

struct TripGallerySection: View {
    let trips: [TripRecord]
    let onOpenTrip: (String) -> Void
    let onCreateTrip: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text("Chuyến đi gần đây")
                    .font(.system(size: 18, weight: .semibold))
                    .lineLimit(1)
                Spacer(minLength: 8)
                if !trips.isEmpty {
                    Button("Xem tất cả", action: onCreateTrip)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(PremiumTheme.accent)
                        .lineLimit(1)
                }
            }

            if !trips.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: 12) {
                        ForEach(Array(trips.enumerated()), id: \.element.id) { index, trip in
                            CompactTripCard(trip: trip, index: index) { onOpenTrip(trip.id) }
                        }
                    }
                }
                .frame(height: 200)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct FavoriteChip: View {
    let label: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 13, weight: selected ? .semibold : .medium))
                .foregroundStyle(selected ? PremiumTheme.accent : PremiumTheme.ink)
                .lineLimit(1)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(selected ? PremiumTheme.accentLight : PremiumTheme.inputBg)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(selected ? PremiumTheme.accent : PremiumTheme.border))
        }
    }
}
