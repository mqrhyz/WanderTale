import Foundation
import SwiftUI

/// Phân biệt lỗi do tác vụ bị huỷ (đổi tab, kết thúc pull-to-refresh, điều hướng)
/// với lỗi mạng thật. Lỗi huỷ KHÔNG nên hiển thị cho người dùng.
func isCancellationError(_ error: Error) -> Bool {
    if error is CancellationError { return true }
    if let urlError = error as? URLError, urlError.code == .cancelled { return true }
    let nsError = error as NSError
    if nsError.domain == NSURLErrorDomain, nsError.code == NSURLErrorCancelled { return true }
    if nsError.domain == NSCocoaErrorDomain, nsError.code == NSUserCancelledError { return true }
    return false
}

@MainActor
@Observable
final class AppState {
    static let shared = AppState()

    var isAuthenticated = false
    var isBootstrapping = true
    var darkMode = UserDefaults.standard.bool(forKey: "dark_mode")

    var stats: DashboardStats?
    var trips: [TripRecord] = []
    var displayName = "Xin chào"
    var accountInfo: AccountInfo?
    var favoriteTripIds: Set<String> = Set(UserDefaults.standard.stringArray(forKey: "favorite_trip_ids") ?? [])
    var dashboardError: String?
    var roleError: String?

    private var preloadTask: Task<Void, Never>?
    private var coverPollTask: Task<Void, Never>?

    func bootstrap() async {
        SupabaseClient.restoreSession()
        isAuthenticated = SupabaseClient.accessToken != nil
        if isAuthenticated { await preload() }
        isBootstrapping = false
    }

    func preload() async {
        // Chạy phần gọi mạng trong một Task không-cấu-trúc để việc huỷ do view
        // (đổi tab, kết thúc pull-to-refresh, điều hướng sau khi tạo chuyến) KHÔNG
        // làm huỷ request giữa chừng và hiện lỗi "đã hủy" sai.
        preloadTask?.cancel()
        let task = Task { await self.performPreload() }
        preloadTask = task
        await task.value
    }

    private func performPreload() async {
        roleError = nil
        var statsError: String?
        var tripsError: String?

        await loadAccountInfo()
        guard let profile = accountInfo?.profile else {
            roleError = "Không tải được quyền tài khoản. Vui lòng kiểm tra mạng rồi đăng nhập lại."
            return
        }
        if profile.is_admin || profile.is_business {
            dashboardError = nil
            return
        }

        do {
            stats = try await ApiService.dashboard()
        } catch {
            if !isCancellationError(error) {
                statsError = formatApiError(error, fallback: "Không tải thống kê")
            }
        }

        do {
            let fetched = try await ApiService.listTrips()
            trips = fetched
            RemoteImageCache.prefetch(fetched.compactMap { TripUtils.tripCoverImageUrl($0) })
        } catch {
            if !isCancellationError(error) {
                tripsError = formatApiError(error, fallback: "Không tải chuyến đi")
            }
        }

        // Chỉ hiện lỗi thật (bỏ qua huỷ tác vụ); nếu không thì xoá lỗi cũ.
        if let statsError, let tripsError {
            dashboardError = "Không tải được dữ liệu từ \(AppConfig.apiURL). Thống kê: \(statsError). Chuyến đi: \(tripsError)"
        } else {
            dashboardError = statsError ?? tripsError
        }

        startCoverImagePollingIfNeeded()
    }

    /// Ảnh bìa được sinh ở server (Pexels) nên có thể chưa sẵn ngay lúc tạo chuyến.
    /// Poll vài lần để ảnh bìa tự xuất hiện real-time mà không cần kéo refresh.
    private func startCoverImagePollingIfNeeded() {
        coverPollTask?.cancel()
        guard trips.contains(where: { TripUtils.tripCoverImageUrl($0) == nil }) else { return }
        coverPollTask = Task {
            for _ in 0..<5 {
                try? await Task.sleep(for: .seconds(3))
                if Task.isCancelled { return }
                guard let fresh = try? await ApiService.listTrips() else { continue }
                if Task.isCancelled { return }
                self.trips = fresh
                RemoteImageCache.prefetch(fresh.compactMap { TripUtils.tripCoverImageUrl($0) })
                if !fresh.contains(where: { TripUtils.tripCoverImageUrl($0) == nil }) { return }
            }
        }
    }

