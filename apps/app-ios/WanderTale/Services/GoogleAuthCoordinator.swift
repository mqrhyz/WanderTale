import AuthenticationServices
import UIKit

/// Drives the Supabase OAuth (Google) flow through ASWebAuthenticationSession.
/// Opens the Supabase `/authorize` endpoint in a secure web view and captures
/// the redirect back to our custom URL scheme.
@MainActor
final class GoogleAuthCoordinator: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = GoogleAuthCoordinator()

    private var webSession: ASWebAuthenticationSession?

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
        return scene?.keyWindow ?? ASPresentationAnchor()
    }

    /// Launches the web auth session and resolves with the redirect callback URL.
    func authenticate(authURL: URL, callbackScheme: String) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: authURL,
                callbackURLScheme: callbackScheme
            ) { callbackURL, error in
                if let callbackURL {
                    continuation.resume(returning: callbackURL)
                } else if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(throwing: ApiError(message: "Đăng nhập Google bị huỷ"))
                }
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            self.webSession = session
            if !session.start() {
                continuation.resume(throwing: ApiError(message: "Không mở được trình duyệt đăng nhập"))
            }
        }
    }
}
