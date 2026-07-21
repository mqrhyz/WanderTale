import SwiftUI

struct HotelSectionView: View {
    let hotels: [BookingSuggestion]
    var destination: String?
    var otaPending: Bool

    private var orderedHotels: [BookingSuggestion] {
        let split = TripUtils.splitHotels(hotels)
        var list: [BookingSuggestion] = []
        if let recommended = split.recommended { list.append(recommended) }
        list.append(contentsOf: split.alternatives)
        return Array(list.prefix(6))
    }

    private var siteBadges: [String] {
        Array(Set(orderedHotels.compactMap(\.site).filter { !$0.isEmpty }))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            header
            if otaPending && orderedHotels.isEmpty {
                HotelLoadingProgress()
            } else {
                ForEach(orderedHotels) { hotel in
                    HotelCardView(hotel: hotel, destination: destination)
                }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text("Khách sạn")
                    .font(.system(size: 18, weight: .semibold))
                if !orderedHotels.isEmpty {
                    Text("\(orderedHotels.count) lựa chọn")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(PremiumTheme.muted)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(PremiumTheme.inputBg)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
            }
            if !siteBadges.isEmpty {
                HStack(spacing: 6) {
                    ForEach(siteBadges, id: \.self) { site in
                        Text(TripUtils.siteLabel(site))
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(PremiumTheme.accent)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(PremiumTheme.accentLight)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                }
            }
        }
    }

    private var pendingCard: some View {
        HotelLoadingProgress()
    }
}

/// Lazy-load text xoay vòng cho biết AI đang làm gì khi quét khách sạn/đề xuất.
private struct HotelLoadingProgress: View {
    @State private var step = 0

    private let messages = [
        "AI đang tìm phòng khách sạn phù hợp…",
        "So sánh giá phòng theo ngân sách của bạn…",
        "Lấy ảnh & vị trí từng khách sạn…",
        "Chọn lọc gợi ý phù hợp nhất…",
        "Sắp hoàn tất, chuẩn bị hiển thị…",
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                ProgressView().tint(PremiumTheme.accent)
                Text(messages[step % messages.count])
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(PremiumTheme.ink)
                    .animation(.easeInOut(duration: 0.25), value: step)
            }
            Text("AI đang tổng hợp đề xuất, thường mất 10–20 giây…")
                .font(.system(size: 12))
                .foregroundStyle(PremiumTheme.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(PremiumTheme.surface)
        .clipShape(RoundedRectangle(cornerRadius: PremiumTheme.cardRadius))
        .overlay(
            RoundedRectangle(cornerRadius: PremiumTheme.cardRadius)
                .stroke(PremiumTheme.border, style: StrokeStyle(lineWidth: 1, dash: [6, 4]))
        )
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1.8))
                guard !Task.isCancelled else { return }
                step += 1
            }
        }
    }
}

struct HotelCardView: View {
    let hotel: BookingSuggestion
    var destination: String?

    private let imageSize: CGFloat = 132
    private var amenities: [String] {
        TripUtils.dedupeRoomAmenities(hotel.room_amenities, roomName: hotel.room_name)
    }

    var body: some View {
        PremiumSurfaceCard {
            HStack(alignment: .top, spacing: 14) {
                infoColumn
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .frame(minHeight: imageSize, alignment: .top)

                ImageCarousel(
                    images: TripUtils.hotelImages(hotel),
                    alt: hotel.name,
                    fallback: String(hotel.name.prefix(1)),
                    width: imageSize,
                    height: imageSize,
                    contentMode: .fit
                )
            }
        }
    }

    private var infoColumn: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(hotel.name)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(PremiumTheme.ink)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)

            Text(TripUtils.siteLabel(hotel.site))
                .font(.system(size: 12))
                .foregroundStyle(PremiumTheme.textMuted)
                .padding(.top, 4)

            HotelStarsView(count: TripUtils.parseHotelRating(hotel.reason, hotel.price_level))
                .padding(.top, 6)

            if let room = hotel.room_name, !room.isEmpty {
                Text(room)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(PremiumTheme.ink)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 8)
            }

            if !amenities.isEmpty {
                amenityTags
                    .padding(.top, 8)
            }

            if let avg = hotel.avg_distance_km {
                Text("Khoảng cách TB: \(String(format: "%.1f", avg)) km")
                    .font(.system(size: 12))
                    .foregroundStyle(PremiumTheme.textMuted)
                    .padding(.top, 8)
            }

            if let price = hotel.price_vnd {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(FormatUtils.formatVnd(price))
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(PremiumTheme.accent)
                    Text("/ đêm")
                        .font(.system(size: 11))
                        .foregroundStyle(PremiumTheme.textMuted)
                }
                .padding(.top, 8)
            }

            Spacer(minLength: 12)

            actionButtons
        }
    }

    private var amenityTags: some View {
        FlowLayout(spacing: 6) {
            ForEach(amenities.prefix(5), id: \.self) { tag in
                Text(tag)
                    .font(.system(size: 11))
                    .foregroundStyle(PremiumTheme.muted)
                    .lineLimit(1)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(PremiumTheme.inputBg)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                    .overlay(RoundedRectangle(cornerRadius: 6).stroke(PremiumTheme.border))
            }
        }
    }

    private var actionButtons: some View {
        HStack(spacing: 8) {
            if let url = hotel.url, let link = URL(string: url) {
                hotelActionLink(title: "Xem phòng", icon: "arrow.up.right", url: link, emphasized: true)
            }
            if let link = URL(string: TripUtils.hotelMapsUrl(hotel, destination: destination)) {
                hotelActionLink(title: "Maps", icon: "mappin.and.ellipse", url: link, emphasized: false)
            }
        }
        .padding(.top, 12)
    }

    private func hotelActionLink(title: String, icon: String, url: URL, emphasized: Bool) -> some View {
        Link(destination: url) {
            HStack(spacing: 4) {
                Text(title)
                Image(systemName: icon)
                    .font(.system(size: 10, weight: .semibold))
            }
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(emphasized ? PremiumTheme.ink : PremiumTheme.muted)
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(PremiumTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(PremiumTheme.border))
        }
    }
}

private struct HotelStarsView: View {
    let count: Int

    var body: some View {
        HStack(spacing: 2) {
            ForEach(0..<5, id: \.self) { index in
                Image(systemName: index < count ? "star.fill" : "star")
                    .font(.system(size: 11))
                    .foregroundStyle(index < count ? Color(red: 1, green: 0.76, blue: 0.2) : PremiumTheme.textMuted.opacity(0.45))
            }
        }
        .accessibilityLabel("\(count) sao")
    }
}
