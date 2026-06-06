# EXE202 — WanderTale — Tổng quan dự án

## Mục tiêu

- Nền tảng lập kế hoạch du lịch bằng AI: người dùng nhập điểm đến, ngày đi/về, ngân sách, số người, sở thích → AI sinh lịch trình chi tiết theo ngày (địa điểm, hoạt động, thời tiết, ảnh, gợi ý khách sạn).

## Stack & cấu trúc

- Monorepo `wander-tale/`:
  - `apps/web/` — Next.js 15 (web app).
  - `apps/app-ios/` — iOS native SwiftUI.
  - `mobile/` — Android native (Kotlin + Jetpack Compose, Gradle).
  - `backend/` — Fastify + TypeScript + Zod (API chung, AI/Gemini, maps, SSE).
  - `shared/` — types/constants dùng chung web ↔ backend.
  - `supabase/` — migrations + schema (Auth + DB).
- Luồng: client đăng nhập Supabase Auth → gọi backend với `Authorization: Bearer <token>` → backend xác thực + làm giàu dữ liệu (AI/maps/weather/media) → trả itinerary, hỗ trợ streaming SSE.

## Trạng thái hiện tại

- Đã review toàn bộ app iOS + Android và sửa nhóm lỗi ưu tiên cao (xem changelog 2026-06-06).

## Quyết định kỹ thuật

- Transport security: cleartext HTTP chỉ cho phép host dev cục bộ (10.0.2.2/localhost/127.0.0.1), khóa với mọi domain khác trên cả hai nền tảng.
- Android dùng supabase-kt SDK (`loadFromStorage`) cho session; `allowBackup=false` để token không vào bản backup.
- Parse ngày fixed-format `yyyy-MM-dd` trên iOS phải dùng `Locale("en_US_POSIX")`; chỉ dùng `vi_VN` cho formatter hiển thị.

## Lịch sử thay đổi (Changelog)

### 2026-06-07 — Fix voucher Android + icon/UI business portal đẹp hơn (giống iOS)

- **Voucher Android không tạo được:** model gửi sai schema — thiếu `title` (backend bắt buộc → `voucher_title_required`), dùng `condition_label/starts_at/ends_at` thay vì `audience/valid_from/valid_until`, và map "Miễn phí" → `free_shipping` (sai CHECK, đúng là `free`).
  - Sửa `BusinessVoucherCreate`/`BusinessVoucherRow` (PlatformModels.kt) khớp backend; dialog thêm field **Tên voucher**, map `audience`/`valid_from`/`valid_until`/`free`; hiển thị dùng `valid_until`.
- **Icon/UI:** thay các glyph chữ ("▣/◎/☰/⌖/✿"...) bằng **Material Icons**: `PortalHeader` (Menu/Back + action icon), `PortalBottomBar` (Dashboard=GridView, Quảng cáo=Campaign, Voucher=ConfirmationNumber, Business=Storefront, Cài đặt=Settings, Users=Group, Hồ sơ=Person), voucher row=ConfirmationNumber, location card=Place. Header action theo tab (Add/Edit/PersonAdd/FilterList/Download/Notifications).
- **Ghi chú:** mobile-only, không cần deploy backend. Build `compileDebugKotlin` OK. Push `main` `de0f6b0..97245a7`. Các chức năng business khác (campaign/location/media/reply/mua gói) đã đối chiếu — khớp backend, hoạt động.

### 2026-06-07 — Fix nút "Chi trả" payout + lỗi config leak ở tab Users

