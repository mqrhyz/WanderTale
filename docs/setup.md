# WanderTale — Setup

## Yêu cầu

- Node.js 20+
- pnpm 9+
- Tài khoản [Supabase](https://supabase.com) (Postgres + Auth + Storage)
- API keys: OpenAI, Google Maps Platform, OpenWeatherMap

## 1. Supabase

1. Tạo project mới.
2. Chạy migration trong `supabase/migrations/` (CLI: `supabase db push` hoặc dán SQL vào SQL Editor).
3. Chạy `supabase/seed.sql` cho partners + vouchers.
4. Lấy **URL**, **anon key**, **service role key**, **JWT secret** (Settings → API).

Bật **Email** provider trong Authentication.

## 2. Biến môi trường

Từ thư mục `wander-tale/`:

```bash
cp .env.example .env
```

Điền đầy đủ các biến trong `.env`. Web cần `NEXT_PUBLIC_*` trùng project Supabase. Android/iOS native đọc cấu hình riêng từ `mobile/local.properties` và `apps/app-ios/Config.xcconfig`.

## 3. Chạy local

```bash
pnpm install
pnpm dev:api    # Fastify :8000
pnpm dev:web    # Next.js :3000
```

Android native:

```bash
cd mobile
./gradlew :app:assembleDebug
```

iOS native:

```bash
cd apps/app-ios
xcodegen generate
open WanderTale.xcodeproj
```

Đảm bảo `BACKEND_CORS_ORIGINS` gồm `http://localhost:3000`. Android emulator dùng `API_URL=http://10.0.2.2:8000`; thiết bị thật và iOS thiết bị thật cần IP LAN của máy dev.

## 4. Admin

Sau khi đăng ký user đầu tiên, trong SQL Editor:

```sql
update public.profiles set is_admin = true where id = '<uuid>';
```

## 5. Triển khai

- **Web:** Vercel — set env giống `.env.example` (public + server nếu cần).
- **API:** Render / Railway — chạy `node dist/server.js` sau `npm run build` trong `backend/`.
- **DB:** Supabase hosted.

Xem thêm `docs/architecture.md` và `docs/api.md`.