    func signIn(email: String, password: String) async throws {
        try await SupabaseClient.signIn(email: email, password: password)
        await preload()
        isAuthenticated = true
    }

    func signUp(email: String, password: String, displayName: String) async throws {
        try await SupabaseClient.signUp(email: email, password: password, displayName: displayName)
        await loadAccountInfo()
        await preload()
        isAuthenticated = true
    }

    func signInWithGoogle() async throws {
        try await SupabaseClient.signInWithGoogle()
        await loadAccountInfo()
        await preload()
        isAuthenticated = true
    }

    func signInWithFacebook() async throws {
        try await SupabaseClient.signInWithFacebook()
        await loadAccountInfo()
        await preload()
        isAuthenticated = true
    }

    func signOut() {
        preloadTask?.cancel()
        coverPollTask?.cancel()
        SupabaseClient.signOut()
        isAuthenticated = false
        stats = nil
        trips = []
        displayName = "Xin chào"
        accountInfo = nil
        roleError = nil
        dashboardError = nil
    }

    func toggleFavorite(_ tripId: String) {
        if favoriteTripIds.contains(tripId) {
            favoriteTripIds.remove(tripId)
        } else {
            favoriteTripIds.insert(tripId)
        }
        UserDefaults.standard.set(Array(favoriteTripIds), forKey: "favorite_trip_ids")
    }

    func setDarkMode(_ enabled: Bool) {
        darkMode = enabled
        UserDefaults.standard.set(enabled, forKey: "dark_mode")
    }

    func loadAccountInfo() async {
        guard let token = SupabaseClient.accessToken else { return }
        guard let uid = jwtUserId(from: token) else { return }

        do {
            var profile = try await SupabaseClient.fetchProfile(userId: uid)
            if profile == nil {
                let email = jwtEmail(from: token) ?? ""
                let name = displayName.isEmpty ? email.components(separatedBy: "@").first ?? "Khách du lịch" : displayName
                let row = ProfileRow(id: uid, display_name: name, email: email, phone: nil, is_admin: false, is_business: false)
                try? await SupabaseClient.insertProfile(row)
                profile = try await SupabaseClient.fetchProfile(userId: uid)
            }
            if let profile {
                accountInfo = AccountInfo(
                    displayName: profile.display_name?.trimmingCharacters(in: .whitespaces).isEmpty == false
                        ? profile.display_name! : "Khách du lịch",
                    email: profile.email ?? jwtEmail(from: token) ?? "",
                    phone: profile.phone ?? "",
                    profile: profile
                )
                displayName = accountInfo?.displayName ?? displayName
                if !profile.is_admin && !profile.is_business {
                    setDarkMode(false)
                }
            }
        } catch {
            if isCancellationError(error) { return }
            accountInfo = nil
            roleError = formatApiError(error, fallback: "Không tải được quyền tài khoản")
        }
    }

    func updatePhone(_ phone: String) async throws {
        guard let uid = accountInfo?.profile?.id else { throw ApiError(message: "Chưa đăng nhập") }
        try await SupabaseClient.updatePhone(userId: uid, phone: phone.isEmpty ? nil : phone)
        accountInfo?.phone = phone
    }

    private func jwtUserId(from token: String) -> String? {
        jwtPayload(token)?["sub"] as? String
    }

    private func jwtEmail(from token: String) -> String? {
        jwtPayload(token)?["email"] as? String
    }

    private func jwtPayload(_ token: String) -> [String: Any]? {
        let parts = token.split(separator: ".")
        guard parts.count >= 2 else { return nil }
        // JWT segments are Base64URL ("-" "_") — convert to standard Base64 before decoding.
        var b64 = String(parts[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        while b64.count % 4 != 0 { b64.append("=") }
        guard let data = Data(base64Encoded: b64) else { return nil }
        return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    }
}
