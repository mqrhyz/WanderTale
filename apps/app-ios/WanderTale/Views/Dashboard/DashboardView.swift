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
                    MetricCard(label: "Chuyến đi", value: "\(appState.stats?.total_trips ?? 0)", icon: "calendar", iconBg: PremiumTheme.statTripBg, iconTint: PremiumTheme.statTripIcon)
                    MetricCard(label: "Điểm đến", value: "\(appState.stats?.unique_destinations ?? 0)", icon: "map", iconBg: PremiumTheme.statDestBg, iconTint: PremiumTheme.statDestIcon)
                    MetricCard(label: "Ngân sách", value: FormatUtils.formatCompactVnd(appState.stats?.total_budget_planned), icon: "creditcard", iconBg: PremiumTheme.statBudgetBg, iconTint: PremiumTheme.statBudgetIcon)
                    MetricCard(label: "Hoạt động", value: "\(appState.stats?.places_in_itineraries ?? 0)", icon: "figure.walk", iconBg: PremiumTheme.statActivityBg, iconTint: PremiumTheme.statActivityIcon)
                }

                TripGallerySection(
                    trips: Array(appState.trips.prefix(6)),
                    onOpenTrip: { path.append(Route.tripDetail($0)) },
                    onCreateTrip: onCreateTrip
                )
            }
        }
        .refreshable { await appState.preload() }
        .appTabRoot()
    }
}