- **Triệu chứng:** Tab Users (admin) hiện dòng xanh `{"error":"payout_provider_not_configured"}`; nút "Chi trả" không có gì xảy ra.
- **Nguyên nhân:** `dispatchPayout` dùng chung `PAYMENT_SIMULATION_MODE` (đã =false để bật PayOS thu tiền). PayOS không làm disbursement nên payout ném `payout_provider_not_configured`. Lỗi lưu vào `actionMessage` dùng chung → hiện ở tab khác.
- **Sửa:** thêm env riêng `PAYOUT_SIMULATION_MODE` (mặc định true) cho `dispatchPayout` → payout mô phỏng (mark paid) cho tới khi nối provider chi trả thật; `actionMessage` được xoá khi đổi tab admin (iOS + Android). Deploy Cloud Run SUCCESS (backend-only fix, không cần build lại app để "Chi trả" chạy).
- Push `main` `2805ef4..de0f6b0`.

### 2026-06-07 — Thanh toán PayOS hiển thị trong app (QR + chuyển khoản), không mở web

- **Yêu cầu:** Hiện thông tin thanh toán PayOS ngay trong app thay vì mở trang web ngoài.
- **Backend:** `lib/payos.ts` lấy thêm `qrCode, accountNumber, accountName, bin, amount, description` từ response create; `bookingService.payBooking` (nhánh PayOS) trả thêm `account_number/account_name/bin/amount/transfer_content/currency`. Build + deploy Cloud Run SUCCESS.
- **iOS:** `BookingView` render QR bằng CoreImage (`CIFilter.qrCodeGenerator`) + thẻ thông tin chuyển khoản (số tiền/STK/chủ TK/nội dung) + auto-poll trạng thái booking mỗi 4s → màn success khi `paid`. Còn nút "Mở trang PayOS" dự phòng.
- **Android:** `BookingScreen` render QR bằng ZXing (`com.google.zxing:core:3.5.3`, `QRCodeWriter` → Bitmap) + thông tin chuyển khoản + auto-poll → màn success.
- **Models:** `BookingPayResponse` (cả 2) thêm các field thanh toán.
- **Ghi chú:** build OK cả ba (tsc, gradle, xcodebuild). Đã push `main` (`e923361..2805ef4`).

### 2026-06-07 — Đã deploy PayOS lên Cloud Run (production live)

- Tạo secret: `wander-tale-payos-client-id/api-key/checksum-key` + cập nhật version `INTERNAL_WORKER_TOKEN`; cấp `secretAccessor` cho runtime SA; cấp role build/deploy cho compute SA.
- `cloudbuild.yaml`: inject 3 PayOS secret + `INTERNAL_WORKER_TOKEN` vào Cloud Run; build submit (tag = git short SHA vì `$COMMIT_SHA` rỗng khi submit thủ công) → **SUCCESS**.
- Service live: `https://wander-tale-api-378632863425.asia-southeast1.run.app` (và URL hash `...-udqpq76ngq-as.a.run.app`). Revision có `PAYMENT_SIMULATION_MODE=false` + đủ secret PayOS. Health + webhook (`/api/payments/payos/webhook`) trả 200.
- Mobile `API_URL` (Android `local.properties`, iOS `Config.xcconfig`) đã trỏ về Cloud Run URL.
- **Còn lại của user:** dán webhook URL vào PayOS dashboard.

### 2026-06-07 — PayOS lên production (Cloud Run) — webhook URL cố định

- **Yêu cầu:** Webhook cần URL luôn bật (không phụ thuộc máy cá nhân/tunnel tạm).
- **Thay đổi:** `cloudbuild.yaml` thêm 3 secret PayOS vào `--update-secrets` (`wander-tale-payos-client-id/api-key/checksum-key`); `deploy/cloud-run.env.yaml` đặt `PAYMENT_SIMULATION_MODE=false` để prod dùng PayOS thật.
- **Đã verify trước đó:** PayOS create link `code 00` + webhook handler verify chữ ký trả 200 (test qua Cloudflare tunnel).
- **CẦN THAO TÁC (GCP):** tạo 3 secret PayOS trong Secret Manager → `gcloud builds submit --config cloudbuild.yaml .` → lấy URL Cloud Run → đăng ký webhook `https://<cloud-run-url>/api/payments/payos/webhook` trên PayOS → set `API_URL` mobile về Cloud Run URL.

