import SwiftUI

struct TripDetailView: View {
    let tripId: String
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    @State private var trip: TripRecord?
    @State private var error: String?
    @State private var loading = true
    @State private var selectedDayIndex = 0
    @State private var imageProgress: (Int, Int)?
    @State private var pollTask: Task<Void, Never>?
    @State private var showDeleteConfirm = false
    @State private var actionError: String?
    @State private var actionInProgress = false
    @State private var selectedSection: DetailSection = .itinerary

    private enum DetailSection: String, CaseIterable {
        case itinerary = "Lịch trình"
        case suggestions = "Đề xuất"
    }

    var body: some View {
        ScrollView {
            if loading && trip == nil {
                ProgressView().padding(.top, 80)
            } else if let error, trip == nil {
                Text(error).foregroundStyle(.red).padding()
            } else if let trip {
                content(trip)
            }
        }
        .scrollIndicators(.hidden)
        .background(Color.white)
        .navigationTitle(trip?.destination ?? "Chi tiết")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    appState.toggleFavorite(tripId)
                } label: {
                    Image(systemName: appState.favoriteTripIds.contains(tripId) ? "heart.fill" : "heart")
                        .foregroundStyle(PremiumTheme.accent)
                }
            }
        }
        .task { await load() }
        .onDisappear { pollTask?.cancel() }
        .alert("Xóa chuyến đi?", isPresented: $showDeleteConfirm) {
            Button("Hủy", role: .cancel) { }
            Button("Xóa", role: .destructive) {
                Task { await deleteTrip() }
            }
        } message: {
            Text("Hành động này không thể hoàn tác.")
        }
    }

    @ViewBuilder
    private func content(_ trip: TripRecord) -> some View {
        let days = trip.itinerary_json?.days ?? []
        let activeIndex = min(selectedDayIndex, max(days.count - 1, 0))
        let activeDay = days.isEmpty ? nil : days[activeIndex]
        let pending = pendingMessage(for: trip)

        VStack(alignment: .leading, spacing: PremiumTheme.sectionGap) {
            if let pending {
                HStack(spacing: 10) {
                    ProgressView().tint(PremiumTheme.accent)
                    Text(pending).font(.system(size: 13)).foregroundStyle(PremiumTheme.muted)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(PremiumTheme.accentLight)
                .clipShape(RoundedRectangle(cornerRadius: PremiumTheme.inputRadius))
            }

            PremiumSurfaceCard {
                VStack(alignment: .leading, spacing: 8) {
                    Text(FormatUtils.formatDateRange(start: trip.start_date, end: trip.end_date))
                        .font(.system(size: 15))
                    Text("Ngân sách: \(FormatUtils.formatVnd(trip.budget))")
                        .font(.system(size: 15))
                }
            }

            sectionTabs

            if selectedSection == .itinerary {
                itinerarySection(trip, days: days, activeIndex: activeIndex, activeDay: activeDay)
            } else {
                suggestionsSection(trip)
            }

            HStack(spacing: 10) {
                PremiumAccentButton(title: "Nhân bản") {
                    Task { await duplicateTrip() }
                }
                .disabled(actionInProgress)
                Button("Xóa") {
                    showDeleteConfirm = true
                }
                .foregroundStyle(PremiumTheme.logoutRed)
                .frame(maxWidth: .infinity, minHeight: 48)
                .overlay(RoundedRectangle(cornerRadius: PremiumTheme.buttonRadius).stroke(PremiumTheme.border))
                .disabled(actionInProgress)
            }

            if let actionError {
                Text(actionError)
                    .font(.system(size: 13))
                    .foregroundStyle(PremiumTheme.logoutRed)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(.horizontal, PremiumTheme.screenPadding)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var sectionTabs: some View {
        HStack(spacing: 0) {
            ForEach(DetailSection.allCases, id: \.self) { section in
                let selected = selectedSection == section
                Button {
                    selectedSection = section
                } label: {
                    Text(section.rawValue)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(selected ? .white : PremiumTheme.muted)
                        .frame(maxWidth: .infinity)
                        .frame(height: 38)
                        .background(selected ? PremiumTheme.accent : Color.clear)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .background(PremiumTheme.inputBg)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    @ViewBuilder
    private func itinerarySection(_ trip: TripRecord, days: [ItineraryDayPlan], activeIndex: Int, activeDay: ItineraryDayPlan?) -> some View {
        VStack(alignment: .leading, spacing: PremiumTheme.sectionGap) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Agenda theo ngày")
                    .font(.system(size: 18, weight: .semibold))
                Text("Chọn ngày để xem lịch trình chi tiết theo khung giờ.")
                    .font(.system(size: 14))
                    .foregroundStyle(PremiumTheme.textMuted)
            }

            if !days.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(days.enumerated()), id: \.element.id) { index, day in
                            dayChip(day: day, index: index, selected: index == activeIndex)
                        }
                    }
                }
                .frame(maxWidth: .infinity)
            }

            if let activeDay {
                dayBlock(activeDay)
            }
        }
    }

    @ViewBuilder
    private func suggestionsSection(_ trip: TripRecord) -> some View {
        VStack(alignment: .leading, spacing: PremiumTheme.sectionGap) {
            HotelSectionView(
                hotels: trip.itinerary_json?.hotel_suggestions ?? [],
                destination: trip.destination,
                otaPending: TripUtils.tripNeedsOtaPolling(trip)
            )

            if let vouchers = trip.itinerary_json?.voucher_suggestions, !vouchers.isEmpty {
                Text("Voucher gợi ý")
                    .font(.system(size: 18, weight: .semibold))
                ForEach(vouchers) { voucher in
                    PremiumSurfaceCard {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("\(voucher.code) — \(voucher.title)")
                                .font(.system(size: 15, weight: .semibold))
                            Text(voucher.partner_name)
                                .font(.system(size: 13))
                                .foregroundStyle(PremiumTheme.muted)
                        }
                    }
                }
            }
        }
    }

    private func dayChip(day: ItineraryDayPlan, index: Int, selected: Bool) -> some View {
        Button { selectedDayIndex = index } label: {
            VStack(spacing: 2) {
                Text("NGÀY \(day.day)")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(selected ? PremiumTheme.accent : PremiumTheme.muted)
                Text(FormatUtils.formatDayShort(day.date))
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(PremiumTheme.ink)
                    .lineLimit(1)
            }
            .frame(width: 80)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(selected ? PremiumTheme.accentLight : PremiumTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(selected ? PremiumTheme.accent : PremiumTheme.border))
        }
    }

    private func dayBlock(_ day: ItineraryDayPlan) -> some View {
        PremiumSurfaceCard {
            VStack(alignment: .leading, spacing: 12) {
                Text("Ngày \(day.day): \(day.date)")
                    .font(.system(size: 17, weight: .semibold))
                if !day.theme.isEmpty {
                    Text(day.theme).font(.system(size: 14)).foregroundStyle(PremiumTheme.muted)
                }
                ForEach(TripUtils.getDayActivities(day), id: \.id) { slot in
                    agendaRow(slot)
                    Divider()
                }
            }
        }
    }

    private func agendaRow(_ slot: ItinerarySlot) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(TripUtils.formatSlotClock(slot.start_time))
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
                .background(PremiumTheme.accent)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 4) {
                Text(slot.title ?? "—")
                    .font(.system(size: 15, weight: .semibold))
                if let summary = slot.summary, !summary.isEmpty {
                    Text(summary)
                        .font(.system(size: 13))
                        .foregroundStyle(PremiumTheme.muted)
                        .lineLimit(3)
                }
                if let start = slot.start_time, let end = slot.end_time {
                    Text("\(start) – \(end)")
                        .font(.system(size: 11))
                        .foregroundStyle(PremiumTheme.textMuted)
                }
                if let weather = slot.weather_note?.trimmingCharacters(in: .whitespaces), !weather.isEmpty {
                    let isWarning = weather.contains("⚠️")
                    HStack(alignment: .top, spacing: 4) {
                        Image(systemName: isWarning ? "exclamationmark.triangle.fill" : "cloud.sun")
                            .font(.system(size: 10, weight: .semibold))
                        Text(weather.replacingOccurrences(of: "⚠️", with: "").trimmingCharacters(in: .whitespaces))
                            .font(.system(size: 11, weight: isWarning ? .semibold : .regular))
                            .lineLimit(2)
                    }
                    .foregroundStyle(isWarning ? Color.orange : PremiumTheme.textMuted)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background((isWarning ? Color.orange : PremiumTheme.textMuted).opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                if let url = TripUtils.slotMapsUrl(slot, destination: trip?.destination), let link = URL(string: url) {
                    Link("Maps", destination: link)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(PremiumTheme.accent)
                }
            }
            Spacer(minLength: 8)
            RemoteImage(
                url: TripUtils.slotImages(slot).first,
                fallback: slot.title ?? "?",
                contentMode: .fill
            )
            .frame(width: 96, height: 96)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private func pendingMessage(for trip: TripRecord) -> String? {
        if let p = imageProgress, p.0 < p.1 { return "AI đang tìm ảnh đẹp nhất cho lịch trình (\(p.0)/\(p.1))…" }
        if TripUtils.tripNeedsOtaPolling(trip) { return "AI đang tìm khách sạn phù hợp ngân sách…" }
        if TripUtils.tripNeedsPolling(trip) { return "AI đang hoàn thiện lịch trình cho bạn…" }
        return nil
    }

    private func duplicateTrip() async {
        actionError = nil
        actionInProgress = true
        defer { actionInProgress = false }
        do {
            _ = try await ApiService.duplicateTrip(id: tripId)
            await appState.preload()
            dismiss()
        } catch {
            actionError = formatApiError(error, fallback: "Không nhân bản được chuyến đi")
        }
    }

    private func deleteTrip() async {
        actionError = nil
        actionInProgress = true
        defer { actionInProgress = false }
        do {
            try await ApiService.deleteTrip(id: tripId)
            await appState.preload()
            dismiss()
        } catch {
            actionError = formatApiError(error, fallback: "Không xóa được chuyến đi")
        }
    }

    private func load() async {
        loading = true
        do {
            trip = try await ApiService.getTrip(id: tripId)
            startPollingIfNeeded()
        } catch {
            self.error = formatApiError(error, fallback: "Không tải được chuyến đi")
        }
        loading = false
    }

    private func startPollingIfNeeded() {
        pollTask?.cancel()
        guard let trip, TripUtils.tripNeedsPolling(trip) else { return }
        pollTask = Task {
            let streamTask = Task {
                try? await ApiService.streamTripUpdates(tripId: tripId) { raw in
                    Task { @MainActor in
                        await handleStreamEvent(raw)
                    }
                }
            }
            defer { streamTask.cancel() }

            let deadline = Date().addingTimeInterval(240)
            while !Task.isCancelled && Date() < deadline {
                try? await Task.sleep(nanoseconds: 2_500_000_000)
                guard !Task.isCancelled else { break }
                guard let updated = try? await ApiService.getTrip(id: tripId) else { continue }
                await MainActor.run {
                    self.trip = updated
                    if !TripUtils.tripNeedsMediaPolling(updated) {
                        self.imageProgress = nil
                    }
                }
                if !TripUtils.tripNeedsPolling(updated) { break }
            }
        }
    }

    @MainActor
    private func handleStreamEvent(_ raw: String) async {
        guard let data = raw.data(using: .utf8),
              let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = root["type"] as? String else { return }
        let payload = root["payload"] as? [String: Any] ?? [:]

        switch type {
        case "slot_image":
            if let filled = payload["filled"] as? Int, let total = payload["total"] as? Int {
                imageProgress = (filled, total)
            }
            guard let title = payload["title"] as? String,
                  let imageURL = payload["image_preview_url"] as? String,
                  let current = trip else { return }
            trip = TripUtils.applyingSlotImage(
                to: current,
                title: title,
                imageURL: imageURL,
                imageURLs: payload["image_preview_urls"] as? [String]
            )
        case "images_progress":
            if let filled = payload["filled"] as? Int, let total = payload["total"] as? Int {
                imageProgress = (filled, total)
            }
        case "skeleton_ready", "prices_ready", "images_ready", "hotel_images_ready",
             "coords_ready", "complete", "trip_update":
            if let updated = try? await ApiService.getTrip(id: tripId) {
                trip = TripUtils.mergingSlotImages(from: trip, into: updated)
                if !TripUtils.tripNeedsMediaPolling(updated) {
                    imageProgress = nil
                }
            }
        default:
            break
        }
    }
}
