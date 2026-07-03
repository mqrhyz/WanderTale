import SwiftUI

private let vietnamDestinationCities: [String] = [
    "Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Đà Lạt", "Nha Trang",
    "Phú Quốc", "Hội An", "Huế", "Sa Pa", "Hạ Long",
    "Vũng Tàu", "Mũi Né", "Cần Thơ", "Biên Hòa", "Bình Dương",
    "Buôn Ma Thuột", "Pleiku", "Quy Nhơn", "Tuy Hòa", "Ninh Bình",
    "Tam Đảo", "Hải Phòng", "Lào Cai", "Điện Biên Phủ", "Côn Đảo",
    "Phan Thiết", "Long An", "Bà Rịa - Vũng Tàu", "Khánh Hòa", "Lâm Đồng",
    "Bình Định", "Phú Yên", "Gia Lai", "Đắk Lắk", "Bình Thuận",
    "Ninh Thuận", "Bình Phước", "Tây Ninh", "Đồng Nai", "Tiền Giang",
    "Bến Tre", "Vĩnh Long", "Trà Vinh", "Sóc Trăng", "Bạc Liêu",
    "Cà Mau", "An Giang", "Kiên Giang", "Hậu Giang", "Đồng Tháp",
]

private func normalizedForSearch(_ text: String) -> String {
    let mutable = NSMutableString(string: text)
    CFStringTransform(mutable, nil, kCFStringTransformStripCombiningMarks, false)
    return mutable.lowercased
        .replacingOccurrences(of: "đ", with: "d")
        .replacingOccurrences(of: "Đ", with: "D")
        .replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
        .trimmingCharacters(in: .whitespaces)
}

private extension Array where Element: Hashable {
    func uniqued() -> [Element] {
        var seen = Set<Element>()
        return filter { seen.insert($0).inserted }
    }
}

struct TripPlannerView: View {
    @Environment(AppState.self) private var appState
    var onCreated: (String) -> Void
    var onBack: (() -> Void)?

    @State private var destination = "Đà Lạt"
    @State private var startDate = TripUtils.defaultPlannerStartDate()
    @State private var endDate = TripUtils.defaultPlannerEndDate()
    @State private var budget = "5000000"
    @State private var travelers = "2"
    @State private var pace = "balanced"
    @State private var accommodation = "standard"
    @State private var selectedTags: Set<String> = ["nature", "food", "culture"]
    @State private var loading = false
    @State private var error: String?
    @State private var suggestions: [GeocodeAutocompleteItem] = []
    @State private var suppressSuggestions = false
    @State private var destinationFrame: CGRect = .zero

    var body: some View {
        plannerLayout()
            .ignoresSafeArea(.keyboard, edges: .bottom)
            .appTabRoot()
    }

