const GENERIC_TITLE =
  /^(buổi sáng|buổi chiều|buổi tối|sáng|chiều|tối|tham quan|khám phá|hoạt động|check-in|mua sắm|phố đi bộ|thư giãn|ăn trưa|ăn tối|ẩm thực|café|cafe|điểm check-in|công viên \/ view|khám phá tại)/i;

export function isGenericAgendaTitle(title: string | undefined | null): boolean {
  const t = title?.trim() ?? "";
  if (!t || t === "—") return true;
  if (GENERIC_TITLE.test(t)) return true;
  if (/buổi (sáng|chiều|tối)/i.test(t)) return true;
  if (/^ngày \d+/i.test(t)) return true;
  if (/tham quan.*(sáng|chiều|tối)/i.test(t)) return true;
  if (/ăn (trưa|tối).*(&|và|\/)/i.test(t)) return true;
  if (/phố đi bộ.*(cafe|tối)/i.test(t)) return true;
  if (/check-in|điểm check-in|công viên \/ view|thư giãn|hoạt động chiều|ẩm thực địa phương/i.test(t)) {
    return true;
  }
  return false;
}

/** Mô tả "khung" lặp lại (fallback) — coi như chưa có mô tả riêng để thay bằng mô tả theo địa điểm. */
const GENERIC_SUMMARY =
  /trải nghiệm không thể bỏ lỡ|gợi ý khám phá|khám phá điều thú vị|lịch khung|gợi ý khám phá tại|khám phá tại/i;

export function isGenericPlaceSummary(summary: string | undefined | null): boolean {
  const t = summary?.trim() ?? "";
  if (!t) return true;
  return GENERIC_SUMMARY.test(t);
}

/**
 * Sinh mô tả ngắn theo TỪNG địa điểm (best-effort, không cần LLM) — dùng khi summary
 * còn trống hoặc là text khung lặp lại. Mỗi địa điểm có mô tả khác nhau (chọn theo tên)
 * và nhắc đúng tên + điểm đến.
 */
export function describePlaceShort(
  name: string,
  type: string | undefined,
  destination: string
): string {
  const place = name.trim();
  if (!place) return "";
  const dest = destination.trim();
  const t = (type ?? "").toLowerCase();
  const isFood = /restaurant|cafe|food|nhà hàng|quán|ăn|ẩm thực/.test(t);
  const isNature = /nature|hồ|thác|núi|biển|rừng|công viên|vịnh|đảo/.test(t);

  const foodTemplates = [
    `Thưởng thức món ngon đặc trưng tại ${place} — không gian thoải mái, hợp dừng chân nghỉ ngơi.`,
    `${place} là địa chỉ ẩm thực đáng thử${dest ? ` ở ${dest}` : ""} với hương vị địa phương khó quên.`,
    `Ghé ${place} để nếm thử đặc sản, giá hợp lý và phục vụ thân thiện.`,
  ];
  const natureTemplates = [
    `${place} mang vẻ đẹp thiên nhiên đặc trưng${dest ? ` của ${dest}` : ""} — lý tưởng để dạo bộ và chụp ảnh.`,
    `Tận hưởng không khí trong lành tại ${place}, một trong những điểm thiên nhiên được yêu thích.`,
    `Ghé ${place} để ngắm cảnh và thư giãn giữa khung cảnh khoáng đạt.`,
  ];
  const attractionTemplates = [
    `${place} là điểm đến nổi bật${dest ? ` tại ${dest}` : ""} — không gian đẹp, đáng để tham quan và lưu lại khoảnh khắc.`,
    `Khám phá ${place}, một địa điểm được nhiều du khách ghé thăm khi đến${dest ? ` ${dest}` : " đây"}.`,
    `Dừng chân tại ${place} để cảm nhận nét đặc trưng${dest ? ` của ${dest}` : ""} và tận hưởng trải nghiệm thú vị.`,
  ];

  const pool = isFood ? foodTemplates : isNature ? natureTemplates : attractionTemplates;
  let hash = 0;
  for (let i = 0; i < place.length; i++) hash = (hash + place.charCodeAt(i)) % pool.length;
  return pool[hash] ?? pool[0]!;
}
