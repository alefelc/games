import type { Card, Id } from "../types";

/**
 * Produces the identity players perceive on screen. Directus may contain two
 * records with different IDs for sex/mode targeting but exactly the same copy.
 * Those records must never appear twice in one session.
 */
export function normalizeVisibleCardText(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("es-AR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function visibleCardFingerprint(
  card: Pick<Card, "text">,
): string {
  return normalizeVisibleCardText(card.text);
}

export function usedVisibleCardFingerprints(
  cards: readonly Card[],
  usedCardIds: Iterable<Id>,
): Set<string> {
  const ids = new Set(Array.from(usedCardIds, String));
  const fingerprints = new Set<string>();

  for (const card of cards) {
    if (!ids.has(String(card.id))) continue;
    const fingerprint = visibleCardFingerprint(card);
    if (fingerprint) fingerprints.add(fingerprint);
  }

  return fingerprints;
}
