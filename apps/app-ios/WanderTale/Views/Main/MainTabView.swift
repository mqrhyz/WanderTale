import SwiftUI

struct MainTabView: View {
    @Environment(AppState.self) private var appState
    @State private var selectedTab: MainTab = .dashboard
    @State private var tabBeforeCreate: MainTab = .dashboard
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            tabContent
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(PremiumTheme.bg)
                .transaction { $0.disablesAnimations = true }
                .safeAreaInset(edge: .bottom, spacing: 0) {
                    if showNav {
                        WanderTaleBottomNav(selectedTab: $selectedTab) {
                            tabBeforeCreate = selectedTab == .create ? tabBeforeCreate : selectedTab
                            selectedTab = .create
                        }
                        .padding(.horizontal, PremiumTheme.screenPadding)
                        .padding(.bottom, PremiumTheme.bottomNavBottomInset)
                        .offset(y: PremiumTheme.bottomNavDrop)
                        .ignoresSafeArea(.container, edges: .bottom)
                    }
                }
                .navigationDestination(for: Route.self) { route in
                    switch route {
                    case .tripDetail(let id):
                        TripDetailView(tripId: id)
                    case .settings:
                        SettingsView()
                    case .savedOffers:
                        SavedOffersView()
                    case .admin:
                        AdminPortalView()
                    case .business:
                        BusinessPortalView()
                    case .booking:
                        MyBookingsView()
                    }
                }
        }
    }

    @ViewBuilder
    private var tabContent: some View {
        if appState.accountInfo == nil {
            ZStack {
                PremiumTheme.bg.ignoresSafeArea()
                VStack(spacing: 14) {
                    if let roleError = appState.roleError {
                        Text(roleError)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(PremiumTheme.muted)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 28)
                        Button("Đăng xuất") {
                            appState.signOut()
                        }
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 22)
                        .padding(.vertical, 12)
                        .background(Capsule().fill(PremiumTheme.accent))
                    } else {
                        ProgressView()
                            .tint(PremiumTheme.accent)
                    }
                }
            }
        } else if effectiveTab == .create {
            TripPlannerView(onCreated: { id in
                path.append(Route.tripDetail(id))
                selectedTab = tabBeforeCreate
            }, onBack: {
                selectedTab = tabBeforeCreate
            })
            .id("create")
        } else if homeRole == .business {
            BusinessPortalView()
        } else if homeRole == .admin {
            AdminPortalView()
        } else {
            ZStack {
                DashboardView(path: $path, onCreateTrip: openCreateTrip)
                    .visibleTab(effectiveTab == .dashboard)

                TripsListView(path: $path)
                    .visibleTab(effectiveTab == .trips)

                MyBookingsView()
                    .visibleTab(effectiveTab == .favorites)

                ProfileView(path: $path)
                    .visibleTab(effectiveTab == .profile)
            }
            .animation(nil, value: effectiveTab)
        }
    }

    private func openCreateTrip() {
        tabBeforeCreate = selectedTab == .create ? tabBeforeCreate : selectedTab
        selectedTab = .create
    }

    private var effectiveTab: MainTab { selectedTab }
    private var showNav: Bool { selectedTab != .create && homeRole == .user }

    private var homeRole: HomeRole {
        if appState.accountInfo?.profile?.is_admin == true { return .admin }
        if appState.accountInfo?.profile?.is_business == true { return .business }
        return .user
    }
}

private enum HomeRole {
    case user
    case business
    case admin
}

enum Route: Hashable {
    case tripDetail(String)
    case settings
    case savedOffers
    case admin
    case business
    case booking
}

private extension View {
    func visibleTab(_ isVisible: Bool) -> some View {
        opacity(isVisible ? 1 : 0)
            .allowsHitTesting(isVisible)
            .accessibilityHidden(!isVisible)
            .zIndex(isVisible ? 1 : 0)
    }
}
