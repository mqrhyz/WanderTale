import SwiftUI

/// User booking + payment flow.
/// Pick a real active business -> enter amount -> create booking -> pay.
/// PayOS mode: open checkout URL; poll status on return. Simulation: paid immediately.
struct BookingView: View {
    @State private var businesses: [PublicBusinessRow] = []
    @State private var loading = true
    @State private var error: String?
    @State private var selected: PublicBusinessRow?
    @State private var amount = ""
    @State private var working = false
    @State private var message: String?
    @State private var currentBookingId: String?
    @Environment(\.openURL) private var openURL

    var body: some View {
        ScrollView {
            if loading {
                ProgressView().padding(.top, 60)
            } else if let error {
                Text(error).foregroundStyle(.red).padding()
            } else {
                content
            }
        }
        .background(PremiumTheme.bg)
        .navigationTitle("Đặt chỗ & thanh toán")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: 14) {
            if let message {
                Text(message)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(PremiumTheme.accent)
            }
            if businesses.isEmpty {
                Text("Chưa có doanh nghiệp nào đang hoạt động để đặt chỗ.")
                    .font(.system(size: 14))
                    .foregroundStyle(PremiumTheme.textMuted)
            } else {
                Text("Chọn doanh nghiệp")
                    .font(.system(size: 16, weight: .semibold))
                ForEach(businesses) { biz in
                    businessRow(biz)
                }
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
                            Text(working ? "Đang xử lý…" : "Thanh toán")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 48)
                                .background(PremiumTheme.accent)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .disabled(working)
                        if let bid = currentBookingId {
                            Button("Kiểm tra trạng thái") {
                                Task { await checkStatus(bid) }
                            }
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(PremiumTheme.accent)
                        }
                    }
                }
            }
        }
        .padding(PremiumTheme.screenPadding)
    }

    private func businessRow(_ biz: PublicBusinessRow) -> some View {
        Button {
            selected = biz
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text(biz.name ?? "Doanh nghiệp")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(PremiumTheme.ink)
                    Text([biz.business_type, biz.region].compactMap { $0 }.joined(separator: " · "))
                        .font(.system(size: 12))
                        .foregroundStyle(PremiumTheme.textMuted)
                }
                Spacer()
                Text("★ \(String(format: "%.1f", biz.rating_avg ?? 0))")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(PremiumTheme.accent)
            }
            .padding(14)
            .background(selected?.id == biz.id ? PremiumTheme.accentLight : PremiumTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(selected?.id == biz.id ? PremiumTheme.accent : PremiumTheme.border))
        }
        .buttonStyle(.plain)
    }

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
            currentBookingId = booking.id
            let pay = try await ApiService.payBooking(id: booking.id)
            if let urlStr = pay.checkout_url, let url = URL(string: urlStr) {
                openURL(url)
                message = "Đang chuyển tới PayOS. Sau khi thanh toán, bấm 'Kiểm tra trạng thái'."
            } else {
                message = "Thanh toán thành công (\(pay.status))."
            }
        } catch {
            message = formatApiError(error, fallback: "Không thể tạo thanh toán")
        }
    }

    private func checkStatus(_ id: String) async {
        do {
            let booking = try await ApiService.getBooking(id: id)
            message = "Trạng thái booking: \(booking.status ?? "—")"
        } catch {
            message = formatApiError(error, fallback: "Không kiểm tra được trạng thái")
        }
    }
}
