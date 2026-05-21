const STORAGE_KEY = "wander-tale-favorite-trips";

export function getFavoriteTripIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function setFavoriteTripIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function toggleFavoriteTripId(id: string): string[] {
  const current = getFavoriteTripIds();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  setFavoriteTripIds(next);
  return next;
}

export function isFavoriteTripId(id: string): boolean {
  return getFavoriteTripIds().includes(id);
}
