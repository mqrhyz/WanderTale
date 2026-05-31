# WanderTale — Build APK (Android Native)

## Chuẩn bị

1. Cài Android Studio + Android SDK.
2. Copy `mobile/local.properties.example` → `mobile/local.properties` nếu file mẫu có sẵn, hoặc tạo `mobile/local.properties`.
3. Điền cấu hình:

```properties
sdk.dir=/path/to/Android/sdk
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
API_URL=http://10.0.2.2:8000
```

- Emulator: `10.0.2.2` trỏ về localhost máy dev.
- Thiết bị thật: dùng IP LAN của máy dev hoặc URL backend public.

## Build APK debug

Từ repo root:

```bash
cd mobile
./gradlew :app:assembleDebug
```

APK xuất ra:

```text
mobile/app/build/outputs/apk/debug/app-debug.apk
```

## Build production

Mở `mobile/` bằng Android Studio → Build → Generate Signed App Bundle / APK.

Nếu muốn build release bằng CLI, thêm signing config trong `mobile/app/build.gradle.kts`, rồi chạy `./gradlew :app:assembleRelease`.

## Cài APK thiết bị thật

- Bật **Install unknown apps** cho trình duyệt / Files.
- Chép file `.apk` vào thiết bị và mở để cài.

## Gỡ lỗi

- **Network:** thiết bị phải truy cập được `API_URL` (không dùng `localhost` trên thiết bị thật).
- **Backend:** chạy `pnpm dev:api` ở repo root trước khi test luồng gọi API.