    private func plannerLayout() -> some View {
        ZStack(alignment: .bottom) {
            AppScreenScroll {
                VStack(alignment: .leading, spacing: 16) {
                    plannerSection(title: "Thông tin chung", icon: "sparkles") {
                        VStack(spacing: 14) {
                            plannerTextField(
                                label: "Điểm đến",
                                text: $destination,
                                placeholder: "Bạn muốn đến đâu?",
                                icon: "mappin.and.ellipse"
                            )
                            .onChange(of: destination) { _, new in
                                if suppressSuggestions {
                                    suppressSuggestions = false
                                } else {
                                    Task { await fetchSuggestions(new) }
                                }
                            }
                            .background(
                                GeometryReader { geo in
                                    Color.clear
                                        .onAppear {
                                            destinationFrame = geo.frame(in: .named("planner"))
                                        }
                                        .onChange(of: geo.frame(in: .named("planner"))) { _, new in
                                            if !suggestions.isEmpty {
                                                destinationFrame = new
                                            }
                                        }
                                }
                            )

                            dateRangePicker

                            HStack(alignment: .top, spacing: 10) {
                                plannerTextField(
                                    label: "Ngân sách",
                                    text: budgetText,
                                    placeholder: "5.000.000",
                                    icon: "creditcard",
                                    keyboard: .numberPad
                                )
                                .frame(maxWidth: .infinity)

                                travelerStepper
                                    .frame(width: 122)
                            }
                        }
                    }

                    plannerSection(title: "Sở thích", icon: "heart") {
                        FlowLayout(spacing: 8) {
                            ForEach(TripUtils.preferenceOptions, id: \.0) { tag, label in
                                tagChip(id: tag, label: label)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    plannerSection(title: "Nhịp độ", icon: "speedometer") {
                        HStack(spacing: 8) {
                            ForEach(TripUtils.paceOptions, id: \.0) { id, label in
                                paceChip(id: id, label: label)
                            }
                        }
                    }

                    plannerSection(title: "Phong cách lưu trú", icon: "bed.double") {
                        HStack(spacing: 8) {
                            ForEach(accommodationOptions, id: \.id) { option in
                                accommodationChip(option)
                            }
                        }
                    }

                    if let error {
                        Text(error)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(PremiumTheme.logoutRed)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(14)
                            .background(PremiumTheme.logoutRed.opacity(0.08))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                }
                .padding(.bottom, 92)
            }
            .safeAreaInset(edge: .top, spacing: 0) {
                plannerHeader
            }

            VStack(spacing: 0) {
                if loading {
                    PlannerAIProgressCard(destination: destination)
                        .padding(.horizontal, PremiumTheme.screenPadding)
                        .padding(.top, 12)
                }
                PremiumAccentButton(title: loading ? "Đang tạo…" : "Tạo chuyến đi ✦", loading: loading, enabled: isFormValid) {
                    Task { await submit() }
                }
                .padding(.horizontal, PremiumTheme.screenPadding)
                .padding(.top, 12)
                .padding(.bottom, 14)
            }
            .background(PremiumTheme.bg)
        }
        .coordinateSpace(name: "planner")
        .overlay(alignment: .topLeading) {
            if !suggestions.isEmpty && destinationFrame.width > 0 {
                suggestionsView
                    .frame(width: destinationFrame.width, alignment: .leading)
                    .offset(x: destinationFrame.minX, y: destinationFrame.maxY + 6)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .transaction { $0.animation = nil }
    }

    private var plannerHeader: some View {
        HStack(alignment: .top, spacing: 12) {
            if let onBack {
                Button(action: onBack) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(PremiumTheme.ink)
                        .frame(width: 34, height: 34)
                        .background(PremiumTheme.surface.opacity(0.9))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .padding(.top, 18)
            }

            PageHeader(
                kicker: "AI Planner",
                title: "Tạo chuyến đi",
                description: "AI gợi ý lịch trình, khách sạn và hoạt động theo ngân sách."
            )
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, PremiumTheme.screenPadding)
        .padding(.top, 10)
        .padding(.bottom, 14)
        .background(PremiumTheme.bg)
    }

    private var suggestionsView: some View {
        Group {
            if !suggestions.isEmpty {
                VStack(spacing: 0) {
                    ForEach(suggestions.prefix(4)) { item in
                        Button {
                            suppressSuggestions = true
                            destination = item.name.isEmpty ? item.display : item.name
                            suggestions = []
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "mappin.circle.fill")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(PremiumTheme.accent)
                                Text(item.display)
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(PremiumTheme.ink)
                                    .lineLimit(1)
                                Spacer()
                            }
                            .frame(height: 44)
                            .padding(.horizontal, 12)
                        }
                        .buttonStyle(.plain)

                        if item.id != suggestions.prefix(4).last?.id {
                            Divider().padding(.leading, 34)
                        }
                    }
                }
                .background(PremiumTheme.surface)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(PremiumTheme.border))
                .shadow(color: .black.opacity(0.1), radius: 14, x: 0, y: 8)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private var dateRangePicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            fieldLabel("Ngày đi")
            ZStack {
                HStack(spacing: 14) {
                    Image(systemName: "calendar")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(PremiumTheme.accent)
                        .frame(width: 22)

                    Text("\(formatDisplayDate(startDate)) - \(formatDisplayDate(endDate))")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(PremiumTheme.ink)
                        .lineLimit(1)
                        .minimumScaleFactor(0.85)

                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 14)

                HStack(spacing: 0) {
                    invisibleDatePicker(date: $startDate)
                    invisibleDatePicker(date: $endDate)
                }
            }
            .frame(height: 56)
            .background(PremiumTheme.inputBg)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(PremiumTheme.border))
        }
    }

    private var travelerStepper: some View {
        VStack(alignment: .leading, spacing: 8) {
            fieldLabel("Số người")
            HStack(spacing: 8) {
                stepperButton(systemImage: "minus") {
                    travelers = "\(max(1, travelerCount - 1))"
                }
                Text("\(travelerCount)")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(PremiumTheme.ink)
                    .frame(maxWidth: .infinity)
                stepperButton(systemImage: "plus") {
                    travelers = "\(min(10, travelerCount + 1))"
                }
            }
            .frame(height: 52)
            .padding(.horizontal, 8)
            .background(PremiumTheme.inputBg)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    private var budgetAmount: Double {
        Double(budget.filter(\.isNumber)) ?? 0
    }

    private var budgetText: Binding<String> {
        Binding(
            get: { formatVndInput(budget) },
            set: { budget = formatVndInput($0) }
        )
    }

    private var travelerCount: Int {
        max(1, min(10, Int(travelers.filter(\.isNumber)) ?? 1))
    }

    private var tripDayCount: Int {
        guard let start = isoDate(startDate), let end = isoDate(endDate), end >= start else { return 0 }
        return Calendar.current.dateComponents([.day], from: start, to: end).day.map { $0 + 1 } ?? 0
    }

    private var isFormValid: Bool {
        destination.trimmingCharacters(in: .whitespaces).count >= 2 &&
            budgetAmount > 0 &&
            travelerCount >= 1 &&
            endDate >= startDate
    }

    private var accommodationOptions: [(id: String, icon: String, title: String, subtitle: String)] {
        [
            ("budget", "leaf", "Tiết kiệm", "Gọn nhẹ"),
            ("standard", "bed.double", "Cân bằng", "Phù hợp"),
            ("premium", "sparkles", "Thoải mái", "Cao cấp"),
        ]
    }

    private func plannerSection<Content: View>(
        title: String,
        icon: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 9) {
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(PremiumTheme.accent)
                    .frame(width: 28, height: 28)
                    .background(PremiumTheme.accentLight)
                    .clipShape(RoundedRectangle(cornerRadius: 9))
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(PremiumTheme.ink)
                Spacer()
            }

            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(
            PremiumTheme.surface
                .clipShape(RoundedRectangle(cornerRadius: 18))
        )
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(PremiumTheme.border))
        .shadow(color: .black.opacity(0.04), radius: 10, y: 3)
    }

    private func plannerTextField(
        label: String,
        text: Binding<String>,
        placeholder: String = "",
        icon: String,
        keyboard: UIKeyboardType = .default
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            fieldLabel(label)
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(PremiumTheme.textMuted)
                    .frame(width: 18)
                TextField(placeholder, text: text)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(PremiumTheme.ink)
                    .keyboardType(keyboard)
                    .submitLabel(.done)
            }
            .frame(height: 52)
            .padding(.horizontal, 14)
            .background(PremiumTheme.inputBg)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    private func compactDatePicker(title: String, date: Binding<String>, systemImage: String) -> some View {
        HStack(spacing: 7) {
            VStack(spacing: 3) {
                Image(systemName: systemImage)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(PremiumTheme.textMuted)
                Text(title)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(PremiumTheme.textMuted)
                    .lineLimit(1)
            }
            .frame(width: 34)

            DatePicker("", selection: Binding(
                get: { isoDate(date.wrappedValue) ?? Date() },
                set: { date.wrappedValue = isoString($0) }
            ), displayedComponents: .date)
            .labelsHidden()
            .datePickerStyle(.compact)
            .tint(PremiumTheme.accent)
            .scaleEffect(0.88, anchor: .leading)
            .frame(width: 116, alignment: .leading)
            .clipped()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func invisibleDatePicker(date: Binding<String>) -> some View {
        DatePicker("", selection: Binding(
            get: { isoDate(date.wrappedValue) ?? Date() },
            set: { date.wrappedValue = isoString($0) }
        ), displayedComponents: .date)
        .labelsHidden()
        .datePickerStyle(.compact)
        .opacity(0.02)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipped()
    }

    private func fieldLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(PremiumTheme.textMuted)
    }

    private func stepperButton(systemImage: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(PremiumTheme.ink)
                .frame(width: 34, height: 34)
                .background(PremiumTheme.surface)
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
    }

    private func paceChip(id: String, label: String) -> some View {
        let selected = pace == id
        return Button {
            pace = id
        } label: {
            VStack(spacing: 5) {
                Image(systemName: paceIcon(id))
                    .font(.system(size: 18, weight: .semibold))
                Text(label)
                    .font(.system(size: 12, weight: selected ? .semibold : .medium))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .foregroundStyle(selected ? PremiumTheme.accent : PremiumTheme.muted)
            .frame(maxWidth: .infinity)
            .frame(height: 68)
            .background(selected ? PremiumTheme.accentLight : PremiumTheme.inputBg)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(selected ? PremiumTheme.accent.opacity(0.65) : PremiumTheme.border))
        }
        .buttonStyle(.plain)
    }

    private func accommodationChip(_ option: (id: String, icon: String, title: String, subtitle: String)) -> some View {
        let selected = accommodation == option.id
        return Button {
            accommodation = option.id
        } label: {
            VStack(spacing: 7) {
                Image(systemName: option.icon)
                    .font(.system(size: 17, weight: .semibold))
                Text(option.title)
                    .font(.system(size: 12, weight: selected ? .semibold : .medium))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                Text(option.subtitle)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(PremiumTheme.textMuted)
                    .lineLimit(1)
            }
            .foregroundStyle(selected ? PremiumTheme.accent : PremiumTheme.muted)
            .frame(maxWidth: .infinity)
            .frame(height: 86)
            .background(selected ? PremiumTheme.accentLight : PremiumTheme.inputBg)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(selected ? PremiumTheme.accent.opacity(0.65) : PremiumTheme.border))
        }
        .buttonStyle(.plain)
    }

    private func paceIcon(_ id: String) -> String {
        switch id {
        case "relaxed": return "leaf"
        case "packed": return "bolt"
        default: return "speedometer"
        }
    }

    private func formatCompactVnd(_ value: Double) -> String {
        if value >= 1_000_000 {
            let millions = value / 1_000_000
            return millions.rounded() == millions ? "\(Int(millions))tr đ" : String(format: "%.1ftr đ", millions)
        }
        return "\(Int(value)) đ"
    }

    private func formatVndInput(_ value: String) -> String {
        let digits = value.filter(\.isNumber)
        guard !digits.isEmpty, let amount = Int(digits) else { return "" }

        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.groupingSeparator = "."
        formatter.decimalSeparator = ","
        formatter.groupingSize = 3
        return formatter.string(from: NSNumber(value: amount)) ?? digits
    }

    private func tagChip(id: String, label: String) -> some View {
        let selected = selectedTags.contains(id)
        return Button {
            if selected { selectedTags.remove(id) } else { selectedTags.insert(id) }
        } label: {
            HStack(spacing: 6) {
                if selected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .bold))
                }
                Text(label)
                    .font(.system(size: 12, weight: .semibold))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .background(selected ? PremiumTheme.accentLight : PremiumTheme.inputBg)
            .foregroundStyle(selected ? PremiumTheme.accent : PremiumTheme.muted)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(selected ? PremiumTheme.accent.opacity(0.75) : PremiumTheme.border))
        }
        .buttonStyle(.plain)
    }

