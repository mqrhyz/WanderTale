/** Placeholder ảnh công khai — picsum seed ổn định, Coil/ browser follow redirect. */
function ph(seed: string): string {
  return `https://picsum.photos/seed/wt-${seed}/640/640`;
}

export const CATEGORY_PLACEHOLDERS: Record<string, string[]> = {
  landmark: [ph("landmark-vn")],
  nature: [ph("nature-vn"), ph("nature-vn-2")],
  hotel: [ph("hotel-vn")],
  restaurant_pho: [ph("food-pho")],
  restaurant_bun_bo: [ph("food-bunbo")],
  restaurant_com: [ph("food-com")],
  restaurant_banh: [ph("food-banh")],
  restaurant_other: [ph("food-vn"), ph("food-vn-2")],
  cafe: [ph("cafe-vn"), ph("cafe-vn-2")],
  activity: [ph("activity-vn")],
  default: [ph("vietnam-default")],
};

export function getPlaceholderImage(category?: string | null, cuisineType?: string | null): string {
  const cat = (category ?? "").trim().toLowerCase();

  if (cat === "landmark") {
    return pickRandom(CATEGORY_PLACEHOLDERS.landmark!);
  }
  if (cat === "nature") {
    return pickRandom(CATEGORY_PLACEHOLDERS.nature!);
  }
  if (cat === "hotel") {
    return pickRandom(CATEGORY_PLACEHOLDERS.hotel!);
  }

  if (cat === "restaurant") {
    const key = cuisineType?.trim().toLowerCase()
      ? `restaurant_${cuisineType.trim().toLowerCase()}`
      : "restaurant_other";
    const list = CATEGORY_PLACEHOLDERS[key] ?? CATEGORY_PLACEHOLDERS.restaurant_other!;
    return pickRandom(list.length > 0 ? list : CATEGORY_PLACEHOLDERS.default!);
  }

  if (cat === "cafe") {
    return pickRandom(CATEGORY_PLACEHOLDERS.cafe!);
  }

  if (cat === "activity") {
    return pickRandom(CATEGORY_PLACEHOLDERS.activity!);
  }

  return pickRandom(CATEGORY_PLACEHOLDERS.default!);
}

function pickRandom(urls: string[]): string {
  if (urls.length === 0) return CATEGORY_PLACEHOLDERS.default![0]!;
  return urls[Math.floor(Math.random() * urls.length)]!;
}
