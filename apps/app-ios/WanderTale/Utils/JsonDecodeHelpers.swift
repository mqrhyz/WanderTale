import Foundation

extension KeyedDecodingContainer {
    func decodeLossyDouble(forKey key: Key) throws -> Double {
        if let value = try? decode(Double.self, forKey: key) { return value }
        if let value = try? decode(Int.self, forKey: key) { return Double(value) }
        throw DecodingError.typeMismatch(
            Double.self,
            DecodingError.Context(codingPath: codingPath + [key], debugDescription: "Expected number")
        )
    }

    func decodeLossyDoubleIfPresent(forKey key: Key) throws -> Double? {
        if (try? decodeNil(forKey: key)) == true { return nil }
        return try decodeLossyDouble(forKey: key)
    }

    func decodeLossyInt(forKey key: Key) throws -> Int {
        if let value = try? decode(Int.self, forKey: key) { return value }
        if let value = try? decode(Double.self, forKey: key) { return Int(value) }
        if let value = try? decode(String.self, forKey: key), let parsed = Int(value) { return parsed }
        throw DecodingError.typeMismatch(
            Int.self,
            DecodingError.Context(codingPath: codingPath + [key], debugDescription: "Expected integer")
        )
    }

    func decodeLossyIntIfPresent(forKey key: Key) throws -> Int? {
        if (try? decodeNil(forKey: key)) == true { return nil }
        return try decodeLossyInt(forKey: key)
    }
}
