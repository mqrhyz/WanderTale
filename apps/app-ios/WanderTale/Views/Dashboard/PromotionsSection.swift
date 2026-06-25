import SwiftUI

struct PromotionsSection: View {
    @Environment(AppState.self) private var appState
    @State private var vouchers: [Promotion] = []
    @State private var posts: [PromotionPost] = []
    @State private var selectedPost: PromotionPost?
    @State private var loading = true

    private var isPremium: Bool {
        appState.accountInfo?.profile?.is_premium == true
            || appState.accountInfo?.profile?.subscription_tier?.lowercased() == "pro"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Khám phá ưu đãi dành riêng cho bạn")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(PremiumTheme.ink)

            if loading {
                HStack {
                    Spacer()
                    ProgressView().tint(PremiumTheme.accent)
                    Spacer()
                }
                .padding(.vertical, 8)
            } else {
                if !vouchers.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        LazyHStack(spacing: 12) {
                            ForEach(vouchers) { promo in
                                PromotionVoucherCard(promo: promo, carousel: true) {
                                    await toggleSave(promo)
                                }
                            }
                        }
                        .padding(.horizontal, 2)
                        .padding(.vertical, 4)
                    }
                    .scrollClipDisabled()
                }

                if !posts.isEmpty {
                    PromotionPostMasonry(posts: posts) { post in
                        selectedPost = post
                    }
                }

                if vouchers.isEmpty && posts.isEmpty && isPremium {
                    Text("Chưa có ưu đãi mới. Quay lại sau nhé!")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(PremiumTheme.muted)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 4)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .task { await load() }
        .sheet(item: $selectedPost) { post in
            PromotionPostDetailSheet(post: post) { voucher in
                await save(voucher)
            }
        }
    }

    private func load() async {
        if let cached = appState.promotionHome {
            apply(cached)
            loading = false
        } else {
            loading = true
        }

        defer { loading = false }
        guard let payload = try? await ApiService.promotionHome() else { return }
        appState.promotionHome = payload
        apply(payload)
        RemoteImageCache.prefetch(payload.posts.map(\.cover_image_url))
    }

    private func apply(_ payload: PromotionHomePayload) {
        vouchers = payload.vouchers.isEmpty ? payload.items : payload.vouchers
        posts = payload.posts
    }

    private func toggleSave(_ promo: Promotion) async {
        if promo.is_saved == true {
            try? await ApiService.unsavePromotionVoucher(id: promo.id)
        } else {
            try? await ApiService.savePromotionVoucher(id: promo.id)
        }
        await load()
    }

    private func save(_ promo: Promotion) async {
        try? await ApiService.savePromotionVoucher(id: promo.id)
        await load()
    }
}

private struct PromotionPostMasonry: View {
    let posts: [PromotionPost]
    let onTap: (PromotionPost) -> Void

    private var columns: (left: [PromotionPost], right: [PromotionPost]) {
        PromotionMasonryLayout.columns(for: posts)
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            columnView(columns.left)
                .frame(minWidth: 0, maxWidth: .infinity)
            columnView(columns.right)
                .frame(minWidth: 0, maxWidth: .infinity)
        }
    }

    @ViewBuilder
    private func columnView(_ posts: [PromotionPost]) -> some View {
        VStack(spacing: 12) {
            ForEach(posts) { post in
                PromotionPostCard(post: post)
                    .onTapGesture { onTap(post) }
            }
        }
    }
}

private enum PromotionMasonryLayout {
    static func columns(for posts: [PromotionPost], spacing: CGFloat = 0.08) -> (left: [PromotionPost], right: [PromotionPost]) {
        guard !posts.isEmpty else { return ([], []) }

        let mains = posts.filter { $0.post_type == "main" }
        let secondaries = posts.filter { $0.post_type != "main" }

        var left: [PromotionPost] = []
        var right: [PromotionPost] = []
        var leftHeight: CGFloat = 0
        var rightHeight: CGFloat = 0

        func itemHeight(_ post: PromotionPost) -> CGFloat {
            post.post_type == "main" ? 4.0 / 3.0 : 1.0
        }

        func place(_ post: PromotionPost, onLeft: Bool) {
            if onLeft {
                if !left.isEmpty { leftHeight += spacing }
                left.append(post)
                leftHeight += itemHeight(post)
            } else {
                if !right.isEmpty { rightHeight += spacing }
                right.append(post)
                rightHeight += itemHeight(post)
            }
        }

        func placeInShortestColumn(_ post: PromotionPost) {
            place(post, onLeft: leftHeight <= rightHeight)
        }

        if secondaries.isEmpty {
            for post in mains {
                placeInShortestColumn(post)
            }
            return (left, right)
        }

        // 1:1 đầu tiên luôn cố định góc phải trên
        place(secondaries[0], onLeft: false)

        for post in mains {
            placeInShortestColumn(post)
        }
        for post in secondaries.dropFirst() {
            placeInShortestColumn(post)
        }

        return (left, right)
    }
}

private struct PromotionPostCard: View {
    let post: PromotionPost

    private var cardAspectRatio: CGFloat {
        post.post_type == "main" ? 3.0 / 4.0 : 1.0
    }

    var body: some View {
        Color.clear
            .aspectRatio(cardAspectRatio, contentMode: .fit)
            .frame(maxWidth: .infinity)
            .overlay {
                RemoteImage(url: post.cover_image_url, fallback: post.title, contentMode: .fill)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .clipShape(RoundedRectangle(cornerRadius: 18))
            .contentShape(RoundedRectangle(cornerRadius: 18))
    }
}

private struct PromotionPostDetailSheet: View {
    let post: PromotionPost
    let onSave: (Promotion) async -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    let imageRatio = post.post_type == "main" ? 3.0 / 4.0 : 1.0
                    Color.clear
                        .aspectRatio(imageRatio, contentMode: .fit)
                        .frame(maxWidth: .infinity)
                        .overlay {
                            RemoteImage(url: post.cover_image_url, fallback: post.title, contentMode: .fill)
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 18))

                    VStack(alignment: .leading, spacing: 8) {
                        Text(post.title)
                            .font(.system(size: 26, weight: .bold))
                            .foregroundStyle(PremiumTheme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        if let subtitle = post.subtitle, !subtitle.isEmpty {
                            Text(subtitle)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(PremiumTheme.muted)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    if let body = post.body, !body.isEmpty {
                        Text(body)
                            .font(.system(size: 15))
                            .foregroundStyle(PremiumTheme.ink.opacity(0.86))
                            .lineSpacing(4)
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    if let voucher = post.voucher {
                        PromotionVoucherCard(promo: voucher) {
                            await onSave(voucher)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20)
            }
            .scrollIndicators(.hidden)
            .background(PremiumTheme.bg.ignoresSafeArea())
            .navigationTitle("Ưu đãi")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Đóng") { dismiss() }
                }
            }
        }
    }
}
