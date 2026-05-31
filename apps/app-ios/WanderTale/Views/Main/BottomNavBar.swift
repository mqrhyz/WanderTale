import SwiftUI

struct WanderTaleBottomNav: View {
    @Binding var selectedTab: MainTab
    let onCreate: () -> Void

    @State private var bubbleTab: MainTab = .dashboard
    @Namespace private var glassNamespace

    private let barHeight: CGFloat = PremiumTheme.bottomNavBarHeight

    var body: some View {
        Group {
            if #available(iOS 26.0, *) {
                GlassEffectContainer(spacing: 16) {
                    barContent
                        .glassEffect(.regular.tint(.white.opacity(0.68)), in: .capsule)
                }
            } else {
                barContent
                    .liquidGlassSurface(cornerRadius: barHeight / 2)
            }
        }
        .frame(maxWidth: .infinity)
        .onAppear {
            bubbleTab = selectedTab
        }
        .onChange(of: selectedTab) { _, newValue in
            guard bubbleTab != newValue else { return }
            withAnimation(.smooth(duration: 0.42, extraBounce: 0.18)) {
                bubbleTab = newValue
            }
        }
    }

    private var barContent: some View {
        ZStack(alignment: .leading) {
            movingSelectionBubble

            HStack(spacing: 0) {
                navItem(.dashboard, icon: "square.grid.2x2", filledIcon: "square.grid.2x2.fill", label: "Home")
                navItem(.trips, icon: "map", filledIcon: "map.fill", label: "Chuyến")
                createButton
                navItem(.favorites, icon: "heart", filledIcon: "heart.fill", label: "Yêu thích")
                navItem(.profile, icon: "person", filledIcon: "person.fill", label: "Hồ sơ")
            }
            .zIndex(1)
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 4)
        .frame(height: barHeight)
    }

    private var movingSelectionBubble: some View {
        GeometryReader { proxy in
            let itemWidth = proxy.size.width / 5
            let bubbleWidth = min(itemWidth * 0.82, 74)
            let bubbleHeight = barHeight - 14
            let centeredX = itemWidth * visualIndex(for: bubbleTab) + (itemWidth - bubbleWidth) / 2
            selectionBubble
                .frame(width: bubbleWidth, height: bubbleHeight)
                .offset(x: centeredX, y: (barHeight - bubbleHeight) / 2 - 1)
                .allowsHitTesting(false)
        }
        .frame(height: barHeight)
        .zIndex(0)
    }

    private func navItem(_ tab: MainTab, icon: String, filledIcon: String, label: String) -> some View {
        let selected = selectedTab == tab
        return Button {
            guard selectedTab != tab else { return }
            var transaction = Transaction()
            transaction.disablesAnimations = true
            withTransaction(transaction) {
                selectedTab = tab
            }
        } label: {
            VStack(spacing: 2) {
                Image(systemName: selected ? filledIcon : icon)
                    .font(.system(size: selected ? 17.5 : 17, weight: selected ? .bold : .regular))
                Text(label)
                    .font(.system(size: selected ? 10.2 : 10, weight: selected ? .bold : .medium))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .foregroundStyle(selected ? PremiumTheme.accent : PremiumTheme.muted)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 2)
            .padding(.vertical, 7)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .zIndex(selected ? 2 : 1)
    }

    @ViewBuilder
    private var selectionBubble: some View {
        if #available(iOS 26.0, *) {
            Capsule(style: .continuous)
                .glassEffect(.regular.interactive().tint(.white.opacity(0.72)), in: .capsule)
                .glassEffectID("tabSelection", in: glassNamespace)
                .background {
                    Capsule(style: .continuous)
                        .fill(Color.white.opacity(0.18))
                }
                .overlay {
                    Capsule(style: .continuous)
                        .stroke(Color.white.opacity(0.72), lineWidth: 1)
                }
                .overlay {
                    Capsule(style: .continuous)
                        .stroke(PremiumTheme.accent.opacity(0.16), lineWidth: 0.8)
                }
                .overlay(alignment: .topLeading) {
                    Circle()
                        .fill(Color.white.opacity(0.28))
                        .frame(width: 12, height: 12)
                        .blur(radius: 6)
                        .offset(x: 13, y: 6)
                }
                .shadow(color: PremiumTheme.accent.opacity(0.08), radius: 7, y: 1)
                .shadow(color: Color.black.opacity(0.05), radius: 7, y: 2)
        } else {
            Capsule(style: .continuous)
                .fill(Color.white.opacity(0.86))
                .overlay {
                    Capsule(style: .continuous)
                        .stroke(Color.white.opacity(0.9), lineWidth: 1)
                }
                .shadow(color: Color.black.opacity(0.1), radius: 10, y: 3)
        }
    }

    private var createButton: some View {
        Button(action: onCreate) {
            VStack(spacing: 2) {
                Image(systemName: "plus")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 34, height: 34)
                    .background {
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [PremiumTheme.accent, PremiumTheme.accentEnd],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    }
                    .overlay {
                        Circle()
                            .stroke(Color.white.opacity(0.35), lineWidth: 1)
                    }
                    .shadow(color: PremiumTheme.accent.opacity(0.28), radius: 6, y: 2)

                Text(" ")
                    .font(.system(size: 10, weight: .medium))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 7)
        }
        .buttonStyle(.plain)
    }

    private func visualIndex(for tab: MainTab) -> CGFloat {
        switch tab {
        case .dashboard:
            return 0
        case .trips:
            return 1
        case .create:
            return 2
        case .favorites:
            return 3
        case .profile:
            return 4
        }
    }
}

enum MainTab: String, Hashable {
    case dashboard, trips, create, favorites, profile
}
