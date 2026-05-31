/** Tên hiển thị chuẩn cho OTA search (textToSearch / ss). */
export const OTA_CITY_LABELS: Record<string, string> = {
  "da lat": "Đà Lạt",
  "ho chi minh": "TP. Hồ Chí Minh",
  "sai gon": "TP. Hồ Chí Minh",
  "ha noi": "Hà Nội",
  "da nang": "Đà Nẵng",
  "nha trang": "Nha Trang",
  "phu quoc": "Phú Quốc",
  "hoi an": "Hội An",
  "vung tau": "Vũng Tàu",
  hue: "Huế",
  sapa: "Sa Pa",
  "ha long": "Hạ Long",
  "can tho": "Cần Thơ",
  "quy nhon": "Quy Nhon",
  "phan thiet": "Phan Thiết",
  "mui ne": "Mũi Né",
};

/** Tọa độ trung tâm du lịch — tránh VietMap nhầm (vd. "Đà Lạt" + focus Đà Nẵng → "Rau Đà Lạt"). */
export const CITY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "da lat": { lat: 11.9404, lng: 108.4583 },
  "ho chi minh": { lat: 10.7769, lng: 106.7009 },
  "sai gon": { lat: 10.7769, lng: 106.7009 },
  "ha noi": { lat: 21.0285, lng: 105.8542 },
  "da nang": { lat: 16.0544, lng: 108.2022 },
  "nha trang": { lat: 12.2388, lng: 109.1967 },
  "phu quoc": { lat: 10.2899, lng: 103.984 },
  "hoi an": { lat: 15.8801, lng: 108.338 },
  "vung tau": { lat: 10.4113, lng: 107.1362 },
  hue: { lat: 16.4637, lng: 107.5909 },
  sapa: { lat: 22.3364, lng: 103.8448 },
  "ha long": { lat: 20.9714, lng: 107.0448 },
  "can tho": { lat: 10.0452, lng: 105.7469 },
  "quy nhon": { lat: 13.782, lng: 109.219 },
  "phan thiet": { lat: 10.928, lng: 108.102 },
  "mui ne": { lat: 10.955, lng: 108.298 },
};

/** Tỉnh / vùng → thành phố du lịch chính (Agoda cityId + Vntrip slug). */
export const PROVINCE_TO_CITY: Record<string, string> = {
  "lam dong": "da lat",
  "khanh hoa": "nha trang",
  "kien giang": "phu quoc",
  "quang nam": "hoi an",
  "ba ria vung tau": "vung tau",
  "thua thien hue": "hue",
  "lao cai": "sapa",
  "quang ninh": "ha long",
  "binh thuan": "phan thiet",
};

const ADMIN_PREFIX_RE = /^(thanh pho|tp\.?|tinh|quan|huyen|phuong|thi tran)\s+/;

/** Agoda cityId — fallback khi tìm theo tên không ổn định */
export const AGODA_CITY_IDS: Record<string, number> = {
  "da lat": 15932,
  "ho chi minh": 13170,
  "sai gon": 13170,
  "ha noi": 2758,
  "da nang": 16440,
  "nha trang": 2679,
  "phu quoc": 17188,
  "hoi an": 16441,
  "vung tau": 9533,
  "hue": 16442,
  "sapa": 16443,
  "ha long": 16444,
  "can tho": 16445,
  "quy nhon": 16446,
  "phan thiet": 16447,
  "mui ne": 16447,
};

/** Vntrip search keyword — slug TỈNH (Vntrip dùng cấp tỉnh) */
export const VNTRIP_CITY_SLUGS: Record<string, string> = {
  "da lat": "lam-dong",
  "ho chi minh": "ho-chi-minh",
  "sai gon": "ho-chi-minh",
  "ha noi": "ha-noi",
  "da nang": "da-nang",
  "nha trang": "khanh-hoa",
  "phu quoc": "kien-giang",
  "hoi an": "quang-nam",
  "vung tau": "ba-ria-vung-tau",
  "hue": "thua-thien-hue",
  "sapa": "lao-cai",
  "ha long": "quang-ninh",
};

/**
 * Bỏ dấu tiếng Việt + lowercase + trim.
 * Lưu ý: `Đ`/`đ` không decompose qua NFD nên phải replace tay,
 * nếu không "Đà Lạt" → "đa lat" (sai key).
 */
export function normalizeCityKey(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

function resolveSingleCityKey(key: string): string | null {
  if (!key || key === "viet nam" || key === "vn") return null;

  if (AGODA_CITY_IDS[key] || VNTRIP_CITY_SLUGS[key]) return key;
  if (PROVINCE_TO_CITY[key]) return PROVINCE_TO_CITY[key]!;

  const stripped = key.replace(ADMIN_PREFIX_RE, "").trim();
  if (stripped && stripped !== key) {
    const fromStripped = resolveSingleCityKey(stripped);
    if (fromStripped) return fromStripped;
  }

  for (const known of Object.keys(AGODA_CITY_IDS)) {
    if (key.includes(known)) return known;
  }
  for (const [prov, city] of Object.entries(PROVINCE_TO_CITY)) {
    if (key.includes(prov)) return city;
  }

  return null;
}

/** Chuẩn hóa tên điểm đến (VietMap autocomplete, tỉnh/thành phố) → key OTA. */
export function resolveCityKey(destination: string): string {
  const trimmed = destination.trim();
  if (!trimmed) return "";

  const segments = trimmed
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const resolved = resolveSingleCityKey(normalizeCityKey(segment));
    if (resolved) return resolved;
  }

  const whole = resolveSingleCityKey(normalizeCityKey(trimmed));
  if (whole) return whole;

  const fallback = segments[0] ?? trimmed;
  return normalizeCityKey(fallback.replace(ADMIN_PREFIX_RE, "").trim() || fallback);
}

/** Nhãn thành phố dùng khi build URL OTA (Booking/Agoda/Vntrip). */
export function otaSearchLabel(destination: string): string {
  const key = resolveCityKey(destination);
  return OTA_CITY_LABELS[key] ?? destination.split(",")[0]?.trim() ?? destination.trim();
}

/** Focus GPS ưu tiên cho geocode VietMap — dùng centroid đã biết, tránh bias sai thành phố. */
export function resolveCityFocus(
  destination: string
): { lat: number; lng: number; label: string; key: string } | null {
  const key = resolveCityKey(destination);
  if (!key) return null;
  const centroid = CITY_CENTROIDS[key];
  if (!centroid) return null;
  return { ...centroid, label: OTA_CITY_LABELS[key] ?? otaSearchLabel(destination), key };
}
