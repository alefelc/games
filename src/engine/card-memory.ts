import type { Card, Id } from "../types";

export type CardPreference = "favorite" | "blocked" | "later" | null;

interface MemoryEntry {
  cardId: Id;
  variantGroup: string | null;
  sessionOrdinal: number;
  lastSeen: number;
}

interface MemoryState {
  version: 1;
  currentSessionId: string | null;
  sessionOrdinal: number;
  entries: MemoryEntry[];
  preferences: Record<string, Exclude<CardPreference, null>>;
}

const STORAGE_KEY = "te-animas-card-memory-v4";
const EMPTY: MemoryState = {
  version: 1,
  currentSessionId: null,
  sessionOrdinal: 0,
  entries: [],
  preferences: {},
};

function readState(): MemoryState {
  try {
    if (typeof localStorage === "undefined") return { ...EMPTY, entries: [], preferences: {} };
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Partial<MemoryState> | null;
    if (!parsed || parsed.version !== 1) return { ...EMPTY, entries: [], preferences: {} };
    return {
      version: 1,
      currentSessionId: typeof parsed.currentSessionId === "string" ? parsed.currentSessionId : null,
      sessionOrdinal: Number.isInteger(parsed.sessionOrdinal) ? Math.max(0, Number(parsed.sessionOrdinal)) : 0,
      entries: Array.isArray(parsed.entries)
        ? parsed.entries
            .filter((entry): entry is MemoryEntry => Boolean(entry && typeof entry.cardId === "string"))
            .slice(0, 1200)
        : [],
      preferences: parsed.preferences && typeof parsed.preferences === "object" ? parsed.preferences : {},
    };
  } catch {
    return { ...EMPTY, entries: [], preferences: {} };
  }
}

function writeState(state: MemoryState) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, entries: state.entries.slice(0, 1200) }));
  } catch {
    // El juego sigue funcionando sin almacenamiento persistente.
  }
}

export function beginMemorySession(sessionId: string) {
  const state = readState();
  if (state.currentSessionId === sessionId) return;
  writeState({ ...state, currentSessionId: sessionId, sessionOrdinal: state.sessionOrdinal + 1 });
}

export function rememberCardInSession(
  card: Pick<Card, "id" | "variant_group">,
  sessionId: string,
) {
  beginMemorySession(sessionId);
  const state = readState();
  const entry: MemoryEntry = {
    cardId: card.id,
    variantGroup: card.variant_group ?? null,
    sessionOrdinal: state.sessionOrdinal,
    lastSeen: Date.now(),
  };
  writeState({
    ...state,
    entries: [entry, ...state.entries.filter((item) => item.cardId !== card.id)].slice(0, 1200),
  });
}

export function getCardPreference(cardId: Id): CardPreference {
  return readState().preferences[String(cardId)] ?? null;
}

export function setCardPreference(cardId: Id, preference: CardPreference) {
  const state = readState();
  const preferences = { ...state.preferences };
  if (preference) preferences[String(cardId)] = preference;
  else delete preferences[String(cardId)];
  writeState({ ...state, preferences });
}

export function isCardBlocked(cardId: Id) {
  return getCardPreference(cardId) === "blocked";
}

function sessionsSince(entry: MemoryEntry, currentOrdinal: number) {
  return Math.max(0, currentOrdinal - entry.sessionOrdinal);
}

export function isCardCoolingDown(
  card: Pick<Card, "id" | "variant_group" | "cooldown_sessions">,
): boolean {
  const state = readState();
  const cooldown = Math.max(0, Number(card.cooldown_sessions ?? 0));
  if (cooldown === 0) return false;
  return state.entries.some((entry) => {
    const sameCard = entry.cardId === card.id;
    const sameVariant = Boolean(card.variant_group && entry.variantGroup === card.variant_group);
    return (sameCard || sameVariant) && sessionsSince(entry, state.sessionOrdinal) <= cooldown;
  });
}

export function applyCardMemory<T extends Pick<Card, "id" | "variant_group" | "cooldown_sessions">>(
  cards: T[],
  minimumPool = 12,
): T[] {
  const allowed = cards.filter((card) => !isCardBlocked(card.id));
  const cooled = allowed.filter((card) => !isCardCoolingDown(card));
  return cooled.length >= minimumPool ? cooled : allowed;
}
