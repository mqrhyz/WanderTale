import Foundation

enum AppConfig {
    static var supabaseURL: String {
        normalizeURL(string(for: "SUPABASE_URL", fallback: "https://YOUR_PROJECT.supabase.co"))
    }

    static var supabaseAnonKey: String {
        string(for: "SUPABASE_ANON_KEY", fallback: "")
    }

    static var apiURL: String {
        normalizeURL(string(for: "API_URL", fallback: "https://wander-tale-api-378632863425.asia-southeast1.run.app"))
    }

    static var isSupabaseConfigured: Bool {
        supabaseURL.contains(".supabase.co") && !supabaseAnonKey.isEmpty
    }

    private static func normalizeURL(_ raw: String) -> String {
        raw.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }

    private static func string(for key: String, fallback: String) -> String {
        if let value = Bundle.main.object(forInfoDictionaryKey: key) as? String,
           !value.isEmpty,
           !value.contains("YOUR_") {
            return value
        }
        if let value = ProcessInfo.processInfo.environment[key], !value.isEmpty {
            return value
        }
        return fallback
    }
}
