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
                    }
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
        loading = true
        defer { loading = false }
        guard let payload = try? await ApiService.promotionHome() else { return }
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

    private var primary: [PromotionPost] {
        posts.filter { $0.post_type == "main" }
    }

    private var secondary: [PromotionPost] {
        posts.filter { $0.post_type != "main" }
    }

    var body: some View {
        if primary.isEmpty || secondary.isEmpty {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(posts) { post in
                    PromotionPostCard(post: post)
                        .onTapGesture { onTap(post) }
                }
            }
        } else {
            HStack(alignment: .top, spacing: 12) {
                VStack(spacing: 12) {
                    ForEach(primary) { post in
                        PromotionPostCard(post: post)
                            .onTapGesture { onTap(post) }
                    }
                }
                .frame(maxWidth: .infinity)
                VStack(spacing: 12) {
                    ForEach(secondary) { post in
                        PromotionPostCard(post: post)
                            .onTapGesture { onTap(post) }
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
    }
}

private struct PromotionPostCard: View {
    let post: PromotionPost

    var body: some View {
        let isMain = post.post_type == "main"
        ZStack(alignment: .bottomLeading) {
            RemoteImage(url: post.cover_image_url, fallback: post.title, contentMode: .fill)
                .frame(maxWidth: .infinity)
                .aspectRatio(isMain ? 3.0 / 4.0 : 1.0, contentMode: .fit)
                .clipped()
            LinearGradient(
                colors: [.clear, .black.opacity(0.68)],
                startPoint: .center,
                endPoint: .bottom
            )
            VStack(alignment: .leading, spacing: 6) {
                if post.voucher != nil {
                    Text("Có voucher")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(PremiumTheme.accent)
                        .clipShape(Capsule())
                }
                Text(post.title)
                    .font(.system(size: isMain ? 22 : 18, weight: .bold))
                    .foregroundStyle(.white)
                    .lineLimit(2)
                if let subtitle = post.subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(.white.opacity(0.86))
                        .lineLimit(2)
                }
            }
            .padding(16)
        }
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(PremiumTheme.border))
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
                    RemoteImage(url: post.cover_image_url, fallback: post.title, contentMode: .fill)
                        .frame(maxWidth: .infinity)
                        .aspectRatio(post.post_type == "main" ? 3.0 / 4.0 : 1.0, contentMode: .fit)
                        .clipShape(RoundedRectangle(cornerRadius: 18))

                    VStack(alignment: .leading, spacing: 8) {
                        Text(post.title)
                            .font(.system(size: 26, weight: .bold))
                            .foregroundStyle(PremiumTheme.ink)
                        if let subtitle = post.subtitle, !subtitle.isEmpty {
                            Text(subtitle)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(PremiumTheme.muted)
                        }
                    }

                    if let body = post.body, !body.isEmpty {
                        Text(body)
                            .font(.system(size: 15))
                            .foregroundStyle(PremiumTheme.ink.opacity(0.86))
                            .lineSpacing(4)
                    }

                    if let voucher = post.voucher {
                        PromotionVoucherCard(promo: voucher) {
                            await onSave(voucher)
                        }
                    }
                }
                .padding(20)
            }
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
