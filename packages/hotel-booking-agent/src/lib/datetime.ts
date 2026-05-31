const VN_TZ = "Asia/Ho_Chi_Minh";

/** Hiển thị ngày giờ quét / điền form theo giờ Việt Nam */
export function formatVietnamDateTime(iso?: string | Date): string {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TZ,
    dateStyle: "short",
    timeStyle: "medium",
  }).format(d);
}

export function nowIso(): string {
  return new Date().toISOString();
}