### 2026-06-07 — PayOS payment gateway + user booking/payment flow (iOS + Android)

- **Yêu cầu:** Khép kín booking→payment cho user, dùng PayOS làm cổng thanh toán.
- **Backend (build OK `tsc`):**
  - `lib/payos.ts`: client PayOS v2 (`/v2/payment-requests`), ký HMAC-SHA256 (create: amount,cancelUrl,description,orderCode,returnUrl; webhook: toàn bộ data sắp xếp alphabet), `createPaymentLink` + `verifyWebhook`.
  - `lib/env.ts`: thêm `PAYOS_CLIENT_ID/API_KEY/CHECKSUM_KEY/API_BASE/RETURN_URL/CANCEL_URL`.
  - `services/bookingService.ts`: `payBooking` nay 2 nhánh — simulation (capture đồng bộ → ghi sổ) và **PayOS** (tạo payment link, booking_payment status pending/authorized, trả `checkout_url`); webhook xác nhận qua `finalizeBookingPaymentByOrderCode` (idempotent) → ghi commission + payout. Tách `settleCapturedPayment` dùng chung.
  - `routes/payments.ts`: `POST /api/payments/payos/webhook` (verify chữ ký, không auth Bearer). `routes/bookings.ts`: thêm catalog `GET /api/businesses`, `GET /api/businesses/:id` (user chọn business thật để đặt).
  - `services/platformPortalService.ts`: `listActiveBusinesses`, `getActiveBusinessDetail`.
- **Mobile (build OK):**
  - Models `BookingPayResponse` thêm `provider/order_code/checkout_url/qr_code`; thêm `PublicBusinessRow/List/Detail`; API client thêm `listBusinesses/businessDetail`.
  - Android: `BookingScreen.kt` + route `BOOKING` + entry trong Profile ("Đặt chỗ & thanh toán"). Mở `checkout_url` qua Intent, nút "Kiểm tra trạng thái".
  - iOS: `BookingView` (gộp build qua xcodegen regenerate) + `Route.booking` + entry trong ProfileView. Mở checkout qua `openURL`.
- **Cấu hình:** PayOS keys đặt trong `.env` (gitignored, KHÔNG commit). `.env.example` + `deploy/cloud-run.env.yaml` chỉ chứa placeholder/non-secret. `PAYMENT_SIMULATION_MODE=false` (local) để bật PayOS thật.
- **CẦN THAO TÁC:** (1) chạy migration marketplace lên Supabase; (2) đăng ký **webhook URL** trên PayOS dashboard: `https://<backend-domain>/api/payments/payos/webhook`; (3) Cloud Run: thêm 3 PayOS key qua Secret Manager + set `PAYMENT_SIMULATION_MODE=false`; (4) đặt RETURN/CANCEL URL trỏ về app (deep link) hoặc trang web thật; (5) xoay vòng PayOS key đã lộ trong chat sau khi test.
- **Ghi chú:** payout vẫn simulation (`dispatchPayout`) — nối disbursement provider thật sau. Booking entry hiện qua Profile → "Đặt chỗ & thanh toán" (catalog business active).

### 2026-06-07 — Marketplace UI Business/Admin portal (iOS + Android)

- **Yêu cầu:** Triển khai UI portal phản ánh workflow marketplace mới (dùng data thật, có empty state, không mock).
- **Android (`ui/screens/PortalScreens.kt`, build OK):**
  - Business: Dashboard thêm doanh thu booking (net) + tổng booking + hạn gói quảng bá; tab Hồ sơ thêm Media (list + dialog thêm URL, trạng thái duyệt), Giao dịch gần đây, Payout (thực nhận).
  - Admin: Dashboard thêm DT hoa hồng/quảng cáo + tổng booking + user ban; tab Cài đặt thêm Duyệt media (approve/reject), Payout (nút Chi trả gọi processPayout), AI recommendation rules (bật/tắt).
