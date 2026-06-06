import Foundation

struct SupabaseSession: Codable {
    let access_token: String
    let refresh_token: String?
    let expires_in: Int?
    let token_type: String?
    let user: SupabaseUser?
}

struct SupabaseUser: Codable {
    let id: String
    let email: String?

    enum CodingKeys: String, CodingKey {
        case id, email
    }
}

private struct SupabaseErrorBody: Decodable {
    let msg: String?
    let error_description: String?
    let message: String?
    let error_code: String?

    var displayMessage: String? {
        msg ?? error_description ?? message
    }
}

enum SupabaseClient {
    private static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        return d
    }()

    private static let authSession: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 25
        config.timeoutIntervalForResource = 35
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.waitsForConnectivity = true
        return URLSession(configuration: config)
    }()

    static var accessToken: String? {
        KeychainStore.load("access_token")
    }

    static var refreshToken: String? {
        KeychainStore.load("refresh_token")
    }

    static func restoreSession() {
        _ = accessToken
    }

    static func signIn(email: String, password: String) async throws {
        let body: [String: String] = ["email": email, "password": password]
        let session: SupabaseSession = try await postAuth(path: "token?grant_type=password", body: body)
        store(session)
    }

    static func signUp(email: String, password: String, displayName: String) async throws {
        struct Meta: Encodable { let display_name: String }
        struct Body: Encodable {
            let email: String
            let password: String
            let data: Meta
        }
        let session: SupabaseSession = try await postAuth(path: "signup", body: Body(email: email, password: password, data: Meta(display_name: displayName)))
        store(session)
    }

    static func resetPassword(email: String) async throws {
        struct Body: Encodable { let email: String }
        _ = try await request(path: "recover", method: "POST", body: Body(email: email), authorized: false) as EmptyResponse
    }

    static func signOut() {
        KeychainStore.clearSession()
    }

    /// OAuth (Google) login via Supabase. Opens a secure web session, then stores
    /// the access/refresh tokens returned in the redirect callback.
    static func signInWithGoogle() async throws {
        let redirect = "wandertale://login-callback"
        guard var comp = URLComponents(string: "\(AppConfig.supabaseURL)/auth/v1/authorize") else {
            throw ApiError(message: "URL Supabase không hợp lệ")
        }
        comp.queryItems = [
            URLQueryItem(name: "provider", value: "google"),
            URLQueryItem(name: "redirect_to", value: redirect),
        ]
        guard let authURL = comp.url else { throw ApiError(message: "URL đăng nhập không hợp lệ") }

        let callback = try await GoogleAuthCoordinator.shared.authenticate(
            authURL: authURL,
            callbackScheme: "wandertale"
        )

        let params = parseCallbackParams(callback)
        if let errorDesc = params["error_description"] ?? params["error"] {
            throw ApiError(message: errorDesc.replacingOccurrences(of: "+", with: " "))
        }
        guard let accessToken = params["access_token"], !accessToken.isEmpty else {
            throw ApiError(message: "Không nhận được phiên đăng nhập từ Google")
        }
        KeychainStore.save("access_token", value: accessToken)
        if let refresh = params["refresh_token"], !refresh.isEmpty {
            KeychainStore.save("refresh_token", value: refresh)
        }
    }

    /// Parses key/value pairs from both the URL fragment (`#a=b&...`) and query string.
    private static func parseCallbackParams(_ url: URL) -> [String: String] {
        var result: [String: String] = [:]
        func absorb(_ raw: String?) {
            guard let raw, !raw.isEmpty else { return }
            for pair in raw.split(separator: "&") {
                let kv = pair.split(separator: "=", maxSplits: 1).map(String.init)
                guard kv.count == 2 else { continue }
                result[kv[0]] = kv[1].removingPercentEncoding ?? kv[1]
            }
        }
        let comp = URLComponents(url: url, resolvingAgainstBaseURL: false)
        absorb(comp?.fragment)
        absorb(comp?.query)
        return result
    }

    static func refreshSession() async throws {
        guard let refreshToken else {
            throw ApiError(message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
        }
        struct Body: Encodable {
            let refresh_token: String
        }
        let session: SupabaseSession = try await postAuth(
            path: "token?grant_type=refresh_token",
            body: Body(refresh_token: refreshToken)
        )
        store(session)
    }

    static func fetchProfile(userId: String) async throws -> ProfileRow? {
        let rows: [ProfileRow] = try await restGet(table: "profiles", query: "id=eq.\(userId)&select=*")
        return rows.first
    }

    static func insertProfile(_ profile: ProfileRow) async throws {
        try await restPost(table: "profiles", body: profile)
    }

    static func updatePhone(userId: String, phone: String?) async throws {
        struct Patch: Encodable { let phone: String? }
        try await restPatch(table: "profiles", query: "id=eq.\(userId)", body: Patch(phone: phone))
    }

    static func listPartners() async throws -> [PartnerRow] {
        try await restGet(table: "partners", query: "select=*")
    }

    static func listVouchersAdmin() async throws -> [VoucherRow] {
        try await restGet(table: "vouchers", query: "select=id,code,title,valid_from,valid_until")
    }

    private static func store(_ session: SupabaseSession) {
        KeychainStore.save("access_token", value: session.access_token)
        if let refresh = session.refresh_token {
            KeychainStore.save("refresh_token", value: refresh)
        }
    }

    private struct EmptyResponse: Decodable {}

    private static func postAuth<T: Decodable>(path: String, body: some Encodable) async throws -> T {
        try await request(path: path, method: "POST", body: body, authorized: false)
    }

    private static func request<T: Decodable>(
        path: String,
        method: String,
        body: (some Encodable)? = nil,
        authorized: Bool
    ) async throws -> T {
        guard let url = URL(string: "\(AppConfig.supabaseURL)/auth/v1/\(path)") else {
            throw ApiError(message: "URL Supabase không hợp lệ")
        }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        if authorized, let token = accessToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        } else {
            req.setValue("Bearer \(AppConfig.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        }
        if #available(iOS 14.5, *) {
            req.assumesHTTP3Capable = false
        }
        if let body {
            req.httpBody = try JSONEncoder().encode(body)
        }
        let (data, response) = try await authData(for: req)
        guard let http = response as? HTTPURLResponse else { throw ApiError(message: "Phản hồi không hợp lệ") }
        if http.statusCode >= 400 {
            let body = try? decoder.decode(SupabaseErrorBody.self, from: data)
            let msg = body?.displayMessage
                ?? String(data: data, encoding: .utf8)
                ?? "HTTP \(http.statusCode)"
            throw ApiError(message: localizeSupabaseError(msg, code: body?.error_code), statusCode: http.statusCode)
        }
        if T.self == EmptyResponse.self {
            return EmptyResponse() as! T
        }
        return try decoder.decode(T.self, from: data)
    }

    private static func authData(for request: URLRequest) async throws -> (Data, URLResponse) {
        do {
            return try await authSession.data(for: request)
        } catch {
            guard isTransientNetworkError(error) else {
                throw localizeNetworkError(error)
            }
            try? await Task.sleep(nanoseconds: 450_000_000)
            do {
                return try await authSession.data(for: request)
            } catch {
                throw localizeNetworkError(error)
            }
        }
    }

    private static func isTransientNetworkError(_ error: Error) -> Bool {
        let nsError = error as NSError
        guard nsError.domain == NSURLErrorDomain else { return false }
        return [
            NSURLErrorNetworkConnectionLost,
            NSURLErrorTimedOut,
            NSURLErrorCannotConnectToHost,
            NSURLErrorCannotFindHost,
            NSURLErrorDNSLookupFailed,
        ].contains(nsError.code)
    }

    private static func localizeNetworkError(_ error: Error) -> Error {
        let nsError = error as NSError
        guard nsError.domain == NSURLErrorDomain else { return error }
        switch nsError.code {
        case NSURLErrorNotConnectedToInternet:
            return ApiError(message: "Thiết bị chưa có kết nối mạng. Kiểm tra Wi-Fi hoặc dữ liệu di động rồi thử lại.")
        case NSURLErrorNetworkConnectionLost, NSURLErrorTimedOut:
            return ApiError(message: "Kết nối tới Supabase bị gián đoạn. Vui lòng thử đăng ký lại.")
        case NSURLErrorCannotConnectToHost, NSURLErrorCannotFindHost, NSURLErrorDNSLookupFailed:
            return ApiError(message: "Không kết nối được Supabase. Kiểm tra mạng hoặc cấu hình SUPABASE_URL.")
        default:
            return error
        }
    }

    private static func localizeSupabaseError(_ message: String, code: String?) -> String {
        if code == "invalid_credentials" || message.localizedCaseInsensitiveContains("invalid login") {
            return "Email hoặc mật khẩu không đúng."
        }
        if message.localizedCaseInsensitiveContains("email not confirmed") {
            return "Email chưa được xác nhận. Kiểm tra hộp thư."
        }
        return message
    }

    private static func restGet<T: Decodable>(table: String, query: String) async throws -> T {
        guard let url = URL(string: "\(AppConfig.supabaseURL)/rest/v1/\(table)?\(query)") else {
            throw ApiError(message: "URL không hợp lệ")
        }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(accessToken ?? AppConfig.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse, http.statusCode < 400 else {
            throw ApiError(message: "Supabase REST lỗi")
        }
        return try decoder.decode(T.self, from: data)
    }

    private static func restPost<T: Encodable>(table: String, body: T) async throws {
        guard let url = URL(string: "\(AppConfig.supabaseURL)/rest/v1/\(table)") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(accessToken ?? AppConfig.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        req.httpBody = try JSONEncoder().encode(body)
        let (_, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse, http.statusCode < 400 else {
            throw ApiError(message: "Không thể tạo profile")
        }
    }

    private static func restPatch<T: Encodable>(table: String, query: String, body: T) async throws {
        guard let url = URL(string: "\(AppConfig.supabaseURL)/rest/v1/\(table)?\(query)") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(accessToken ?? AppConfig.supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        req.httpBody = try JSONEncoder().encode(body)
        let (_, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse, http.statusCode < 400 else {
            throw ApiError(message: "Không thể cập nhật profile")
        }
    }
}

struct ApiError: LocalizedError {
    let message: String
    var statusCode: Int?
    var errorDescription: String? { message }

    var isExpiredToken: Bool {
        message.localizedCaseInsensitiveContains("invalid_or_expired_token") ||
            message.localizedCaseInsensitiveContains("expired token") ||
            statusCode == 401
    }
}
