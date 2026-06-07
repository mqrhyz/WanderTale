import SwiftUI
import CoreImage.CIFilterBuiltins
import UIKit

/// Trang hoá đơn/chi tiết đặt chỗ: mã QR, thông tin, trạng thái.
struct BookingReceiptView: View {
    let bookingId: String
    @Environment(\.dismiss) private var dismiss
    @State private var booking: BookingRecord?
    @State private var loading = true

    var body: some View {
        NavigationStack {
            ScrollView {
                if loading && booking == nil {
                    ProgressView().padding(.top, 80)
                } else if let b = booking {
                    receipt(b)
                }
            }
            .scrollIndicators(.hidden)
            .background(Color.white)
            .navigationTitle("Chi tiết đặt chỗ")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Đóng") { dismiss() } } }
            .task { await load() }
        }
    }

    @ViewBuilder
    private func receipt(_ b: BookingRecord) -> some View {
        VStack(spacing: 20) {
            // QR mã đặt chỗ
            let qrContent = b.code ?? String(b.id.prefix(8)).uppercased()
            if let img = qrImage(from: qrContent) {
                VStack(spacing: 8) {
                    Image(uiImage: img)
                        .interpolation(.none)
                        .resizable()
                        .frame(width: 180, height: 180)
                        .background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    Text("Mã đặt chỗ: \(qrContent)")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(PremiumTheme.accent)
                        .textSelection(.enabled)
                }
            }

            // Trạng thái
            statusBadge(b.status ?? "")

            // Thông tin
            VStack(spacing: 0) {
                infoRow("Địa điểm", b.location_name ?? "—")
                Divider()
                if let addr = b.location_address, !addr.isEmpty {
                    infoRow("Địa chỉ", addr)
                    Divider()
                }
                infoRow("Doanh nghiệp", b.business_name ?? "—")
                Divider()
                if let hotline = b.business_hotline, !hotline.isEmpty {
                    infoRow("Hotline", hotline)
                    Divider()
                }
                infoRow("Số tiền", FormatUtils.formatVnd(b.total_amount))
                Divider()
                infoRow("Phương thức", b.payment_mode == "pay_later" ? "Trả sau" : "Trả trước")
                Divider()
                infoRow("Ngày đặt", String((b.created_at ?? "").prefix(10)))
                if let meta = b.metadata {
                    if let name = meta["customer_name"], !name.isEmpty {
                        Divider()
                        infoRow("Tên khách", name)
                    }
                    if let phone = meta["phone"], !phone.isEmpty {
                        Divider()
                        infoRow("SĐT", phone)
                    }
                    if let voucher = meta["voucher_code"], !voucher.isEmpty {
                        Divider()
                        infoRow("Mã ưu đãi", voucher)
                    }
                    if let note = meta["note"], !note.isEmpty {
                        Divider()
                        infoRow("Ghi chú", note)
                    }
                }
            }
            .padding(14)
            .background(PremiumTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(PremiumTheme.border))

            Text("Xuất trình mã QR này tại quầy để xác nhận đặt chỗ.")
                .font(.system(size: 13))
                .foregroundStyle(PremiumTheme.muted)
                .multilineTextAlignment(.center)
        }
        .padding(PremiumTheme.screenPadding)
    }

    private func statusBadge(_ status: String) -> some View {
        let (label, color): (String, Color) = {
            switch status {
            case "paid": return ("Đã thanh toán", PremiumTheme.statDestIcon)
            case "confirmed": return ("Đã xác nhận", PremiumTheme.statDestIcon)
            case "pending_payment": return ("Chờ thanh toán", .orange)
            case "cancelled": return ("Đã huỷ", PremiumTheme.logoutRed)
            default: return (status, PremiumTheme.muted)
            }
        }()
        return Text(label)
            .font(.system(size: 14, weight: .bold))
            .foregroundStyle(color)
            .padding(.horizontal, 14).padding(.vertical, 6)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }

    private func infoRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.system(size: 13)).foregroundStyle(PremiumTheme.textMuted)
            Spacer()
            Text(value).font(.system(size: 14, weight: .semibold)).foregroundStyle(PremiumTheme.ink)
                .multilineTextAlignment(.trailing).lineLimit(2)
        }
        .padding(.vertical, 10)
    }

    private func load() async {
        loading = true
        booking = try? await ApiService.getBooking(id: bookingId)
        loading = false
    }

    private func qrImage(from string: String) -> UIImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        guard let output = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 8, y: 8)),
              let cg = context.createCGImage(output, from: output.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}
