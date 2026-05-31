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
