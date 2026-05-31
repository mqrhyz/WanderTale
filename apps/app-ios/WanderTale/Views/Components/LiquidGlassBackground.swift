import SwiftUI

/// Frosted liquid-glass surface (giống wt-auth-glass trên web).
struct LiquidGlassBackground: View {
    var cornerRadius: CGFloat = 28

    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(
                LinearGradient(
                    colors: [
                        Color.white.opacity(0.72),
                        Color.white.opacity(0.42),
                        Color.white.opacity(0.55),
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .background {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(.ultraThinMaterial)
            }
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(0.85),
                                Color.white.opacity(0.25),
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        lineWidth: 1
                    )
            }
            .shadow(color: Color.black.opacity(0.12), radius: 16, y: 6)
            .shadow(color: Color.black.opacity(0.06), radius: 4, y: 1)
    }
}

extension View {
    @ViewBuilder
    func liquidGlassSurface(cornerRadius: CGFloat = 28) -> some View {
        background {
            LiquidGlassBackground(cornerRadius: cornerRadius)
        }
    }
}