    private func fetchSuggestions(_ text: String) async {
        let q = text.trimmingCharacters(in: .whitespaces)
        guard q.count >= 2 else {
            suggestions = []
            return
        }
        let qNorm = normalizedForSearch(q)
        suggestions = vietnamDestinationCities
            .filter { city in
                let cityNorm = normalizedForSearch(city)
                return cityNorm.contains(qNorm) || qNorm.contains(cityNorm)
            }
            .uniqued()
            .prefix(6)
            .map { GeocodeAutocompleteItem(ref_id: "", display: $0, name: $0, address: "") }
    }

    private func submit() async {
        guard destination.trimmingCharacters(in: .whitespaces).count >= 2 else {
            error = "Nhập điểm đến (≥ 2 ký tự)."
            return
        }
        let budgetVal = budgetAmount
        guard budgetVal > 0 else {
            error = "Nhập ngân sách hợp lệ."
            return
        }
        let travelerCount = max(1, Int(travelers) ?? 1)
        guard endDate >= startDate else {
            error = "Ngày về phải sau ngày đi."
            return
        }

        loading = true
        error = nil
        do {
            let req = TripGenerateRequest(
                destination: destination.trimmingCharacters(in: .whitespaces),
                start_date: startDate,
                end_date: endDate,
                budget: budgetVal,
                preferences: TripPreferences(tags: Array(selectedTags)),
                travelers: travelerCount,
                pace: pace,
                accommodation_style: accommodation,
                enrich_pricing: true,
                rooms: max(1, (travelerCount + 1) / 2)
            )
            let res = try await ApiService.generateTrip(req)
            await appState.preload()
            onCreated(res.trip.id)
        } catch {
            self.error = formatApiError(error, fallback: "Không tạo được chuyến đi")
        }
        loading = false
    }

