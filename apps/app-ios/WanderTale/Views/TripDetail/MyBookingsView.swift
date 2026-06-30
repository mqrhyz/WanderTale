import SwiftUI

struct MyBookingsView: View {
    @Environment(AppState.self) private var appState
    @State private var loading = true
    @State private var selectedBookingId: String?

    private var bookings: [BookingRecord] { appState.myBookings }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Đặt chỗ")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundStyle(PremiumTheme.ink)
                Spacer()
            }
            .padding(.horizontal, PremiumTheme.screenPadding)
            .padding(.top, 8)
            .padding(.bottom, 4)

            ScrollView {
                if loading && bookings.isEmpty {
                    ProgressView().padding(.top, 60)
                } else if bookings.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "ticket").font(.system(size: 40)).foregroundStyle(PremiumTheme.muted)
                        Text("Chưa có đặt chỗ nào").font(.system(size: 15, weight: .medium)).foregroundStyle(PremiumTheme.muted)
                    }
                    .frame(maxWidth: .infinity).padding(.top, 60)
                } else {
                    VStack(spacing: 12) {
                        ForEach(bookings) { b in
                            Button { selectedBookingId = b.id } label: {
                                card(b)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(PremiumTheme.screenPadding)
                }
            }
            .scrollIndicators(.hidden)
            .refreshable { await load() }
        }
        .background(PremiumTheme.bg)
        .appTabRoot()
        .task { await load() }
        .sheet(item: $selectedBookingId.asIdentifiable) { wrapper in
            BookingReceiptView(bookingId: wrapper.value)
        }
    }

    private func card(_ b: BookingRecord) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(b.location_name ?? b.business_name ?? "Đặt chỗ")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(PremiumTheme.ink)
                Spacer()
                statusPill(b.status ?? "")
            }
            HStack(spacing: 6) {
                Text("Mã:").font(.system(size: 13)).foregroundStyle(PremiumTheme.muted)
                Text(b.code ?? String((b.id).prefix(8)).uppercased())
                    .font(.system(size: 13, weight: .bold)).foregroundStyle(PremiumTheme.accent)
                    .textSelection(.enabled)
            }
            HStack {
                Text(FormatUtils.formatVnd(b.total_amount))
                    .font(.system(size: 18, weight: .bold)).foregroundStyle(PremiumTheme.accent)
                Spacer()
                Text(b.payment_mode == "pay_later" ? "Trả sau" : "Trả trước")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(PremiumTheme.muted)
            }
            if let created = b.created_at {
                Text(String(created.prefix(10)))
                    .font(.system(size: 12)).foregroundStyle(PremiumTheme.textMuted)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PremiumTheme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(PremiumTheme.border))
    }

    private func statusPill(_ status: String) -> some View {
        let (label, color): (String, Color) = {
            switch status {
            case "paid": return ("Đã thanh toán", PremiumTheme.statDestIcon)
            case "confirmed": return ("Đã xác nhận", PremiumTheme.statDestIcon)
            case "pending_payment": return ("Chờ thanh toán", .orange)
            case "cancelled": return ("Đã huỷ", PremiumTheme.logoutRed)
            case "refunded": return ("Đã hoàn", PremiumTheme.muted)
            default: return (status, PremiumTheme.muted)
            }
        }()
        return Text(label)
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(color)
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(color.opacity(0.12)).clipShape(Capsule())
    }

    private func load() async {
        loading = true
        await appState.loadMyBookings()
        loading = false
    }
}

private struct BookingIdItem: Identifiable { let id = UUID(); let value: String }
private extension Binding where Value == String? {
    var asIdentifiable: Binding<BookingIdItem?> {
        Binding<BookingIdItem?>(
            get: { wrappedValue.map { BookingIdItem(value: $0) } },
            set: { wrappedValue = $0?.value }
        )
    }
}
