import type { Card, Id } from "../types";

interface HistoryEntry {
  cardId: Id;
  continuityGroup: string | null;
  anatomyFocus: string | null;
  variantGroup: string | null;
  lastSeen: number;
  seenCount: number;
}

const STORAGE_KEY = "te-animas-card-history-v3";
const LEGACY_STORAGE_KEY = "te-animas-card-history-v2";
const MAX_ENTRIES = 500;

function parseEntries(raw: string | null): HistoryEntry[] {
  try {
    const value = JSON.parse(raw || "[]");
    if (!Array.isArray(value)) return [];

    return value
      .filter((item) => item && typeof item.cardId === "string")
      .map((item) => ({
        cardId: item.cardId,
        continuityGroup:
          typeof item.continuityGroup === "string"
            ? item.continuityGroup
            : null,
        anatomyFocus:
          typeof item.anatomyFocus === "string" ? item.anatomyFocus : null,
        variantGroup:
          typeof item.variantGroup === "string" ? item.variantGroup : null,
        lastSeen: typeof item.lastSeen === "number" ? item.lastSeen : 0,
        seenCount: typeof item.seenCount === "number" ? item.seenCount : 1,
      }));
  } catch {
    return [];
  }
}

function readEntries(): HistoryEntry[] {
  try {
    if (typeof localStorage === "undefined") return [];

    const current = parseEntries(localStorage.getItem(STORAGE_KEY));
    if (current.length) return current;

    return parseEntries(localStorage.getItem(LEGACY_STORAGE_KEY));
  } catch {
    return [];
  }
}

function writeEntries(entries: HistoryEntry[]) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_ENTRIES)),
    );
  } catch {
    // La partida puede continuar sin historial persistente.
  }
}

export function recordCardSeen(
  card: Pick<Card, "id" | "gm_continuity_group" | "anatomy_focus" | "variant_group">,
): void {
  const now = Date.now();
  const entries = readEntries();
  const previous = entries.find((entry) => entry.cardId === card.id);
  const next: HistoryEntry = {
    cardId: card.id,
    continuityGroup: card.gm_continuity_group,
    anatomyFocus: card.anatomy_focus,
    variantGroup: card.variant_group,
    lastSeen: now,
    seenCount: (previous?.seenCount || 0) + 1,
  };

  writeEntries([next, ...entries.filter((entry) => entry.cardId !== card.id)]);
}

export function recentCardIds(limit = 240): Id[] {
  return readEntries()
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, limit)
    .map((entry) => entry.cardId);
}

export function recentContinuityGroups(limit = 100): string[] {
  return readEntries()
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, limit)
    .map((entry) => entry.continuityGroup)
    .filter((value): value is string => Boolean(value));
}

export function recentVariantGroups(limit = 100): string[] {
  return readEntries()
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, limit)
    .map((entry) => entry.variantGroup)
    .filter((value): value is string => Boolean(value));
}

export function recentAnatomyFocuses(limit = 100): string[] {
  return readEntries()
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, limit)
    .map((entry) => entry.anatomyFocus)
    .filter(
      (value): value is string =>
        Boolean(value) && value !== "none" && value !== "body",
    );
}

function countRecent(
  values: Array<string | null>,
  expected: string | null | undefined,
): number {
  if (!expected) return 0;
  return values.filter((value) => value === expected).length;
}

export function cardHistoryPenalty(
  card: Pick<Card, "id" | "gm_continuity_group" | "anatomy_focus" | "variant_group">,
): number {
  const entries = readEntries()
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, 160);
  const entry = entries.find((item) => item.cardId === card.id);

  let penalty = 0;
  if (entry) {
    const ageDays = Math.max(0, (Date.now() - entry.lastSeen) / 86_400_000);
    penalty += Math.max(0, 22 - ageDays * 3);
    penalty += Math.min(16, entry.seenCount * 3);
  }

  const groupCount = countRecent(
    entries.slice(0, 80).map((item) => item.continuityGroup),
    card.gm_continuity_group,
  );
  const anatomyCount = countRecent(
    entries.slice(0, 60).map((item) => item.anatomyFocus),
    card.anatomy_focus,
  );
  const variantCount = countRecent(
    entries.slice(0, 100).map((item) => item.variantGroup),
    card.variant_group,
  );

  penalty += Math.min(15, groupCount * 1.9);
  penalty += Math.min(24, variantCount * 6);
  if (card.anatomy_focus !== "none" && card.anatomy_focus !== "body") {
    penalty += Math.min(8, anatomyCount * 0.85);
  }

  return penalty;
}

export function preferFreshCards<
  T extends Pick<Card, "id" | "gm_continuity_group" | "anatomy_focus" | "variant_group">,
>(cards: T[], minimumPool = 18): T[] {
  const recent = new Set(recentCardIds());
  const recentVariants = new Set(recentVariantGroups());
  const fresh = cards.filter(
    (card) =>
      !recent.has(card.id) &&
      (!card.variant_group || !recentVariants.has(card.variant_group)),
  );

  if (fresh.length >= minimumPool) {
    return fresh.sort((a, b) => cardHistoryPenalty(a) - cardHistoryPenalty(b));
  }

  return [...cards].sort(
    (a, b) => cardHistoryPenalty(a) - cardHistoryPenalty(b),
  );
}