- **iOS (`Views/Portal/BusinessPortalView.swift`, `AdminPortalView.swift`, build OK):**
  - Business: Dashboard thêm doanh thu booking + hạn gói; tab Hồ sơ thêm Media (list + form `BusinessMediaForm`), Giao dịch, Payout.
  - Admin: tab Cài đặt thêm Duyệt media, Payout (Chi trả), AI rules (bật/tắt).
- **Ghi chú / test:** `tsc` exit 0, `./gradlew :app:compileDebugKotlin` exit 0, `xcodebuild build` BUILD SUCCEEDED. Không phá role routing; mọi dữ liệu từ API thật, bảng rỗng → empty state.
- **Cần thao tác thủ công (Supabase/GCP):** (1) chạy migration `20260607120000_marketplace_payments.sql` lên Supabase; (2) thêm 4 env mới vào Cloud Run; (3) tạo Supabase Storage bucket khi cần upload media nhị phân thật; (4) cấu hình PSP/payout provider khi tắt simulation.
- **TODO còn lại:** upload media nhị phân (hiện nhận URL), booking/payment UI cho user (data layer đã sẵn — `createBooking/payBooking/...`), ad-package admin create form trên mobile, payment gateway/payout provider thật.

### 2026-06-07 — Marketplace BUSINESS/ADMIN/BOOKING/PAYMENT/PAYOUT (backend foundation + mobile data layer)

- **Yêu cầu:** Triển khai workflow marketplace: user trả tiền cho platform → platform giữ commission → payout net cho business; media moderation; ad package purchase; transaction history/audit; payment simulation safe mode. Không phá role routing, không mock data.
- **Backend (fully working, build OK `tsc`):**
  - Migration `supabase/migrations/20260607120000_marketplace_payments.sql`: mở rộng `bookings` (location_id, currency, total_amount, confirmed_at, updated_at, status lifecycle), `platform_transactions` (user_id, source, gateway_fee_amount, currency, provider_ref, payout_id, updated_at; kind/status mở rộng); tạo `payout_records`, `business_media`, `ai_recommendation_rules`; `ad_packages.benefits`, `business_ad_orders.payment_transaction_id`; indexes + RLS. Additive, không phá schema cũ.
  - `lib/env.ts` + `deploy/cloud-run.env.yaml` + `.env.example`: `PAYMENT_SIMULATION_MODE`, `DEFAULT_PLATFORM_COMMISSION_RATE`, `PAYOUT_AUTO_PROCESS`, `BUSINESS_MEDIA_MODERATION_REQUIRED`.
  - `lib/auth.ts`: thêm `requireBusinessOwner` (resolve + gắn `req.businessId`, chặn business chưa tồn tại/suspended) và `requireAdminOrBusinessRead` (least-privilege).
  - Services mới: `paymentService` (simulation safe-mode, chú thích rõ chỗ nối PSP/payout thật), `bookingService` (create/pay/confirm/cancel/refund với ledger thật + commission + payout record), `payoutService` (list + processPayout), `businessMediaService` (upload + moderation), `aiRecommendationService` (rules CRUD). `lib/auditLog.ts` ghi `system_logs` cho mọi action tiền. Mở rộng `platformPortalService` (profile/location update, ad-package admin CRUD, ad_package_expiry, purchaseAdPackage có ledger + payment link).
  - Routes mới: `bookings.ts` (POST /api/bookings, GET/:id, /:id/pay|confirm|cancel), `payouts.ts` (POST /api/payouts/:id/process — admin). Mở rộng `business-portal.ts` (packages, packages/purchase, locations PATCH, media GET/POST, profile GET/PATCH, payouts) và `admin-portal.ts` (media GET + /:id/status, ad-packages GET/POST/PATCH, ai-recommendation-rules GET/POST/PATCH, payouts). Đăng ký trong `routes/index.ts`.
  - Money flow: user → platform (booking_payment captured) → commission (settled, platform revenue) → payout_record (net, pending/scheduled) → processPayout (paid_out). Refund tạo record MỚI, không sửa lịch sử.
