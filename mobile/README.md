# WanderTale Android (Native)

Ứng dụng Android native **Kotlin + Jetpack Compose**, dùng chung backend Fastify và Supabase với web.

## Tính năng (parity web)

| Tính năng | Mô tả |
|-----------|--------|
| Auth | Đăng nhập, đăng ký, quên mật khẩu (Supabase) |
| Dashboard | Thống kê `GET /api/dashboard` |
| Lên kế hoạch | Form tạo trip + preview weather |
| Trip detail | Agenda, OTA hotels, vouchers, poll nền 2.5s |
| Yêu thích | Local DataStore (giống web localStorage) |
| Lịch sử | Trip đã qua |
| Hồ sơ | Cập nhật `profiles` qua Supabase |
| Cài đặt | Light mode only |
| Voucher | `GET /api/vouchers` |
| Admin | Partners + vouchers (Supabase, `is_admin`) |
| Hotel Agent | Chat + interrupt/resume OTA agent |

## Cấu trúc

```
mobile/
  app/src/main/java/com/wandertale/mobile/
    data/          # API Ktor, Supabase, models
    ui/screens/    # Màn hình Compose
    ui/navigation/ # NavHost
    util/          # Format, trip polling helpers
```

## Thiết lập

1. Copy `local.properties.example` → `local.properties`
2. Điền từ `wander-tale/.env`:

```properties
sdk.dir=/path/to/Android/sdk
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
API_URL=http://10.0.2.2:8000
```

- **Emulator**: `10.0.2.2` = localhost máy dev
- **Thiết bị thật**: IP LAN máy dev, vd `http://192.168.1.10:8000`

3. Chạy backend + Supabase:

```bash
cd wander-tale
pnpm dev:api
# hoặc: cd backend && npm run dev
```

4. Mở `mobile/` trong **Android Studio** → Run app

Hoặc CLI:

```bash
cd mobile
./gradlew :app:assembleDebug
```

## Backend CORS

Thêm origin Android nếu cần trong `.env`:

```
BACKEND_CORS_ORIGINS=http://localhost:3000,http://10.0.2.2:8000
```

## Lưu ý

- Cùng database Supabase (`trips`, `profiles`, `vouchers`, …)
- Token Bearer từ Supabase session gọi `/api/*`
- Hotel Agent timeout 5 phút (giống web)
- Bản Expo/React Native cũ đã được bỏ; project Android native chính nằm ở **`mobile/`**
