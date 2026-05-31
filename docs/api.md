# WanderTale — API (Fastify)

Base URL: `NEXT_PUBLIC_API_URL` trên web, `API_URL` trong cấu hình Android/iOS native (ví dụ `http://localhost:8000`).

Tất cả endpoint (trừ health) cần header:

`Authorization: Bearer <supabase_access_token>`

## Health

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/health` | Kiểm tra service |

## Trips

| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/api/trips/generate` | Tạo itinerary AI + lưu DB (Google, OpenWeather, OpenAI) |
| GET | `/api/trips` | Danh sách chuyến của user |
| GET | `/api/trips/:tripId` | Chi tiết + `trip_days` + activities |
| PUT | `/api/trips/:tripId` | Cập nhật metadata / itinerary JSON |
| DELETE | `/api/trips/:tripId` | Xóa chuyến |
| POST | `/api/trips/:tripId/duplicate` | Nhân đôi chuyến |

### POST `/api/trips/generate` (JSON)

- `destination` (string)
- `start_date`, `end_date` (`YYYY-MM-DD`)
- `budget` (number)
- `preferences`: `{ "tags": ["nature","food",...] }`
- `travelers` (int)
- `pace`: `relaxed` | `balanced` | `packed`

## Weather & Places

| Method | Path | Query |
|--------|------|--------|
| GET | `/api/weather` | `lat`, `lon` |
| GET | `/api/places` | `query`, optional `lat`, `lng` |

## Vouchers

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/vouchers` | Voucher đang hiệu lực (join partner) |

## Dashboard

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/dashboard` | Thống kê tổng hợp cho user |

Chi tiết schema request/response nằm trong `backend/src/schemas` và `backend/src/routes`.
