import SwiftUI

struct LocationDetailView: View {
    let locationId: String
    var tripId: String?

    @Environment(\.dismiss) private var dismiss
    @State private var detail: LocationDetail?
    @State private var reviews: [LocationReview] = []
    @State private var loading = true
    @State private var error: String?

    @State private var showReviewSheet = false
    @State private var booking: BookingRecord?
    @State private var payResponse: BookingPayResponse?
    @State private var booked = false
    @State private var bookingInProgress = false

    var body: some View {
        ScrollView {
            if loading && detail == nil {
                ProgressView().padding(.top, 80)
            } else if let detail {
                content(detail)
            } else if let error {
                Text(error).foregroundStyle(.red).padding()
            }
        }
        .scrollIndicators(.hidden)
        .background(Color.white)
        .navigationTitle(detail?.name ?? "Địa điểm")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .sheet(isPresented: $showReviewSheet) {
            AddReviewSheet(locationId: locationId) {
                Task { await loadReviews() }
            }
        }
        .sheet(item: $payResponse) { resp in
            BookingPaymentSheet(response: resp) {
                payResponse = nil
            }
        }
        .alert("Đặt chỗ thành công", isPresented: $booked) {
            Button("OK") { }
        } message: {
            Text("Bạn đã đặt chỗ (trả sau). Vui lòng thanh toán tại địa điểm.")
        }
    }

    @ViewBuilder
    private func content(_ d: LocationDetail) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            if !d.images.isEmpty {
                ImageCarousel(images: d.images, alt: d.name, fallback: String(d.name.prefix(1)))
                    .frame(height: 230)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            } else {
                RemoteImage(url: nil, fallback: d.name)
                    .frame(height: 180)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            }

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(d.name).font(.system(size: 22, weight: .bold))
                    if d.voucher != nil {
                        Text("Ưu đãi").font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 8).padding(.vertical, 3)
                            .background(PremiumTheme.accent).clipShape(Capsule())
                    }
                }
                HStack(spacing: 10) {
                    if d.rating_count > 0 {
                        Label(String(format: "%.1f (%d)", d.rating_avg, d.rating_count), systemImage: "star.fill")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(.orange)
                    }
                    if let cat = d.category, !cat.isEmpty {
                        Text(cat).font(.system(size: 13)).foregroundStyle(PremiumTheme.muted)
                    }
                }
                if let addr = d.address, !addr.isEmpty {
                    Label(addr, systemImage: "mappin.and.ellipse")
                        .font(.system(size: 13)).foregroundStyle(PremiumTheme.muted)
                }
            }

            priceBlock(d)

            if let desc = d.description, !desc.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Giới thiệu").font(.system(size: 16, weight: .semibold))
                    Text(desc).font(.system(size: 14)).foregroundStyle(PremiumTheme.ink)
                }
            }

            bookingButtons(d)

            reviewsBlock()
        }
        .padding(PremiumTheme.screenPadding)
    }

    @ViewBuilder
    private func priceBlock(_ d: LocationDetail) -> some View {
        if let price = d.price_vnd, price > 0 {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                if let v = d.voucher {
                    Text(FormatUtils.formatVnd(price))
                        .font(.system(size: 15))
                        .strikethrough()
                        .foregroundStyle(PremiumTheme.muted)
                    Text(FormatUtils.formatVnd(v.final_price_vnd))
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(PremiumTheme.accent)
                    Text("\(v.code)").font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(PremiumTheme.accent)
                } else {
                    Text(FormatUtils.formatVnd(price))
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(PremiumTheme.accent)
                }
            }
        }
    }

    private var effectivePrice: Double {
        guard let d = detail else { return 0 }
        if let v = d.voucher { return v.final_price_vnd }
        return d.price_vnd ?? 0
    }

    @ViewBuilder
    private func bookingButtons(_ d: LocationDetail) -> some View {
        if (d.price_vnd ?? 0) > 0 {
            VStack(spacing: 10) {
                Button {
                    Task { await book(mode: "prepaid", d: d) }
                } label: {
                    HStack {
                        if bookingInProgress { ProgressView().tint(.white) }
                        VStack(spacing: 1) {
                            Text("Đặt & thanh toán trước").font(.system(size: 15, weight: .bold))
                            Text(FormatUtils.formatVnd(effectivePrice) + (d.voucher != nil ? " (đã giảm)" : ""))
                                .font(.system(size: 12, weight: .medium)).opacity(0.9)
                        }
                    }
                    .foregroundStyle(.white).frame(maxWidth: .infinity).frame(height: 54)
                    .background(PremiumTheme.accent).clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(bookingInProgress)

                Button {
                    Task { await book(mode: "pay_later", d: d) }
                } label: {
                    VStack(spacing: 1) {
                        Text("Đặt chỗ, trả sau").font(.system(size: 15, weight: .semibold))
                        Text(FormatUtils.formatVnd(d.price_vnd) + " (giá niêm yết)")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundStyle(PremiumTheme.accent)
                    .frame(maxWidth: .infinity).frame(height: 54)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(PremiumTheme.accent))
                }
                .disabled(bookingInProgress)

                if d.voucher != nil {
                    Text("Ưu đãi \(d.voucher!.code) chỉ áp dụng khi thanh toán trước.")
                        .font(.system(size: 12)).foregroundStyle(PremiumTheme.muted)
                        .frame(maxWidth: .infinity, alignment: .center)
                }
            }
        }
    }

    @ViewBuilder
    private func reviewsBlock() -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Đánh giá").font(.system(size: 16, weight: .semibold))
                Spacer()
                Button("Viết đánh giá") { showReviewSheet = true }
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(PremiumTheme.accent)
            }
            if reviews.isEmpty {
                Text("Chưa có đánh giá. Hãy là người đầu tiên!")
                    .font(.system(size: 13)).foregroundStyle(PremiumTheme.muted)
            } else {
                ForEach(reviews) { r in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 2) {
                            ForEach(0..<5) { i in
                                Image(systemName: i < r.rating ? "star.fill" : "star")
                                    .font(.system(size: 11)).foregroundStyle(.orange)
                            }
                        }
                        if let c = r.comment, !c.isEmpty {
                            Text(c).font(.system(size: 14)).foregroundStyle(PremiumTheme.ink)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(PremiumTheme.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }

    private func load() async {
        loading = true
        async let d = ApiService.locationDetail(id: locationId)
        async let r = ApiService.locationReviews(id: locationId)
        do {
            detail = try await d
            reviews = (try? await r)?.items ?? []
        } catch {
            self.error = formatApiError(error, fallback: "Không tải được địa điểm")
        }
        loading = false
    }

    private func loadReviews() async {
        reviews = (try? await ApiService.locationReviews(id: locationId))?.items ?? []
        detail = try? await ApiService.locationDetail(id: locationId)
    }

    private func book(mode: String, d: LocationDetail) async {
        bookingInProgress = true
        defer { bookingInProgress = false }
        // Voucher chỉ áp khi thanh toán trước; trả sau dùng giá niêm yết.
        let amount: Double = (mode == "prepaid") ? effectivePrice : (d.price_vnd ?? 0)
        do {
            let input = BookingCreate(
                business_id: d.business_id,
                total_amount: amount,
                type: "location",
                trip_id: tripId,
                location_id: d.id,
                currency: "VND",
                payment_mode: mode
            )
            let created = try await ApiService.createBooking(input)
            booking = created
            if mode == "prepaid" {
                let pay = try await ApiService.payBooking(id: created.id)
                if pay.checkout_url != nil || pay.qr_code != nil {
                    payResponse = pay
                } else {
                    booked = true
                }
            } else {
                booked = true
            }
        } catch {
            self.error = formatApiError(error, fallback: "Không đặt được chỗ")
        }
    }
}

private struct AddReviewSheet: View {
    let locationId: String
    let onDone: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var rating = 5
    @State private var comment = ""
    @State private var submitting = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("Chấm điểm").font(.system(size: 15, weight: .semibold))
                HStack(spacing: 8) {
                    ForEach(1...5, id: \.self) { i in
                        Image(systemName: i <= rating ? "star.fill" : "star")
                            .font(.system(size: 26)).foregroundStyle(.orange)
                            .onTapGesture { rating = i }
                    }
                }
                Text("Bình luận").font(.system(size: 15, weight: .semibold))
                TextField("Cảm nhận của bạn về địa điểm…", text: $comment, axis: .vertical)
                    .lineLimit(3...6)
                    .padding(12)
                    .background(PremiumTheme.inputBg)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                Button {
                    Task {
                        submitting = true
                        _ = try? await ApiService.createLocationReview(id: locationId, rating: rating, comment: comment)
                        submitting = false
                        onDone()
                        dismiss()
                    }
                } label: {
                    Text(submitting ? "Đang gửi…" : "Gửi đánh giá")
                        .font(.system(size: 15, weight: .bold)).foregroundStyle(.white)
                        .frame(maxWidth: .infinity).frame(height: 48)
                        .background(PremiumTheme.accent).clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(submitting)
                Spacer()
            }
            .padding(PremiumTheme.screenPadding)
            .navigationTitle("Viết đánh giá")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Đóng") { dismiss() } } }
        }
    }
}

