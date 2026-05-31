import SwiftUI

/// Scroll dọc chuẩn — khóa chiều ngang, tránh content tràn/cắt mép trái.
struct AppScreenScroll<Content: View>: View {
    @ViewBuilder var content: () -> Content

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            content()
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, PremiumTheme.screenPadding)
                .padding(.top, 12)
                .padding(.bottom, 12)
        }
        .scrollBounceBehavior(.basedOnSize, axes: .vertical)
        .background(PremiumTheme.bg)
    }
}

extension View {
    func appTabRoot() -> some View {
        toolbar(.hidden, for: .navigationBar)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
