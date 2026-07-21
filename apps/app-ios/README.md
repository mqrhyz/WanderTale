# WanderTale iOS (SwiftUI)

Ứng dụng iOS native **Swift + SwiftUI**, port từ app Kotlin (`mobile/`), dùng chung backend Fastify và Supabase.

## Tính năng (parity Android)

| Tính năng | Mô tả |
|-----------|--------|
| Auth | Đăng nhập, đăng ký, quên mật khẩu (Supabase REST) |
| Dashboard | Thống kê `GET /api/dashboard`, chuyến gần đây |
| Tab chính | Home, Chuyến đi, FAB tạo trip, Yêu thích, Hồ sơ |
| Lên kế hoạch | Form AI + autocomplete địa điểm |
| Trip detail | Ô chọn ngày, agenda, khách sạn OTA, nhân bản/xóa |
| Yêu thích | UserDefaults |
| Hồ sơ | Cập nhật phone qua Supabase REST |
| Cài đặt | Light mode only |
| Admin | Partners + vouchers (nếu `is_admin`) |

## Cấu trúc

```
apps/app-ios/
  project.yml              # XcodeGen
  Config.xcconfig.example
  WanderTale/
    WanderTaleApp.swift
    App/                   # AppState, RootView
    Config/                # AppConfig
    Models/
    Services/              # Supabase, API, Keychain
    Theme/                 # PremiumTheme (cam)
    Utils/
    Views/                 # Splash, Auth, Dashboard, …
```

## Thiết lập

### 1. Cấu hình

```bash
cd apps/app-ios
cp Config.xcconfig.example Config.xcconfig
```

Chỉnh `Config.xcconfig` (lấy từ `wander-tale/.env`):

```
# Trong xcconfig, // bị hiểu là comment — dùng /$()/ thay cho //
SUPABASE_URL = https:/$()/xxx.supabase.co
SUPABASE_ANON_KEY = eyJ...
API_URL = http:/$()/127.0.0.1:8000
```

- **Simulator**: `127.0.0.1:8000` hoặc IP máy dev
- **Thiết bị thật**: IP LAN máy dev, vd `http://192.168.1.10:8000`

### 2. Tạo project Xcode (XcodeGen)

```bash
brew install xcodegen   # một lần
cd apps/app-ios
xcodegen generate
open WanderTale.xcodeproj
```

Nếu không dùng XcodeGen: tạo project **App → iOS → SwiftUI** trong Xcode, add toàn bộ file trong `WanderTale/`, copy `Info.plist` keys và `Config.xcconfig`.

### 3. Chạy backend

```bash
cd wander-tale
pnpm dev:api
```

### 4. Run

Xcode → chọn simulator → **Run** (⌘R).

## Lưu ý

- Không dùng SDK Supabase Swift — auth/profile qua REST (giảm dependency).
- Token lưu Keychain; favorites UserDefaults.
- Poll ảnh/OTA chỉ trong 30 phút sau tạo chuyến (giống Android/web).
- Cần **Mac + Xcode 15+**, iOS 17+.

## So sánh với Android

| Android (`mobile/`) | iOS (`apps/app-ios/`) |
|---------------------|------------------------|
| Jetpack Compose | SwiftUI |
| Ktor | URLSession |
| Supabase Kotlin SDK | Supabase REST |
| DataStore | UserDefaults + Keychain |