struct SponsoredLocationCard: View {
    let location: SponsoredLocation

    var body: some View {
        HStack(spacing: 12) {
            RemoteImage(url: location.image_url, fallback: location.name, contentMode: .fill)
                .frame(width: 88, height: 88)
                .clipShape(RoundedRectangle(cornerRadius: 12))

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(location.name)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(PremiumTheme.ink)
                        .lineLimit(1)
                    Text("Tài trợ")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(PremiumTheme.accent).clipShape(Capsule())
                }
                if let cat = location.category, !cat.isEmpty {
                    Text(cat).font(.system(size: 12)).foregroundStyle(PremiumTheme.muted).lineLimit(1)
                }
                if location.rating_count > 0 {
                    Label(String(format: "%.1f (%d)", location.rating_avg, location.rating_count), systemImage: "star.fill")
                        .font(.system(size: 11, weight: .semibold)).foregroundStyle(.orange)
                }
                if let price = location.price_vnd, price > 0 {
                    HStack(spacing: 6) {
                        if let v = location.voucher {
                            Text(FormatUtils.formatVnd(price)).font(.system(size: 12)).strikethrough().foregroundStyle(PremiumTheme.muted)
                            Text(FormatUtils.formatVnd(v.final_price_vnd)).font(.system(size: 15, weight: .bold)).foregroundStyle(PremiumTheme.accent)
                        } else {
                            Text(FormatUtils.formatVnd(price)).font(.system(size: 15, weight: .bold)).foregroundStyle(PremiumTheme.accent)
                        }
                    }
                }
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(PremiumTheme.muted)
        }
        .padding(12)
        .background(PremiumTheme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(PremiumTheme.accent.opacity(0.3)))
    }
}
