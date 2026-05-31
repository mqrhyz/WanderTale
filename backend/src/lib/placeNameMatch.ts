import { normalizePlaceTitle } from "../services/placeMediaWikimedia.js";

function normalizeForMatch(text: string): string {
  return normalizePlaceTitle(text)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 0..1 — overlap token giữa tên slot và label Wikidata/Maps. */
export function fuzzyPlaceNameScore(slotTitle: string, candidateLabel: string): number {
  const a = normalizeForMatch(slotTitle);
  const b = normalizeForMatch(candidateLabel);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.95;

  const wordsA = new Set(a.split(" ").filter((w) => w.length > 1));
  const wordsB = b.split(" ").filter((w) => w.length > 1);
  if (wordsB.length === 0) return 0;

  const overlap = wordsB.filter((w) => wordsA.has(w)).length;
  const score = overlap / wordsB.length;
  const reverse = overlap / Math.max(wordsA.size, 1);
  return Math.max(score, reverse * 0.85);
}

export function placeNamesMatch(slotTitle: string, candidateLabel: string, minScore = 0.7): boolean {
  return fuzzyPlaceNameScore(slotTitle, candidateLabel) >= minScore;
}
