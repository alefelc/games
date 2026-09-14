import type { Id } from '../types';

interface StoredHistory { version: 1; ids: Id[]; updatedAt: string; }
const PREFIX = 'te-animas:card-history:v1';

export function buildHistoryKey(gameId: Id | string, modeId: Id | string, players: 1 | 2): string {
  return `${PREFIX}:${gameId}:${modeId}:${players}`;
}

export function readCardHistory(key: string): Id[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null') as StoredHistory | null;
    return parsed?.version === 1 && Array.isArray(parsed.ids) ? parsed.ids : [];
  } catch { return []; }
}

export function rememberCard(key: string, cardId: Id, limit = 800): void {
  if (typeof window === 'undefined') return;
  const ids = readCardHistory(key).filter(id => id !== cardId);
  ids.push(cardId);
  const payload: StoredHistory = { version: 1, ids: ids.slice(-Math.max(1, limit)), updatedAt: new Date().toISOString() };
  try { window.localStorage.setItem(key, JSON.stringify(payload)); } catch { /* storage lleno o bloqueado */ }
}

export function resetCardHistory(key: string): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(key); } catch { /* noop */ }
}
