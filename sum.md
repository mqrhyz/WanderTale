# WanderTale - Tom tat du an

## Tong quan

WanderTale la nen tang lap ke hoach du lich dung AI, gom web app, backend API, Android app va iOS app. He thong dung Supabase cho xac thuc/du lieu, backend Fastify de tao lich trinh va lam giau du lieu, web Next.js cho giao dien desktop/web, Android native Jetpack Compose va iOS native SwiftUI cho mobile.

## Chuc nang chinh

- Dang ky, dang nhap, quen mat khau va quan ly phien bang Supabase Auth.
- Dashboard tong quan: so chuyen di, diem den, ngan sach, hoat dong va danh sach chuyen gan day.
- Tao chuyen di bang AI theo diem den, ngay di/ngay ve, ngan sach, so nguoi, so thich va nhip do.
- Quan ly chuyen di: danh sach sap toi/da qua, chi tiet lich trinh theo ngay, duplicate, delete va cap nhat du lieu.
- Lich trinh chi tiet: agenda theo ngay, dia diem, hoat dong, thoi tiet, anh dia diem, goi y va khach san.
- Yeu thich: luu va xem cac chuyen di da danh dau.
- Ho so nguoi dung: thong tin ca nhan, vai tro, admin/doanh nghiep khi co quyen.
- Cong Admin va Doanh nghiep: thong ke, giao dich, user/business, goi quang cao, voucher/doi tac.
- Tich hop ban do/dia diem/thoi tiet/anh: Google Maps, Vietmap, Nominatim, Pexels/Wikimedia/Wikidata tuy cau hinh.
- Streaming/cap nhat tien trinh tao chuyen di qua backend.

## Cau truc thu muc

```text
wander-tale/
  apps/
    web/                  # Next.js web app
    app-ios/              # iOS native SwiftUI app
  backend/                # Fastify API server
  mobile/                 # Android native app, Kotlin + Jetpack Compose
  packages/
    hotel-booking-agent/  # Package ho tro tac vu hotel/booking agent
  shared/                 # Types/constants dung chung cho web/backend
  supabase/
    migrations/           # Migration database Supabase
  docs/                   # Tai lieu phu
  .env.example            # Mau bien moi truong
  package.json            # Script workspace web/backend
```

## Backend

Thu muc: `backend/`

Cong nghe:

- Node.js >= 20
- TypeScript
- Fastify
- Supabase JS
- Zod
- Google GenAI/Gemini va cac provider ho tro AI/LLM

Cau truc quan trong:

```text
backend/src/
  server.ts               # Khoi dong Fastify server
  routes/                 # API routes
  lib/                    # Supabase, auth, env, AI clients, maps, SSE, cache
  services/               # Business logic tao/lap lich/lap gia/lam giau chuyen di
  schemas/                # Zod schemas
  types/                  # Type bo sung
```

Routes chinh:

- `health`: kiem tra server.
- `dashboard`: thong ke dashboard.
- `trips`: CRUD va tao chuyen di.
- `geocode`, `maps`, `places`, `weather`: dia diem, map va thoi tiet.
- `admin-portal`, `business-portal`: cong quan tri/doanh nghiep.
- `hotel-agent`: xu ly du lieu khach san/OTA.
- `vouchers`: voucher/doi tac.

Scripts:

```bash
npm run dev --prefix backend
npm run build --prefix backend
npm run start --prefix backend
```

Backend dev thuong chay tai `http://127.0.0.1:8000`.

## Web app

Thu muc: `apps/web/`

Cong nghe:

- Next.js 15
- React/TypeScript
- Supabase client
- API backend rieng qua `API_PUBLIC_URL`

Cau truc chinh:

```text
apps/web/src/
  app/                    # App Router, route groups auth/app/dashboard/landing
  components/             # UI, dashboard, auth, trip detail
  hooks/                  # React hooks
  lib/                    # API clients, Supabase, format/logic helpers
  schemas/                # Schema validate
  stores/                 # Client stores
```

Route/UI dang co:

- Landing page.
- Auth: login, register, forgot password.
- Dashboard.
- Trips list va trip detail.
- Profile/settings/favorites/history/map/offers.
- Admin area.

