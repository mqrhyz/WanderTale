/** Loại phòng khách sạn — dùng chung form kế hoạch & agent đặt phòng */
export const ROOM_TYPES = [
  { value: "", label: "Bất kỳ" },
  { value: "Dorm Room", label: "Dorm / Phòng tập thể" },
  { value: "Single Room", label: "Phòng đơn (Single)" },
  { value: "Superior Double Room", label: "Phòng đôi tiêu chuẩn (Superior Double)" },
  { value: "Deluxe Double Room", label: "Phòng đôi cao cấp (Deluxe Double)" },
  { value: "Superior Family Room", label: "Phòng gia đình (Superior Family)" },
  { value: "Suite", label: "Suite / Villa" },
] as const;