    private func isoDate(_ s: String) -> Date? {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: s)
    }

    private func isoString(_ d: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: d)
    }

    private func formatDisplayDate(_ s: String) -> String {
        guard let date = isoDate(s) else { return s }
        let f = DateFormatter()
        f.locale = Locale(identifier: "vi_VN")
        f.dateFormat = "dd/MM/yyyy"
        return f.string(from: date)
    }
}

private struct PlannerAIProgressCard: View {
    let destination: String
    @State private var step = 0

    private var messages: [String] {
        let place = destination.trimmingCharacters(in: .whitespacesAndNewlines)
        let label = place.isEmpty ? "điểm đến của bạn" : place
        return [
            "Đang phân tích chuyến đi tại \(label)…",
            "Xem thời tiết từng ngày để sắp lịch hợp lý…",
            "Tìm khách sạn phù hợp ngân sách…",
            "Gợi ý địa điểm theo sở thích của bạn…",
            "Sắp xếp hoạt động từng ngày…",
            "Tối ưu nhịp độ và thời gian di chuyển…",
            "Hoàn thiện lịch trình cho bạn…",
        ]
    }

    var body: some View {
        HStack(spacing: 12) {
            ProgressView()
                .tint(PremiumTheme.accent)
            VStack(alignment: .leading, spacing: 4) {
                Text(messages[step % messages.count])
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(PremiumTheme.ink)
                    .frame(maxWidth: .infinity, minHeight: 38, alignment: .leading)
                Text("AI đang xử lý, thường mất khoảng 10–15 giây")
                    .font(.system(size: 12))
                    .foregroundStyle(PremiumTheme.textMuted)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PremiumTheme.surface)
        .clipShape(RoundedRectangle(cornerRadius: PremiumTheme.inputRadius))
        .overlay(RoundedRectangle(cornerRadius: PremiumTheme.inputRadius).stroke(PremiumTheme.border))
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1.8))
                guard !Task.isCancelled else { return }
                step += 1
            }
        }
    }
}

/// Simple flow layout for tag chips
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        arrange(proposal: proposal, subviews: subviews).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, frame) in result.frames.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, frames: [CGRect]) {
        var maxWidth = proposal.width ?? 0
        if maxWidth <= 0 {
            maxWidth = proposal.replacingUnspecifiedDimensions().width
        }
        maxWidth = max(maxWidth, 1)
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var frames: [CGRect] = []

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            frames.append(CGRect(x: x, y: y, width: size.width, height: size.height))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }
        return (CGSize(width: maxWidth, height: y + rowHeight), frames)
    }
}
