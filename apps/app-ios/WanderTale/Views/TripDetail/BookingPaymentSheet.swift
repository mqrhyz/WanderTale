import SwiftUI
import CoreImage.CIFilterBuiltins
import UIKit

/// Sheet thanh toán booking trong app (QR PayOS) + auto chờ xác nhận.
struct BookingPaymentSheet: View {
    let response: BookingPayResponse
    let onDone: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var activated = false
    @State private var pollTask: Task<Void, Never>?
    @State private var pollTimedOut = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if activated {
                        VStack(spacing: 12) {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 48))
                                .foregroundStyle(PremiumTheme.statDestIcon)
                            Text("Thanh toán thành công!")
                                .font(.system(size: 18, weight: .bold))
                        }
                        .padding(.top, 20)
                    } else {
                        Text("Thanh toán đặt chỗ")
                            .font(.system(size: 18, weight: .bold))

                        if let qr = response.qr_code, let img = qrImage(from: qr) {
                            Image(uiImage: img)
                                .interpolation(.none).resizable()
                                .frame(width: 200, height: 200)
                                .background(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            if let acc = response.account_number { infoRow("Số tài khoản", acc) }
                            if let name = response.account_name { infoRow("Chủ tài khoản", name) }
                            infoRow("Số tiền", FormatUtils.formatVnd(response.amount))
                            if let content = response.transfer_content { infoRow("Nội dung CK", content) }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(14)
                        .background(PremiumTheme.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(PremiumTheme.border))

                        Text("Quét QR hoặc chuyển khoản. Đặt chỗ xác nhận khi thanh toán thành công.")
                            .font(.system(size: 13))
                            .foregroundStyle(PremiumTheme.muted)
                            .multilineTextAlignment(.center)

                        if pollTimedOut {
                            Text("Xác nhận chậm hơn dự kiến. Kiểm tra lại lịch sử đặt chỗ sau ít phút.")
                                .font(.system(size: 13))
                                .foregroundStyle(PremiumTheme.muted)
                                .multilineTextAlignment(.center)
                                .padding(12)
                                .frame(maxWidth: .infinity)
                                .background(PremiumTheme.surface)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        } else {
                            HStack(spacing: 8) {
                                ProgressView().tint(PremiumTheme.accent).scaleEffect(0.8)
                                Text("Đang chờ xác nhận thanh toán…")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(PremiumTheme.accent)
                            }
                            .frame(maxWidth: .infinity).frame(height: 44)
                            .background(PremiumTheme.accentLight)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                }
                .padding(PremiumTheme.screenPadding)
            }
            .background(Color.white)
            .navigationTitle("Thanh toán")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Xong") {
                        if activated {
                            onDone()
                        }
                        dismiss()
                    }
                }
            }
            .task { startPolling() }
            .onDisappear { pollTask?.cancel() }
        }
    }

    private func startPolling() {
        let bookingId = response.booking_id
        pollTask?.cancel()
        pollTask = Task {
            let deadline = Date().addingTimeInterval(15 * 60) // 15 phút timeout
            var attempts = 0
            while !Task.isCancelled && !activated && Date() < deadline {
                try? await Task.sleep(nanoseconds: 4_000_000_000)
                if Task.isCancelled { break }
                attempts += 1
                if let b = try? await ApiService.getBooking(id: bookingId),
                   ["paid", "confirmed"].contains(b.status ?? "") {
                    await MainActor.run {
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) { activated = true }
                    }
                    break
                }
                // Sau 5 phút, hiển thị timeout hint
                if attempts == 75 {
                    await MainActor.run { pollTimedOut = true }
                }
            }
        }
    }

    private func infoRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.system(size: 13)).foregroundStyle(PremiumTheme.textMuted)
            Spacer()
            Text(value).font(.system(size: 14, weight: .semibold)).foregroundStyle(PremiumTheme.ink).textSelection(.enabled)
        }
    }

    private static let ciContext = CIContext()

    private func qrImage(from string: String) -> UIImage? {
        let context = Self.ciContext
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        guard let output = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 8, y: 8)),
              let cg = context.createCGImage(output, from: output.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}
