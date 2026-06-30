import SwiftUI

struct LocationDetailView: View {
    let locationId: String
    var tripId: String?

    @Environment(AppState.self) private var appState
    @State private var detail: LocationDetail?
    @State private var reviews: [LocationReview] = []
    @State private var loading = true
    @State private var error: String?

    @State private var showReviewSheet = false
    @State private var formMode: String?
    @State private var payResponse: BookingPayResponse?
    @State private var booked = false
    @State private var receiptBookingId: String?

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
            AddReviewSheet(locationId: locationId) { Task { await loadReviews() } }
        }
        .sheet(item: $formMode.asIdentifiable) { wrapper in
            if let d = detail {
                BookingFormSheet(
                    detail: d,
                    mode: wrapper.value,
                    tripId: tripId,
                    defaultName: appState.accountInfo?.displayName ?? appState.displayName,
                    defaultPhone: appState.accountInfo?.phone ?? "",
                    onPay: { resp in formMode = nil; payResponse = resp },
                    onPaidLater: { bookingId in formMode = nil; receiptBookingId = bookingId }
                )
            }
        }
        .sheet(item: $payResponse) { resp in
            BookingPaymentSheet(response: resp, onDone: {
                // onDone chỉ được gọi khi activated = true (payment confirmed)
                receiptBookingId = resp.booking_id
                payResponse = nil
            })
        }
        .sheet(item: $receiptBookingId.asIdentifiable) { wrapper in
            BookingReceiptView(bookingId: wrapper.value)
        }
        .alert("Đặt chỗ thành công", isPresented: $booked) {
            Button("OK") { }
        } message: {
            Text("Bạn đã đặt chỗ (trả sau). Vui lòng thanh toán tại địa điểm. Xem ở mục Đặt chỗ.")
        }
    }

    @ViewBuilder
    private func content(_ d: LocationDetail) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            ZStack {
                if d.images.isEmpty {
                    RemoteImage(url: nil, fallback: d.name, contentMode: .fill)
                } else if d.images.count == 1 {
                    RemoteImage(url: d.images[0], fallback: d.name, contentMode: .fill)
                } else {
                    TabView {
                        ForEach(d.images, id: \.self) { url in
                            RemoteImage(url: url, fallback: d.name, contentMode: .fill)
                                .clipped()
                        }
                    }
                    .tabViewStyle(.page(indexDisplayMode: .automatic))
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 240)
            .clipped()
            .clipShape(RoundedRectangle(cornerRadius: 16))

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(d.name).font(.system(size: 22, weight: .bold))
                    if !d.vouchers.isEmpty {
                        Text("Ưu đãi").font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 8).padding(.vertical, 3)
                            .background(PremiumTheme.accent).clipShape(Capsule())
                    }
                }
                HStack(spacing: 10) {
                    if d.rating_count > 0 {
                        Label(String(format: "%.1f (%d)", d.rating_avg, d.rating_count), systemImage: "star.fill")
                            .font(.system(size: 13, weight: .semibold)).foregroundStyle(.orange)
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
                    Text(FormatUtils.formatVnd(price)).font(.system(size: 15)).strikethrough().foregroundStyle(PremiumTheme.muted)
                    Text(FormatUtils.formatVnd(v.final_price_vnd)).font(.system(size: 22, weight: .bold)).foregroundStyle(PremiumTheme.accent)
                } else {
                    Text(FormatUtils.formatVnd(price)).font(.system(size: 22, weight: .bold)).foregroundStyle(PremiumTheme.accent)
                }
            }
        }
    }

    @ViewBuilder
    private func bookingButtons(_ d: LocationDetail) -> some View {
        if (d.price_vnd ?? 0) > 0 {
            VStack(spacing: 10) {
                Button { formMode = "prepaid" } label: {
                    Text("Đặt & thanh toán trước")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white).frame(maxWidth: .infinity).frame(height: 50)
                        .background(PremiumTheme.accent).clipShape(RoundedRectangle(cornerRadius: 12))
                }
                Button { formMode = "pay_later" } label: {
                    Text("Đặt chỗ, trả sau")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(PremiumTheme.accent).frame(maxWidth: .infinity).frame(height: 50)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(PremiumTheme.accent))
                }
                if !d.vouchers.isEmpty {
                    Text("Có ưu đãi khi thanh toán trước — chọn mã ở bước thanh toán.")
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
                    .font(.system(size: 13, weight: .semibold)).foregroundStyle(PremiumTheme.accent)
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
                    .padding(12).background(PremiumTheme.surface).clipShape(RoundedRectangle(cornerRadius: 12))
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
    }
}

