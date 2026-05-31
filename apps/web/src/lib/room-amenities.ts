const AMENITY_NOISE_RE =
  /^(\+\d[\d\s]*|xem th(?:êm|em)|show more|see all|see more|tiện nghi khác|more amenities)$/i;
const AMENITY_COUNT_RE = /^\+\s*\d+|^\d+\s*tiện (?:nghi|ích)/i;

function normalizeAmenityKey(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s./[\]-]/gu, "");
}

function isAmenityNoise(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 2) return true;
  if (AMENITY_NOISE_RE.test(t)) return true;
  if (AMENITY_COUNT_RE.test(t)) return true;
  if (/^\+/.test(t) && /\d/.test(t)) return true;
  return false;
}

function splitAmenityParts(text: string): string[] {
  return text
    .split(/\s*[|•·]\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2 && !isAmenityNoise(p));
}

/** Khử trùng + tách tiện nghi phòng trước khi render UI. */
export function dedupeRoomAmenities(items: string[] | undefined | null, roomName?: string | null): string[] {
  if (!items?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  if (roomName) {
    for (const part of splitAmenityParts(roomName)) {
      const key = normalizeAmenityKey(part);
      if (key) seen.add(key);
    }
  }

  for (const raw of items) {
    for (const part of splitAmenityParts(raw)) {
      const key = normalizeAmenityKey(part);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(part.replace(/\s+/g, " ").trim());
    }
  }

  return out;
}
