# @wander-tale/hotel-booking-agent

LangGraph agent đặt phòng khách sạn tại Việt Nam — **Gemini 2.5 Flash** (round-robin 3 API keys) + **Playwright** (3 tab song song: Booking, Agoda, Vntrip).

## Cấu trúc thư mục

```
packages/hotel-booking-agent/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts              # Public exports
    ├── agent.ts              # StateGraph + run/resume API
    ├── cli.ts                # Demo CLI
    ├── state.ts              # State + Annotation
    ├── config/
    │   ├── env.ts
    │   └── gemini-pool.ts    # Round-robin 3 keys
    ├── prompts/
    │   └── system.ts         # System prompt
    ├── tools/
    │   ├── playwright-browser.ts
    │   ├── search-hotel.ts
    │   ├── extract-prices.ts
    │   ├── compare-prices.ts
    │   ├── fill-form.ts
    │   └── index.ts
    ├── sites/
    │   └── registry.ts       # Booking, Agoda, Vntrip
    └── nodes/
        └── graph-nodes.ts    # LangGraph nodes
```

## Luồng (human-in-the-loop)

1. Parse tiêu chí (Gemini)
2. **Confirm** → quét song song Booking/Agoda/Vntrip qua Playwright (3 tab cùng context)
3. So sánh giá (sort theo `priceVnd`, không gọi AI)
4. **Confirm** chọn phòng
5. **Confirm** điền form
6. Auto-fill (dừng trước thanh toán) → link / QR handoff

## Biến môi trường

Thêm vào `wander-tale/.env`:

```env
GEMINI_API_KEY_1=...
GEMINI_API_KEY_2=...
GEMINI_API_KEY_3=...
GEMINI_MODEL=gemini-2.5-flash-lite

# false = quét giá thật (Playwright). true = chặn scrape (chỉ dùng khi debug)
HOTEL_AGENT_DEMO_MODE=false

HOTEL_AGENT_HEADLESS=true
HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS=35000
HOTEL_AGENT_SCAN_WAIT_MS=10000
HOTEL_AGENT_BLOCK_RESOURCES=false
HOTEL_AGENT_SITES=booking,agoda,vntrip
```

**Quét giá:** 3 tab Playwright song song (lite — chặn ảnh/font, scroll nhẹ cho Vntrip). Tổng ~25–40s. **So sánh:** thuật toán trong code (không dùng AI).

## Cài đặt

```bash
cd wander-tale
pnpm install
pnpm --filter @wander-tale/hotel-booking-agent exec playwright install chromium
```

## CLI demo

```bash
pnpm --filter @wander-tale/hotel-booking-agent cli
```

## Dùng trên localhost (UI)

1. Terminal 1 — API:
   ```bash
   cd wander-tale && pnpm dev:api
   ```
2. Terminal 2 — Web:
   ```bash
   cd wander-tale && pnpm dev:web
   ```
3. Đăng nhập → mở **http://localhost:3000/ai**
4. Nhập yêu cầu đặt phòng → bấm **Xác nhận** từng bước.

`.env` cần: `NEXT_PUBLIC_API_URL=http://localhost:8000`, `GEMINI_API_KEY_1..3`, `HOTEL_AGENT_DEMO_MODE=false` để quét giá thật. UI hiển thị **nhật ký ngày giờ** (quét / so sánh / điền form) và link thanh toán OTA thật.

**Lưu ý:** Quét thật mất 30–90 giây; OTA có thể chặn bot/CAPTCHA — cần `playwright install chromium`.

## API (backend)

- `POST /api/hotel-agent/run` — `{ threadId?, message, userProfile? }`
- `POST /api/hotel-agent/resume` — `{ threadId, resume }`
- `GET /api/hotel-agent/state/:threadId`

## Lưu ý production

- DOM các OTA thay đổi thường xuyên — cập nhật selector trong `sites/registry.ts`.
- CAPTCHA / anti-bot: agent báo lỗi và chuyển user sang thanh toán thủ công.
- Không lưu thẻ / không submit thanh toán thay user.
