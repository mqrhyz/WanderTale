# WanderTale — UI / UX

Giao diện web (`apps/web`) dùng **token** lấy cảm hứng từ [`DESIGN.md`](../../../DESIGN.md) ở gốc repo EXE202:

- Nền **canvas** kem (`#f7f7f4`), chữ **ink** ấm (`#26251e`), body `#5a5852`.
- **Primary** Cursor Orange (`#f54e00`) chỉ cho CTA / link nhấn mạnh — dùng tiết kiệm.
- **Không shadow**; độ sâu bằng viền **hairline** (`#e6e5e0`).
- **Typography:** Inter (thay CursorGothic theo ghi chú DESIGN), JetBrains Mono cho `font-mono`.
- **Timeline chuyến đi:** pastel Thinking / Read / Edit / Grepping (chỉ trong khối timeline itinerary, đúng phạm vi DESIGN).

Trang marketing `/` dùng palette tối + cream (`text-primary` / `primary` trong Tailwind) và font **Almarai** trong route group `src/app/(landing)/` — tách khỏi shell app `wt-*` (xem `WanderTaleStudioLanding` và `globals.css` `.noise-overlay` / `.bg-noise`).

Class tiện ích: `wt-container`, `wt-card`, `wt-field-input`, `wt-kicker`, v.v. trong `src/app/globals.css`. Màu Tailwind: `wt-*` trong `tailwind.config.ts`.
