import SwiftUI
import UIKit

import SwiftUI
import UIKit
import ImageIO

enum RemoteImageCache {
    static let shared: NSCache<NSURL, UIImage> = {
        let cache = NSCache<NSURL, UIImage>()
        cache.countLimit = 200
        cache.totalCostLimit = 100 * 1024 * 1024
        return cache
    }()

    static let session: URLSession = {
        let cache = URLCache(memoryCapacity: 50_000_000, diskCapacity: 200_000_000)
        let config = URLSessionConfiguration.default
        config.urlCache = cache
        config.requestCachePolicy = .returnCacheDataElseLoad
        return URLSession(configuration: config)
    }()

    static func downsample(data: Data, maxPixelSize: CGFloat = 720) -> UIImage? {
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxPixelSize,
        ]
        guard
            let source = CGImageSourceCreateWithData(data as CFData, nil),
            let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary)
        else {
            return UIImage(data: data)
        }
        return UIImage(cgImage: cgImage)
    }

    static func prefetch(_ urls: [String], maxPixelSize: CGFloat = 720) {
        for raw in Set(urls) {
            guard let url = URL(string: raw) else { continue }
            guard shared.object(forKey: url as NSURL) == nil else { continue }

            Task.detached(priority: .utility) {
                do {
                    var request = URLRequest(url: url)
                    request.cachePolicy = .returnCacheDataElseLoad
                    let (data, _) = try await session.data(for: request)
                    guard let image = downsample(data: data, maxPixelSize: maxPixelSize) else { return }
                    await MainActor.run {
                        shared.setObject(image, forKey: url as NSURL, cost: data.count)
                    }
                } catch {
                    return
                }
            }
        }
    }
}

@MainActor
private final class RemoteImageLoader: ObservableObject {
    @Published var image: UIImage?
    @Published var didFail = false

    private var task: Task<Void, Never>?
    private var currentURL: URL?

    func load(_ url: URL) {
        guard currentURL != url else { return }
        currentURL = url
        didFail = false
        task?.cancel()

        if let cached = RemoteImageCache.shared.object(forKey: url as NSURL) {
            image = cached
            return
        }

        image = nil
        task = Task {
            do {
                let data = try await Task.detached(priority: .userInitiated) {
                    var request = URLRequest(url: url)
                    request.cachePolicy = .returnCacheDataElseLoad
                    return try await RemoteImageCache.session.data(for: request).0
                }.value
                guard !Task.isCancelled, let loaded = RemoteImageCache.downsample(data: data) else { return }
                RemoteImageCache.shared.setObject(loaded, forKey: url as NSURL, cost: data.count)
                image = loaded
            } catch {
                guard !Task.isCancelled else { return }
                didFail = true
            }
        }
    }

    func cancel() {
        task?.cancel()
        task = nil
    }
}

struct RemoteImage: View {
    let url: String?
    var fallback: String = "?"
    var contentMode: ContentMode = .fill
    @StateObject private var loader = RemoteImageLoader()

    var body: some View {
        Group {
            if let url, let imageURL = URL(string: url) {
                Group {
                    if let image = loader.image {
                        Image(uiImage: image)
                            .resizable()
                            .aspectRatio(contentMode: contentMode)
                    } else if loader.didFail {
                        fallbackView
                    } else {
                        placeholderView
                    }
                }
                .onAppear { loader.load(imageURL) }
                .onChange(of: imageURL) { _, newURL in loader.load(newURL) }
            } else {
                fallbackView
            }
        }
    }

    private var fallbackView: some View {
        ZStack {
            PremiumTheme.inputBg
            Text(String(fallback.prefix(1)).uppercased())
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(PremiumTheme.accent)
        }
    }

    private var placeholderView: some View {
        ZStack {
            PremiumTheme.inputBg
            Text(String(fallback.prefix(1)).uppercased())
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(PremiumTheme.accent.opacity(0.55))
        }
    }
}

struct ImageCarousel: View {
    let images: [String]
    let alt: String
    var fallback: String = "?"
    var width: CGFloat = 120
    var height: CGFloat?
    var contentMode: ContentMode = .fill

    @State private var index = 0

    private var frameHeight: CGFloat { height ?? width }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: PremiumTheme.inputRadius, style: .continuous)
                .fill(PremiumTheme.inputBg)

            if images.isEmpty {
                fallbackBox
            } else {
                RemoteImage(
                    url: images[index % images.count],
                    fallback: fallback,
                    contentMode: contentMode
                )
                .frame(width: width, height: frameHeight)
                .clipShape(RoundedRectangle(cornerRadius: PremiumTheme.inputRadius, style: .continuous))

                if images.count > 1 {
                    VStack(spacing: 0) {
                        HStack {
                            Label("\(images.count)", systemImage: "photo.on.rectangle")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 3)
                                .background(PremiumTheme.ink.opacity(0.6))
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                            Spacer()
                        }
                        .padding(6)

                        Spacer()

                        HStack(spacing: 0) {
                            carouselButton(systemName: "chevron.left") {
                                index = (index - 1 + images.count) % images.count
                            }
                            Spacer()
                            carouselButton(systemName: "chevron.right") {
                                index = (index + 1) % images.count
                            }
                        }
                        .padding(.horizontal, 4)
                        .padding(.bottom, 6)
                    }
                    .frame(width: width, height: frameHeight)
                }
            }
        }
        .frame(width: width, height: frameHeight)
    }

    private func carouselButton(systemName: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 24, height: 24)
                .background(PremiumTheme.ink.opacity(0.45))
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
    }

    private var fallbackBox: some View {
        Text(fallback)
            .font(.system(size: 20, weight: .bold))
            .foregroundStyle(PremiumTheme.accent)
            .frame(width: width, height: frameHeight)
    }
}

struct DotPatternBackground: View {
    var body: some View {
        GeometryReader { geo in
            Canvas { context, size in
                let spacing: CGFloat = 18
                for x in stride(from: 0, through: size.width, by: spacing) {
                    for y in stride(from: 0, through: size.height, by: spacing) {
                        let rect = CGRect(x: x, y: y, width: 2, height: 2)
                        context.fill(Path(ellipseIn: rect), with: .color(PremiumTheme.accent.opacity(0.08)))
                    }
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .allowsHitTesting(false)
    }
}

struct AuthBackgroundView: View {
    @State private var loaded = AppAssetPreloader.isReady

    var body: some View {
        GeometryReader { geo in
            ZStack {
                if loaded {
                    Image("auth_background")
                        .resizable()
                        .scaledToFill()
                        .frame(width: geo.size.width, height: geo.size.height)
                        .clipped()
                        .transition(.opacity)
                } else {
                    LinearGradient(
                        colors: [PremiumTheme.accent.opacity(0.85), PremiumTheme.ink],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                }
                Color.black.opacity(0.32)
                LinearGradient(
                    colors: [Color.black.opacity(0.42), Color.black.opacity(0.12), Color.black.opacity(0.58)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .onAppear {
            AppAssetPreloader.preload()
            withAnimation(.easeOut(duration: 0.35)) {
                loaded = true
            }
        }
    }
}
