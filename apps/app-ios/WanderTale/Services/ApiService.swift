import Foundation

enum ApiService {
    private static let decoder = JSONDecoder()
    private static let encoder = JSONEncoder()
    private static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 300
        config.timeoutIntervalForResource = 300
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        return URLSession(configuration: config)
    }()

    private static func token() async throws -> String {
        guard let t = SupabaseClient.accessToken else { throw ApiError(message: "Chưa đăng nhập") }
        return t
    }

    static func request<T: Decodable>(
        path: String,
        method: String = "GET",
        body: Data? = nil,
        query: [String: String] = [:]
    ) async throws -> T {
        do {
            return try await performRequest(path: path, method: method, body: body, query: query)
        } catch let api as ApiError where api.isExpiredToken {
            try await SupabaseClient.refreshSession()
            return try await performRequest(path: path, method: method, body: body, query: query)
        }
    }

    private static func performRequest<T: Decodable>(
        path: String,
        method: String = "GET",
        body: Data? = nil,
        query: [String: String] = [:]
    ) async throws -> T {
        guard var components = URLComponents(string: "\(AppConfig.apiURL)\(path)") else {
            throw ApiError(message: "URL API không hợp lệ")
        }
        if !query.isEmpty {
            components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = components.url else { throw ApiError(message: "URL API không hợp lệ") }

        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("Bearer \(try await token())", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = body
        }

        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw ApiError(message: "Phản hồi không hợp lệ") }
        if http.statusCode >= 400 {
            let msg = (try? decoder.decode(ApiErrorBody.self, from: data))?.resolvedMessage
                ?? String(data: data, encoding: .utf8)
                ?? "HTTP \(http.statusCode)"
            throw ApiError(message: msg, statusCode: http.statusCode)
        }
        return try decoder.decode(T.self, from: data)
    }

    static func listTrips() async throws -> [TripRecord] {
        try await request(path: "/api/trips")
    }

    static func getTrip(id: String) async throws -> TripRecord {
        try await request(path: "/api/trips/\(id)")
    }

    static func deleteTrip(id: String) async throws {
        guard let url = URL(string: "\(AppConfig.apiURL)/api/trips/\(id)") else {
            throw ApiError(message: "URL API không hợp lệ")
        }
        var req = URLRequest(url: url)
        req.httpMethod = "DELETE"
        req.setValue("Bearer \(try await token())", forHTTPHeaderField: "Authorization")
        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw ApiError(message: "Phản hồi không hợp lệ") }
        if http.statusCode >= 400 {
            let msg = (try? decoder.decode(ApiErrorBody.self, from: data))?.resolvedMessage
                ?? String(data: data, encoding: .utf8)
                ?? "Không xóa được chuyến"
            let error = ApiError(message: msg, statusCode: http.statusCode)
            if error.isExpiredToken {
                try await SupabaseClient.refreshSession()
                try await deleteTrip(id: id)
                return
            }
            throw error
        }
    }

    static func duplicateTrip(id: String) async throws -> TripRecord {
        try await request(path: "/api/trips/\(id)/duplicate", method: "POST")
    }

    static func generateTrip(_ payload: TripGenerateRequest) async throws -> TripGenerateResponse {
        let data = try encoder.encode(payload)
        return try await request(path: "/api/trips/generate", method: "POST", body: data)
    }

    static func geocodeAutocomplete(text: String) async throws -> GeocodeAutocompleteResponse {
        try await request(path: "/api/geocode/autocomplete", query: ["text": text.trimmingCharacters(in: .whitespaces)])
    }

    static func dashboard() async throws -> DashboardStats {
        try await request(path: "/api/dashboard")
    }

    struct UploadImageResponse: Decodable {
        let url: String
    }

    static func uploadImage(data: Data, filename: String, mimeType: String = "image/jpeg") async throws -> String {
        let boundary = "Boundary-\(UUID().uuidString)"
        guard let url = URL(string: "\(AppConfig.apiURL)/api/upload/image") else {
            throw ApiError(message: "URL API không hợp lệ")
        }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(try await token())", forHTTPHeaderField: "Authorization")
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body

        let (responseData, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw ApiError(message: "Phản hồi không hợp lệ") }
        if http.statusCode >= 400 {
            let msg = (try? decoder.decode(ApiErrorBody.self, from: responseData))?.resolvedMessage
                ?? String(data: responseData, encoding: .utf8)
                ?? "HTTP \(http.statusCode)"
            throw ApiError(message: msg, statusCode: http.statusCode)
        }
        return try decoder.decode(UploadImageResponse.self, from: responseData).url
    }

    static func streamTripUpdates(tripId: String, onEvent: @escaping (String) -> Void) async throws {
        guard let url = URL(string: "\(AppConfig.apiURL)/api/trips/\(tripId)/stream") else { return }
        var req = URLRequest(url: url)
        req.setValue("Bearer \(try await token())", forHTTPHeaderField: "Authorization")
        req.setValue("text/event-stream", forHTTPHeaderField: "Accept")

        let (bytes, response) = try await session.bytes(for: req)
        guard let http = response as? HTTPURLResponse, http.statusCode < 400 else {
            throw ApiError(message: "SSE lỗi")
        }

        var pendingData: String?
        for try await line in bytes.lines {
            if line.hasPrefix("data:") {
                pendingData = String(line.dropFirst(5)).trimmingCharacters(in: .whitespaces)
            } else if line.isEmpty, let data = pendingData {
                onEvent(data)
                pendingData = nil
            }
        }
    }
}
