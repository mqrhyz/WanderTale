import SwiftUI

@main
struct WanderTaleApp: App {
    @State private var appState = AppState.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appState)
                .preferredColorScheme(appState.darkMode ? .dark : .light)
        }
    }
}
