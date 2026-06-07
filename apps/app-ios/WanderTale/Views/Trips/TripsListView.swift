import SwiftUI

struct TripsListView: View {
    @Environment(AppState.self) private var appState
    @Binding var path: NavigationPath
    @State private var segment = 0

    private var filtered: [TripRecord] {
        appState.trips.filter { trip in
            let phase = TripUtils.getTripPhase(start: trip.start_date, end: trip.end_date)
            return segment == 0 ? phase != .completed : phase == .completed
        }
    }

    var body: some View {
        AppScreenScroll {
            VStack(alignment: .leading, spacing: 20) {
                Picker("", selection: $segment) {
                    Text("Sắp tới").tag(0)
                    Text("Đã qua").tag(1)
                }
                .pickerStyle(.segmented)

                if filtered.isEmpty {
                    PremiumSurfaceCard {
                        Text(segment == 0 ? "Chưa có chuyến sắp tới." : "Chưa có chuyến đã qua.")
                            .foregroundStyle(PremiumTheme.textMuted)
                            .frame(maxWidth: .infinity)
                    }
                } else {
                    ForEach(Array(filtered.enumerated()), id: \.element.id) { index, trip in
                        TallTripListCard(trip: trip, index: index) {
                            path.append(Route.tripDetail(trip.id))
                        }
                    }
                }

                PromotionsSection()
            }
        }
        .safeAreaInset(edge: .top, spacing: 0) {
            FixedTripsHeader(title: "Chuyến đi", description: "Quản lý hành trình sắp tới và đã qua.")
        }
        .refreshable { await appState.preload() }
        .appTabRoot()
    }
}

struct FavoritesView: View {
    @Environment(AppState.self) private var appState
    @Binding var path: NavigationPath
    @State private var selectedId: String?

    private var favorites: [TripRecord] {
        appState.trips.filter { appState.favoriteTripIds.contains($0.id) }
    }

    var body: some View {
        ZStack {
            if favorites.isEmpty {
                ZStack {
                    DotPatternBackground()
                    VStack(spacing: 12) {
                        Image(systemName: "heart")
                            .font(.system(size: 36))
                            .foregroundStyle(PremiumTheme.accent)
                        Text("Chưa có chuyến yêu thích")
                            .font(.system(size: 18, weight: .semibold))
                        Text("Nhấn tim trên thẻ chuyến đi để lưu.")
                            .font(.system(size: 14))
                            .foregroundStyle(PremiumTheme.textMuted)
                            .multilineTextAlignment(.center)
                    }
                    .padding(PremiumTheme.screenPadding)
                }
            } else {
                AppScreenScroll {
                    VStack(alignment: .leading, spacing: 20) {
                        ScrollView(.horizontal, showsIndicators: false) {
                            LazyHStack(spacing: 8) {
                                ForEach(favorites) { trip in
                                    FavoriteChip(
                                        label: trip.destination,
                                        selected: (selectedId ?? favorites.first?.id) == trip.id
                                    ) {
                                        selectedId = trip.id
                                    }
                                }
                            }
                        }
                        .frame(height: 40)
                        let visible = favorites.filter { $0.id == (selectedId ?? favorites.first?.id) }
                        ForEach(Array(visible.enumerated()), id: \.element.id) { index, trip in
                            TallTripListCard(trip: trip, index: index, showFavoriteHeart: true) {
                                path.append(Route.tripDetail(trip.id))
                            }
                        }
                    }
                }
            }
        }
        .safeAreaInset(edge: .top, spacing: 0) {
            FixedTripsHeader(title: "Yêu thích", description: "Chuyến đi bạn đã đánh dấu yêu thích trên thiết bị này.")
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(PremiumTheme.bg)
        .appTabRoot()
        .onAppear {
            if selectedId == nil { selectedId = favorites.first?.id }
        }
    }
}

private struct FixedTripsHeader: View {
    let title: String
    let description: String

    var body: some View {
        PageHeader(title: title, description: description)
            .padding(.horizontal, PremiumTheme.screenPadding)
            .padding(.top, 12)
            .padding(.bottom, 12)
            .background(PremiumTheme.bg)
    }
}
