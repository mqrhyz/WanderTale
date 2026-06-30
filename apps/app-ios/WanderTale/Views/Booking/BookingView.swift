import SwiftUI
import CoreImage.CIFilterBuiltins
import UIKit

/// User booking + payment flow with IN-APP PayOS payment (QR + bank transfer).
/// Pick a real active business -> enter amount -> create booking -> pay ->
/// show PayOS QR + account info in-app -> poll booking status until paid.
struct BookingView: View {
    @State private var businesses: [PublicBusinessRow] = []
    @State private var loading = true
    @State private var error: String?
    @State private var selected: PublicBusinessRow?
    @State private var amount = ""
    @State private var working = false
    @State private var message: String?
    @State private var currentBookingId: String?
    @State private var payInfo: BookingPayResponse?
    @State private var bookingStatus: String?
    @State private var pollTask: Task<Void, Never>?
    @Environment(\.openURL) private var openURL
    @Environment(AppState.self) private var appState

    var body: some View {
        ScrollView {
            if loading {
                ProgressView().padding(.top, 60)
            } else if let error {
                Text(error).foregroundStyle(.red).padding()
            } else if let info = payInfo {
                paymentDetail(info)
            } else {
                pickerContent
            }
        }
        .background(PremiumTheme.bg)
        .navigationTitle("Đặt chỗ & thanh toán")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .onDisappear { pollTask?.cancel() }
    }

    // MARK: - Business picker + amount

