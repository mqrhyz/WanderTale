import SwiftUI

enum PremiumTheme {
    private static var darkMode: Bool { UserDefaults.standard.bool(forKey: "dark_mode") }
    static var bg: Color { darkMode ? Color(red: 0.08, green: 0.08, blue: 0.07) : Color(red: 0.96, green: 0.95, blue: 0.93) }
    static var surface: Color { darkMode ? Color(red: 0.13, green: 0.13, blue: 0.12) : Color.white }
    static var ink: Color { darkMode ? Color(red: 0.95, green: 0.94, blue: 0.90) : Color(red: 0.10, green: 0.09, blue: 0.08) }
    static var muted: Color { darkMode ? Color(red: 0.68, green: 0.66, blue: 0.60) : Color(red: 0.42, green: 0.41, blue: 0.38) }
    static var textMuted: Color { darkMode ? Color(red: 0.56, green: 0.54, blue: 0.49) : Color(red: 0.67, green: 0.66, blue: 0.65) }
    static let accent = Color(red: 0.91, green: 0.36, blue: 0.02)
    static var accentLight: Color { darkMode ? Color(red: 0.25, green: 0.13, blue: 0.07) : Color(red: 1.0, green: 0.96, blue: 0.94) }
    static let accentEnd = Color(red: 1.0, green: 0.44, blue: 0.13)
    static var border: Color { darkMode ? Color.white.opacity(0.10) : Color.black.opacity(0.08) }
    static var divider: Color { darkMode ? Color.white.opacity(0.08) : Color.black.opacity(0.07) }
    static var inputBg: Color { darkMode ? Color(red: 0.17, green: 0.17, blue: 0.16) : Color(red: 0.97, green: 0.97, blue: 0.96) }
    static let logoutRed = Color(red: 0.87, green: 0.0, blue: 0.0)

    static let statTripBg = Color(red: 1.0, green: 0.94, blue: 0.91)
    static let statTripIcon = accent
    static let statDestBg = Color(red: 0.91, green: 0.96, blue: 0.94)
    static let statDestIcon = Color(red: 0.16, green: 0.62, blue: 0.44)
    static let statBudgetBg = Color(red: 1.0, green: 0.96, blue: 0.91)
    static let statBudgetIcon = Color(red: 0.83, green: 0.51, blue: 0.04)
    static let statActivityBg = Color(red: 0.93, green: 0.94, blue: 1.0)
    static let statActivityIcon = Color(red: 0.35, green: 0.37, blue: 0.81)

    static let badgeUpcoming = Color(red: 0.16, green: 0.48, blue: 0.61)
    static let badgeActive = accent
    static let badgePast = Color(red: 0.62, green: 0.61, blue: 0.59)

    static let screenPadding: CGFloat = 20
    static let cardPadding: CGFloat = 16
    static let sectionGap: CGFloat = 24
    static let cardRadius: CGFloat = 16
    static let buttonRadius: CGFloat = 14
    static let inputRadius: CGFloat = 12
    static let navBarHeight: CGFloat = 84
    static let navFabSize: CGFloat = 56
    static let bottomNavBarHeight: CGFloat = 54
    static let bottomNavBottomInset: CGFloat = 0
    static let bottomNavDrop: CGFloat = 10
    /// Admin / business portal bottom tab bar — positive pushes bar toward screen bottom.
    static let portalBottomBarDrop: CGFloat = 16
    static let bottomNavClearance: CGFloat = bottomNavBarHeight + 8
}