Scripts root:

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
```

## Android app

Thu muc: `mobile/`

Cong nghe:

- Kotlin
- Jetpack Compose
- Gradle
- Supabase Auth/API backend

Cau truc chinh:

```text
mobile/app/src/main/java/com/wandertale/mobile/
  data/
    api/                  # HTTP/API clients
    local/                # Luu tru local/session
    model/                # Data models
    repository/           # Repository layer
  ui/
    components/           # Component Compose dung chung
    navigation/           # NavGraph/navigation
    screens/              # Man hinh app
    theme/                # Mau sac/theme
  util/                   # Format, trip utils, weather utils
  viewmodel/              # ViewModels
```

Man hinh/chuc nang:

- Auth login/register.
- Dashboard.
- Chuyen di sap toi/da qua.
- Tao chuyen AI.
- Chi tiet chuyen di.
- Yeu thich.
- Ho so.
- Admin/Business portal.

Lenh build/kiem tra hay dung:

```bash
cd mobile
JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home' ./gradlew :app:compileDebugKotlin
```

## iOS app

Thu muc: `apps/app-ios/`

Cong nghe:

- SwiftUI
- Native iOS app
- Supabase Auth
- Backend API

Cau truc chinh:

```text
apps/app-ios/WanderTale/
  App/                    # RootView, AppState
  Config/                 # AppConfig va cau hinh URL/key
  Models/                 # Models Codable
  Services/               # ApiService, SupabaseClient
  Theme/                  # PremiumTheme
  Utils/                  # FormatUtils, TripUtils
  Views/
    Auth/                 # Login/register/forgot password
    Dashboard/            # Dashboard
    Components/           # Components dung chung
    Main/                 # MainTabView, BottomNavBar
    Planner/              # Tao chuyen AI
    TripDetail/           # Chi tiet chuyen
    Trips/                # Danh sach chuyen
    Favorites/            # Yeu thich
    Profile/              # Ho so
    Portal/               # Admin/Business portal
    Settings/             # Cai dat
```

Luu y hien tai:

- Bottom navigation dung SwiftUI, co Liquid Glass/moving bubble cho tab selected.
- AppState preload dashboard/trips mot lan sau khi dang nhap, tranh reload khi doi tab.
- Supabase auth co retry ngan cho loi mang tam thoi nhu `NSURLErrorNetworkConnectionLost`.

Lenh build/kiem tra:

```bash
xcodebuild -project apps/app-ios/WanderTale.xcodeproj \
  -scheme WanderTale \
  -configuration Debug \
  -destination 'generic/platform=iOS' \
  CODE_SIGNING_ALLOWED=NO build
```

## Shared

Thu muc: `shared/`

Chua:

- `shared/types/index.ts`: type dung chung.
- `shared/constants/index.ts`: hang so dung chung.

Dung de giam lech contract giua web/backend.

## Supabase

Thu muc: `supabase/migrations/`

Chua migration database cho cac bang chuyen di, ho so, doi tac, voucher, quyen/portal... Tuy tung migration cu the, backend va client se doc/ghi thong qua Supabase REST/Auth va API backend.

Bien moi truong quan trong:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` neu backend can thao tac privileged
- `API_PUBLIC_URL`
- Cac key AI/maps/media tuy tinh nang: Gemini/Google Maps/Vietmap/Pexels...

## Luong du lieu chinh

1. Nguoi dung dang nhap/dang ky bang Supabase Auth.
2. App lay access token va goi backend bang `Authorization: Bearer <token>`.
3. Backend xac thuc token, doc/ghi Supabase.
4. Khi tao chuyen, backend dung AI + services lam giau du lieu de sinh itinerary.
5. Web/Android/iOS hien thi dashboard, trip list, trip detail va cap nhat UI tu API.

## Ghi chu phat trien

- Root repo dang la pnpm workspace cho web/shared/backend.
- Android la project Gradle rieng trong `mobile/`.
- iOS la Xcode project rieng trong `apps/app-ios/`.
- Thu muc Expo/React Native cu da khong con la app chinh; hien tai mobile chinh la Android native va iOS native.
- Khi doi format/trip logic dung chung nen kiem tra ca Android va iOS vi moi app co helper format rieng.