    private var pickerContent: some View {
        VStack(alignment: .leading, spacing: 14) {
            if let message {
                Text(message).font(.system(size: 13, weight: .medium)).foregroundStyle(PremiumTheme.accent)
            }
            if businesses.isEmpty {
                Text("Chưa có doanh nghiệp nào đang hoạt động để đặt chỗ.")
                    .font(.system(size: 14)).foregroundStyle(PremiumTheme.textMuted)
            } else {
                Text("Chọn doanh nghiệp").font(.system(size: 16, weight: .semibold))
                ForEach(businesses) { biz in businessRow(biz) }
            }
            if let biz = selected {
                PremiumSurfaceCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Đặt chỗ tại \(biz.name ?? "doanh nghiệp")")
                            .font(.system(size: 15, weight: .semibold))
                        TextField("Số tiền (VND)", text: $amount)
                            .keyboardType(.numberPad)
                            .padding(12)
                            .background(PremiumTheme.inputBg)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        Button {
                            Task { await payNow(biz) }
                        } label: {
                            Text(working ? "Đang tạo thanh toán…" : "Thanh toán")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity).frame(height: 48)
                                .background(PremiumTheme.accent)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .disabled(working)
                    }
                }
            }
        }
        .padding(PremiumTheme.screenPadding)
    }

    private func businessRow(_ biz: PublicBusinessRow) -> some View {
        Button { selected = biz } label: {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text(biz.name ?? "Doanh nghiệp").font(.system(size: 15, weight: .semibold)).foregroundStyle(PremiumTheme.ink)
                    Text([biz.business_type, biz.region].compactMap { $0 }.joined(separator: " · "))
                        .font(.system(size: 12)).foregroundStyle(PremiumTheme.textMuted)
                }
                Spacer()
                Text("★ \(String(format: "%.1f", biz.rating_avg ?? 0))").font(.system(size: 12, weight: .semibold)).foregroundStyle(PremiumTheme.accent)
            }
            .padding(14)
            .background(selected?.id == biz.id ? PremiumTheme.accentLight : PremiumTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(selected?.id == biz.id ? PremiumTheme.accent : PremiumTheme.border))
        }
        .buttonStyle(.plain)
    }

    // MARK: - In-app PayOS payment detail

    @ViewBuilder
    private func paymentDetail(_ info: BookingPayResponse) -> some View {
        let paid = ["paid", "confirmed"].contains(bookingStatus ?? "")
        VStack(spacing: 16) {
            if paid {
                VStack(spacing: 10) {
                    Image(systemName: "checkmark.seal.fill").font(.system(size: 48)).foregroundStyle(PremiumTheme.statDestIcon)
                    Text("Thanh toán thành công").font(.system(size: 18, weight: .bold))
                    Text("Booking đã được xác nhận.").font(.system(size: 14)).foregroundStyle(PremiumTheme.muted)
                    Button("Xong") { resetFlow() }
                        .font(.system(size: 15, weight: .semibold)).foregroundStyle(.white)
                        .frame(maxWidth: .infinity).frame(height: 48)
                        .background(PremiumTheme.accent).clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(20)
            } else {
                Text("Quét QR hoặc chuyển khoản để thanh toán")
                    .font(.system(size: 15, weight: .semibold))
                    .multilineTextAlignment(.center)

                if let qr = info.qr_code, let img = qrImage(from: qr) {
                    Image(uiImage: img)
                        .interpolation(.none)
                        .resizable()
                        .frame(width: 220, height: 220)
                        .background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                PremiumSurfaceCard {
                    VStack(alignment: .leading, spacing: 10) {
                        infoLine("Số tiền", FormatUtils.formatVnd(info.amount))
                        if let acc = info.account_number { infoLine("Số tài khoản", acc) }
                        if let name = info.account_name { infoLine("Chủ tài khoản", name) }
                        if let content = info.transfer_content { infoLine("Nội dung CK", content) }
                    }
                }

                HStack(spacing: 10) {
                    ProgressView().tint(PremiumTheme.accent)
                    Text("Đang chờ thanh toán… tự cập nhật khi hoàn tất.")
                        .font(.system(size: 13)).foregroundStyle(PremiumTheme.muted)
                }

                Button("Kiểm tra ngay") { Task { await pollOnce() } }
                    .font(.system(size: 14, weight: .medium)).foregroundStyle(PremiumTheme.accent)

                if let url = info.checkout_url, let link = URL(string: url) {
                    Button("Mở trang PayOS (nếu cần)") { openURL(link) }
                        .font(.system(size: 13)).foregroundStyle(PremiumTheme.textMuted)
                }

                Button("Huỷ") { resetFlow() }
                    .font(.system(size: 13)).foregroundStyle(PremiumTheme.logoutRed)
            }
        }
        .padding(PremiumTheme.screenPadding)
        .frame(maxWidth: .infinity)
    }

    private func infoLine(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.system(size: 13)).foregroundStyle(PremiumTheme.textMuted)
            Spacer()
            Text(value).font(.system(size: 14, weight: .semibold)).foregroundStyle(PremiumTheme.ink)
                .textSelection(.enabled)
        }
    }

    private func qrImage(from string: String) -> UIImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 10, y: 10)),
              let cg = context.createCGImage(output, from: output.extent) else { return nil }
        return UIImage(cgImage: cg)
    }

    // MARK: - Actions

    private func load() async {
        loading = true
        do {
            businesses = try await ApiService.listBusinesses().items
        } catch {
            self.error = formatApiError(error, fallback: "Không tải được danh sách doanh nghiệp")
        }
        loading = false
    }

    private func payNow(_ biz: PublicBusinessRow) async {
        guard let amt = Double(amount.filter(\.isNumber)), amt > 0 else {
            message = "Nhập số tiền hợp lệ."
            return
        }
        working = true
        message = nil
        defer { working = false }
        do {
            let booking = try await ApiService.createBooking(BookingCreate(business_id: biz.id, total_amount: amt, type: "other", trip_id: nil, location_id: nil, currency: nil))
            appState.invalidateMyBookingsCache()
            currentBookingId = booking.id
            let pay = try await ApiService.payBooking(id: booking.id)
            bookingStatus = pay.status
            if pay.provider == "payos", pay.qr_code != nil || pay.checkout_url != nil {
                payInfo = pay
                startPolling()
            } else {
                // Simulation mode: already paid.
                bookingStatus = pay.status
                payInfo = pay
            }
        } catch {
            message = formatApiError(error, fallback: "Không thể tạo thanh toán")
        }
    }

    private func startPolling() {
        pollTask?.cancel()
        pollTask = Task {
            for _ in 0..<150 { // ~10 phút (4s * 150)
                try? await Task.sleep(for: .seconds(4))
                if Task.isCancelled { return }
                await pollOnce()
                if ["paid", "confirmed"].contains(bookingStatus ?? "") { return }
            }
        }
    }

    private func pollOnce() async {
        guard let id = currentBookingId else { return }
        if let booking = try? await ApiService.getBooking(id: id) {
            bookingStatus = booking.status
        }
    }

    private func resetFlow() {
        pollTask?.cancel()
        payInfo = nil
        currentBookingId = nil
        bookingStatus = nil
        amount = ""
        selected = nil
        message = nil
    }
}