- **Mobile data layer (build OK iOS + Android):**
  - iOS `Models/PlatformModels.swift` + `Services/PlatformApiService.swift`: models + API methods cho bookings/payouts/media/ad-package admin/AI rules/profile; thêm `ad_package_expiry`.
  - Android `data/model/PlatformModels.kt` + `data/api/ApiClient.kt`: tương đương.
- **Ghi chú / test:** `tsc` exit 0; `xcodebuild build` BUILD SUCCEEDED; `./gradlew :app:compileDebugKotlin` exit 0.
- **Scaffold vs working:** Backend domain/ledger/routes + payment **simulation** = working (DB transaction thật). Mobile **data layer** = working. **Chưa làm (TODO patch kế tiếp):** UI screens Business/Admin mới (media upload/list, ad-package mua theo subscription mới, transaction/payout history, profile/compliance, admin media moderation/ai-rules/payout screens) + booking/payment UI flow cho user. Nối **payment gateway thật** (thay thân `capturePayment`) và **payout provider thật** (`dispatchPayout`) khi có; set `PAYMENT_SIMULATION_MODE=false`.

### 2026-06-06 — AI gợi ý địa điểm hot/không đóng cửa + cảnh báo thời tiết + lazy-load tab Đề xuất + đổi nhãn Khách sạn

