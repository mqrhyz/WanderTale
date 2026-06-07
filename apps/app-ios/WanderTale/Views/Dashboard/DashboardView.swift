import SwiftUI

struct DashboardView: View {
    @Environment(AppState.self) private var appState
    @Binding var path: NavigationPath
    var onCreateTrip: () -> Void

    var body: some View {
        AppScreenScroll {
            VStack(alignment: .leading, spacing: PremiumTheme.sectionGap) {
                DashboardHeroCard(
                    greeting: appState.displayName,
                    tripCount: appState.stats?.total_trips ?? appState.trips.count,
                    onCreateTrip: onCreateTrip
                )

                if let err = appState.dashboardError {
                    Text(err)
                        .font(.system(size: 13))
                        .foregroundStyle(.red)
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(PremiumTheme.accentLight)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                    MetricCard(label: "Chuyến đi", value: "\(appState.stats?.total_trips ?? 0)", backgroundImage: "MetricH1")
                    MetricCard(label: "Điểm đến", value: "\(appState.stats?.unique_destinations ?? 0)", backgroundImage: "MetricH2")
                    MetricCard(label: "Ngân sách", value: FormatUtils.formatCompactVnd(appState.stats?.total_budget_planned), backgroundImage: "MetricH3")
                    MetricCard(label: "Hoạt động", value: "\(appState.stats?.places_in_itineraries ?? 0)", backgroundImage: "MetricH4")
                }

                TripGallerySection(
                    trips: Array(appState.trips.prefix(6)),
                    onOpenTrip: { path.append(Route.tripDetail($0)) },
                    onCreateTrip: onCreateTrip
                )

                PromotionsSection()
            }
        }
        .refreshable { await appState.preload() }
        .appTabRoot()
    }
}
