import SwiftUI

@main
struct WanderTaleApp: App {
    @State private var appState = AppState.shared

    private var preferredScheme: ColorScheme? {
        let profile = appState.accountInfo?.profile
        let isPortal = profile?.is_admin == true || profile?.is_business == true
        if !isPortal { return .light }
        return appState.darkMode ? .dark : .light
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appState)
                .preferredColorScheme(preferredScheme)
        }
    }
}