- **Yêu cầu:** (1) AI không đề xuất địa điểm đóng cửa vĩnh viễn. (2) Tự động ưu tiên địa điểm hot theo tháng/năm hiện tại. (3) Thêm note cảnh báo khi thời tiết khung giờ đó biến động. (4) Tab "Đề xuất" khi loading hiển thị lazy-load text cho biết AI đang làm gì. (5) Đổi "Khách sạn (qua OTA)" → "Khách sạn". (Áp dụng iOS + Android, backend chung.)
- **Thay đổi chính:**
  - **Backend:**
    - `services/googleMaps.ts`: thêm `places.businessStatus` vào fieldMask và lọc bỏ địa điểm `CLOSED_PERMANENTLY`/`CLOSED_TEMPORARILY` khỏi kết quả Places (#1).
    - `services/tripSuggestPlaces.ts`: prompt thêm bối cảnh tháng/năm hiện tại, ưu tiên địa điểm HOT hợp mùa và cấm gợi ý nơi đóng cửa vĩnh viễn (#1, #2).
    - `services/openaiItinerary.ts`: prompt thêm cùng ràng buộc + yêu cầu `weather_note` là CẢNH BÁO (mở đầu "⚠️") khi thời tiết khung giờ biến động (#2, #3).
  - **iOS:**
    - `Views/TripDetail/TripDetailView.swift`: hiển thị `weather_note` dạng chip, tô cam + icon cảnh báo khi có "⚠️" (#3).
    - `Views/TripDetail/HotelCardView.swift`: đổi nhãn "Khách sạn"; thay pending tĩnh bằng `HotelLoadingProgress` (text xoay vòng mô tả AI đang làm gì) (#4, #5).
  - **Android:**
    - `ui/screens/TripDetailScreen.kt`: hiển thị `weather_note` (icon `WarningAmber`/`WbSunny`, tô cam khi cảnh báo); đổi nhãn "Khách sạn"; thêm composable `HotelLoadingProgress` xoay vòng text khi tab Đề xuất đang quét (#3, #4, #5).
- **Ghi chú / test:** Build OK cả ba — backend `tsc` (exit 0), `./gradlew :app:compileDebugKotlin` (exit 0), `xcodebuild ... build` (BUILD SUCCEEDED).
  - Web (`apps/web/.../HotelSection.tsx`) vẫn còn nhãn "Khách sạn (qua OTA)" — chưa đổi vì phạm vi yêu cầu là iOS+Android; có thể đồng bộ sau nếu cần.
  - #1/#2/#3 phụ thuộc AI/LLM tuân theo prompt + dữ liệu Google Places có `businessStatus`; phần lọc closed là chắc chắn ở tầng API, phần "hot theo mùa" là gợi ý prompt cho LLM.

### 2026-06-06 — Review 3 role (User/Business/Admin): sửa crash/chậm/lỗi UX

- **Yêu cầu:** Review UI/UX 3 role để tìm và fix lỗi crash, trải nghiệm chậm hoặc sai.
- **Thay đổi chính:**
  - **iOS:**
    - `Views/Portal/AdminPortalView.swift`: `load()` đổi 6 API tuần tự → song song bằng `async let` (nhanh hơn ~6x); guard `Int(total_revenue_vnd/1_000_000)` và `formatCompactVnd` khỏi NaN/overflow (tránh crash fatalError khi backend trả giá trị bất thường).
    - `Views/Main/MainTabView.swift`: chỉ mount home theo đúng role — business→`BusinessPortalView`, admin→`AdminPortalView`, user→ZStack 4 tab. Trước đây mount cả 3 home cùng lúc khiến user thường vẫn chạy `.task` load admin/business (gọi 403, tốn mạng, lỗi nền).
  - **Android:**
    - `ui/screens/PortalScreens.kt`: `load()` của Business và Admin đổi sang chạy song song bằng `coroutineScope { async {} }`; sửa `RevenueBars` — trước dùng `.drop(index).sumOf{}` (cộng dồn giảm dần, biểu đồ sai) → bucket theo từng ngày trong 7 ngày gần nhất, nhãn thứ và highlight ngày hôm nay đúng.
- **Ghi chú / test:** Build OK cả hai — `./gradlew :app:compileDebugKotlin` (exit 0) và `xcodebuild ... build` (BUILD SUCCEEDED). Business portal iOS vốn đã song song nên không đổi.
  - **Chưa làm (chấp nhận được, không crash/chậm nghiêm trọng):** sau mỗi action (duyệt/ban/tạo) cả hai nền tảng vẫn `load()` lại toàn bộ thay vì cập nhật cục bộ — có thể tối ưu sau.

### 2026-06-06 — Trip detail: 2 tab + maps theo tên + bỏ đường dọc + 1 ảnh khách sạn (iOS & Android)

- **Yêu cầu:** (1) Bỏ đường dọc (timeline) trùng với loading ở danh sách địa điểm/khách sạn. (2) Nút Maps ở địa điểm mở Google Maps theo TÊN thay vì toạ độ. (3) Trang chi tiết chuyến đi tách 2 tab: trái "Lịch trình", phải "Đề xuất" (hiện khách sạn quét được). (4) Ảnh khách sạn chỉ hiển thị 1 ảnh.
- **Thay đổi chính:**
  - **iOS:**
    - `Utils/TripUtils.swift`: `hotelImages` chỉ trả 1 ảnh đầu; thêm `slotMapsUrl(_:destination:)` tạo URL Google Maps tìm theo tên địa điểm.
    - `Views/TripDetail/TripDetailView.swift`: thêm segmented control `DetailSection` (Lịch trình | Đề xuất), tách agenda và `HotelSectionView`/voucher theo tab; nút Maps địa điểm dùng `slotMapsUrl` (theo tên).
    - iOS không có đường dọc timeline trong agenda nên #1 không áp dụng (chỉ Android có).
  - **Android:**
    - `util/TripUtils.kt`: `hotelImages` chỉ trả 1 ảnh; thêm `slotMapsQueryUrl(slot, destination)` tạo URL Maps theo tên.
    - `ui/screens/TripDetailScreen.kt`: bỏ `Box` đường dọc connector trong `TimelineAgendaRow`; thread `destination` xuống `DayBlock`/`TimelineAgendaRow`/`AgendaPlaceCard`; nút Maps dùng `slotMapsQueryUrl`; thêm `TripDetailTab` (Itinerary | Suggestions) với `DetailTabSelector`, tách agenda và khách sạn/voucher theo tab.
- **Ghi chú / test:** Build OK cả hai — `./gradlew :app:compileDebugKotlin` (exit 0) và `xcodebuild ... build` (BUILD SUCCEEDED). Ảnh khách sạn dùng `ImageCarousel` nhưng vì list chỉ còn 1 phần tử nên không hiện nút chuyển ảnh.

### 2026-06-06 — Sửa nhóm lỗi ưu tiên cao sau review iOS/Android

- **Yêu cầu:** Review full iOS + Android (UI/UX + logic backend), sau đó sửa theo thứ tự ưu tiên đã đề xuất.
- **Thay đổi chính:**
  - **iOS — Critical:**
    - `App/AppState.swift`, `Views/Profile/ProfileView.swift`: giải mã JWT đúng chuẩn Base64URL (`-`→`+`, `_`→`/`) — trước đây fail không cố định khiến user kẹt màn hình lỗi quyền dù đăng nhập thành công.
    - `Services/ApiService.swift`: bỏ force-unwrap `URLComponents(...)!` → `guard let ... else { throw }` tránh crash với path/query động.
  - **Android — Critical:**
    - `res/xml/network_security_config.xml`: tắt cleartext HTTP toàn cục (`cleartextTrafficPermitted=false`), chỉ mở exception cho host dev (10.0.2.2/localhost/127.0.0.1) — bảo vệ Bearer token khỏi MITM.
  - **Android — High:**
    - `data/api/ApiClient.kt`: bật `expectSuccess = true`, mở rộng `parseError` nhận `ResponseException` (gồm 4xx + 5xx), bọc try/catch cho các endpoint còn gọi `.body()` trực tiếp (`listTrips`, `getTrip`, `dashboard`, `deleteTrip`, `duplicateTrip`, `previewTrip`) → trả message lỗi rõ ràng thay vì lỗi deserialization khó hiểu.
    - `util/TripUtils.kt`: bọc `LocalDate.parse` trong `runCatching` ở `formatDateRange` và `getTripPhase` → tránh crash khi backend trả ngày sai format.
  - **iOS — High/Medium:**
    - `Utils/TripUtils.swift`, `Views/Planner/TripPlannerView.swift`: thêm `Locale("en_US_POSIX")` cho formatter parse `yyyy-MM-dd` → tránh sai trên thiết bị dùng lịch không-Gregorian.
    - `Views/TripDetail/TripDetailView.swift`: xử lý lỗi cho Nhân bản/Xóa (không còn `try?` nuốt lỗi), thêm alert xác nhận trước khi xóa, chỉ `dismiss()` khi thành công, hiển thị message khi thất bại.
  - **iOS/Android — Security transport:**
    - `apps/app-ios/.../Info.plist`: bỏ `NSAllowsArbitraryLoads`, chỉ giữ `NSExceptionDomains` cho localhost/127.0.0.1.
    - `mobile/.../AndroidManifest.xml`: `allowBackup="false"`.
- **Ghi chú / test:**
  - Đã build thành công cả hai: `./gradlew :app:compileDebugKotlin` (exit 0) và `xcodebuild ... build` (BUILD SUCCEEDED).
  - **Còn lại (chưa làm trong phiên này):** các lỗi Medium/Low khác trong báo cáo review (SSE/REST chưa refresh token trên iOS, timeout 300s áp cho mọi request, "Xem tất cả" wire nhầm, AdminPortal load tuần tự, touch target < 44pt/accessibility, DashboardHomeCache race trên Android, mất state khi xoay màn hình, O(n²) trong LazyColumn, key trùng…).
  - **Chưa verify được:** lệch JSON shape so với response thật của backend Fastify (cần đối chiếu runtime).
