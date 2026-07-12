import type { Card } from '../types';

export function weightedPick(cards: Card[], random: () => number = Math.random): Card | null {
  if (!cards.length) return null;
  const total = cards.reduce((sum, card) => sum + Math.max(1, card.weight || 1), 0);
  let cursor = random() * total;
  for (const card of cards) {
    cursor -= Math.max(1, card.weight || 1);
    if (cursor <= 0) return card;
  }
  return cards[cards.length - 1] ?? null;
}
