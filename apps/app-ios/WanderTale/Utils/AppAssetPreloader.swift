import UIKit

enum AppAssetPreloader {
    private(set) static var isReady = false

    static func preload() {
        guard !isReady else { return }
        let names = ["logo10", "auth_background", "dashboard_bg", "logo_mark"]
        for name in names {
            _ = UIImage(named: name)
        }
        isReady = true
    }
}