// MARK: - Booking form (auto-fill user info + voucher picker)

private struct BookingFormSheet: View {
    let detail: LocationDetail
    let mode: String
    let tripId: String?
    let defaultName: String
    let defaultPhone: String
    let onPay: (BookingPayResponse) -> Void
    let onPaidLater: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var appState
    @State private var name = ""
    @State private var phone = ""
    @State private var note = ""
    @State private var selectedVoucherId: String?
    @State private var working = false
    @State private var error: String?

    private var isPrepaid: Bool { mode == "prepaid" }

    private var selectedVoucher: AppliedVoucher? {
        guard isPrepaid, let id = selectedVoucherId else { return nil }
        return detail.vouchers.first { $0.id == id }
    }

    private var finalPrice: Double {
        let base = detail.price_vnd ?? 0
        if let v = selectedVoucher { return v.final_price_vnd }
        return base
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text(detail.name).font(.system(size: 18, weight: .bold))

                    field("Họ tên", text: $name, placeholder: "Tên người đặt")
                    field("Số điện thoại", text: $phone, placeholder: "SĐT liên hệ", keyboard: .phonePad)
                    field("Ghi chú (tuỳ chọn)", text: $note, placeholder: "Yêu cầu thêm…")

                    if isPrepaid && !detail.vouchers.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Chọn ưu đãi").font(.system(size: 14, weight: .semibold))
                            voucherOption(nil)
                            ForEach(detail.vouchers, id: \.id) { v in voucherOption(v) }
                        }
                    }

                    priceSummary

                    if let error {
                        Text(error).font(.system(size: 13)).foregroundStyle(PremiumTheme.logoutRed)
                    }

                    Button {
                        Task { await submit() }
                    } label: {
                        HStack(spacing: 8) {
                            if working { ProgressView().tint(.white) }
                            Text(isPrepaid ? "Thanh toán \(FormatUtils.formatVnd(finalPrice))" : "Xác nhận đặt chỗ")
                                .font(.system(size: 16, weight: .bold))
                        }
                        .foregroundStyle(.white).frame(maxWidth: .infinity).frame(height: 50)
                        .background(canSubmit ? PremiumTheme.accent : PremiumTheme.accent.opacity(0.5))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .disabled(!canSubmit || working)
                }
                .padding(PremiumTheme.screenPadding)
            }
            .background(Color.white)
            .navigationTitle(isPrepaid ? "Thanh toán trước" : "Đặt chỗ, trả sau")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Đóng") { dismiss() } } }
            .onAppear {
                if name.isEmpty { name = defaultName }
                if phone.isEmpty { phone = defaultPhone }
                if isPrepaid { selectedVoucherId = detail.voucher?.id }
            }
        }
    }

    private var canSubmit: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty && finalPrice > 0
    }

    private var priceSummary: some View {
        VStack(spacing: 6) {
            if let base = detail.price_vnd, selectedVoucher != nil {
                HStack { Text("Giá niêm yết"); Spacer(); Text(FormatUtils.formatVnd(base)).strikethrough() }
                    .font(.system(size: 13)).foregroundStyle(PremiumTheme.muted)
                HStack { Text("Ưu đãi \(selectedVoucher!.code)"); Spacer(); Text("-\(FormatUtils.formatVnd(selectedVoucher!.discount_vnd))") }
                    .font(.system(size: 13)).foregroundStyle(PremiumTheme.accent)
            }
            HStack {
                Text("Tổng thanh toán").font(.system(size: 15, weight: .semibold))
                Spacer()
                Text(FormatUtils.formatVnd(finalPrice)).font(.system(size: 18, weight: .bold)).foregroundStyle(PremiumTheme.accent)
            }
        }
        .padding(12).background(PremiumTheme.surface).clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func voucherOption(_ v: AppliedVoucher?) -> some View {
        let selected = (v?.id ?? nil) == selectedVoucherId || (v == nil && selectedVoucherId == nil)
        return Button {
            selectedVoucherId = v?.id
        } label: {
            HStack {
                Image(systemName: selected ? "largecircle.fill.circle" : "circle")
                    .foregroundStyle(selected ? PremiumTheme.accent : PremiumTheme.muted)
                VStack(alignment: .leading, spacing: 2) {
                    Text(v == nil ? "Không dùng ưu đãi" : "\(v!.code) — \(v!.title)")
                        .font(.system(size: 14, weight: .semibold)).foregroundStyle(PremiumTheme.ink)
                    if let v { Text("Giảm \(FormatUtils.formatVnd(v.discount_vnd))").font(.system(size: 12)).foregroundStyle(PremiumTheme.accent) }
                }
                Spacer()
            }
            .padding(10)
            .background(selected ? PremiumTheme.accentLight : PremiumTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(selected ? PremiumTheme.accent : PremiumTheme.border))
        }
        .buttonStyle(.plain)
    }

    private func submit() async {
        working = true
        defer { working = false }
        var meta: [String: String] = ["customer_name": name.trimmingCharacters(in: .whitespaces)]
        if !phone.isEmpty { meta["phone"] = phone }
        if !note.isEmpty { meta["note"] = note }
        if let v = selectedVoucher { meta["voucher_code"] = v.code }
        do {
            let created = try await ApiService.createBooking(BookingCreate(
                business_id: detail.business_id,
                total_amount: finalPrice,
                type: "location",
                trip_id: tripId,
                location_id: detail.id,
                currency: "VND",
                payment_mode: mode,
                metadata: meta
            ))
            appState.invalidateMyBookingsCache()
            if isPrepaid {
                let pay = try await ApiService.payBooking(id: created.id)
                if pay.checkout_url != nil || pay.qr_code != nil {
                    onPay(pay)
                } else {
                    onPaidLater(created.id)
                }
            } else {
                onPaidLater(created.id)
            }
        } catch {
            self.error = formatApiError(error, fallback: "Không đặt được chỗ")
        }
    }

    private func field(_ label: String, text: Binding<String>, placeholder: String, keyboard: UIKeyboardType = .default) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.system(size: 13, weight: .semibold)).foregroundStyle(PremiumTheme.textMuted)
            TextField(placeholder, text: text)
                .keyboardType(keyboard)
                .font(.system(size: 15))
                .padding(12)
                .background(PremiumTheme.inputBg)
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
}

// Helper: present a sheet from an optional String mode.
private struct StringItem: Identifiable { var id: String { value }; let value: String }
private extension Binding where Value == String? {
    var asIdentifiable: Binding<StringItem?> {
        Binding<StringItem?>(
            get: { wrappedValue.map { StringItem(value: $0) } },
            set: { wrappedValue = $0?.value }
        )
    }
}

private struct AddReviewSheet: View {
    let locationId: String
    let onDone: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var rating = 3
    @State private var comment = ""
    @State private var submitting = false
    @State private var submitError: String?

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
                    .padding(12).background(PremiumTheme.inputBg).clipShape(RoundedRectangle(cornerRadius: 12))
                if let submitError {
                    Text(submitError)
                        .font(.system(size: 13))
                        .foregroundStyle(PremiumTheme.logoutRed)
                }
                Button {
                    Task {
                        submitting = true
                        submitError = nil
                        do {
                            _ = try await ApiService.createLocationReview(id: locationId, rating: rating, comment: comment)
                            submitting = false
                            onDone()
                            dismiss()
                        } catch {
                            submitting = false
                            submitError = "Không gửi được đánh giá. Vui lòng thử lại."
                        }
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
