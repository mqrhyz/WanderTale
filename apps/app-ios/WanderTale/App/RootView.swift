import SwiftUI

struct RootView: View {
    @Environment(AppState.self) private var appState
    @State private var showSplash = true

    var body: some View {
        ZStack {
            if showSplash || appState.isBootstrapping {
                SplashView()
                    .transition(.opacity)
                    .zIndex(1)
            } else if appState.isAuthenticated {
                MainTabView()
                    .transition(.opacity.combined(with: .scale(scale: 0.98)))
            } else {
                LoginView()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.45), value: showSplash)
        .animation(.easeInOut(duration: 0.45), value: appState.isBootstrapping)
        .animation(.easeInOut(duration: 0.35), value: appState.isAuthenticated)
        .task {
            AppAssetPreloader.preload()
            async let bootstrap: Void = appState.bootstrap()
            // Minimum splash so logo animation + asset preload are visible
            try? await Task.sleep(nanoseconds: 500_000_000)
            await bootstrap
            withAnimation(.easeInOut(duration: 0.45)) {
                showSplash = false
            }
        }
    }
}
