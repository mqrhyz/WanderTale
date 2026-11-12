# WanderTale — Web and App (EXE202)

Frontend Next.js cho dự án WanderTale. Gọi backend API riêng (Fastify) — không nằm trong repo này.

## Cấu trúc

```
apps/web/     # Next.js 15 app
shared/       # Types/constants dùng chung
.env.example  # Mẫu biến môi trường (copy → .env)
```

## Yêu cầu

- Node.js ≥ 20
- pnpm 9.x
- Backend API chạy tại `http://127.0.0.1:8000` (hoặc `API_PUBLIC_URL`)

## Cài đặt

```bash
cp .env.example .env
# Điền SUPABASE_URL, SUPABASE_ANON_KEY (và API_PUBLIC_URL nếu deploy)

pnpm install
pnpm dev
```

Web: http://localhost:3000

## Biến môi trường

| Biến | Mô tả |
|------|--------|
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_ANON_KEY` | Anon/public key Supabase |
| `API_PUBLIC_URL` | URL backend (mặc định dev: `http://127.0.0.1:8000`) |

Web tự derive `NEXT_PUBLIC_*` từ root `.env` qua `apps/web/next.config.ts`.

## Build production

```bash
pnpm build
pnpm start
```
