import type { Card, ContentBundle, GameSetup, Id, SessionState } from '../types';

function selected(setup: GameSetup): Set<Id> { return new Set([...setup.elementIds, ...setup.toyIds]); }

export function cardUsesSelectedInventory(card: Card, content: ContentBundle, setup: GameSetup): boolean {
  const chosen = selected(setup);
  if (!chosen.size) return false;
  return content.cardElements.some(row => row.card === card.id && chosen.has(row.element)) || content.cardToys.some(row => row.card === card.id && chosen.has(row.toy));
}

export function inventoryCardsSeen(session: SessionState, content: ContentBundle, setup: GameSetup): number {
  const currentSessionIds = new Set([...session.completedCardIds, ...session.skippedCardIds, ...(session.currentCardId ? [session.currentCardId] : [])]);
  return content.cards.filter(card => currentSessionIds.has(card.id) && cardUsesSelectedInventory(card, content, setup)).length;
}

export function chooseInventoryPool(candidates: Card[], allEligible: Card[], content: ContentBundle, setup: GameSetup, session: SessionState): Card[] {
  if (!setup.elementIds.length && !setup.toyIds.length) return candidates;
  const settings = content.settings as typeof content.settings & { inventory_guarantee_after_cards?: number; inventory_minimum_cards_per_session?: number; inventory_preference_multiplier?: number };
  const minimum = Math.max(0, Number(settings.inventory_minimum_cards_per_session ?? 1));
  const forceAfter = Math.max(1, Number(settings.inventory_guarantee_after_cards ?? 4));
  const seen = inventoryCardsSeen(session, content, setup);
  const remaining = Math.max(0, setup.maxCards - session.resolvedCount);
  const localInventory = candidates.filter(card => cardUsesSelectedInventory(card, content, setup));
  const anyInventory = allEligible.filter(card => cardUsesSelectedInventory(card, content, setup));
  const mustForce = seen < minimum && (session.resolvedCount + 1 >= forceAfter || remaining <= minimum - seen);
  if (mustForce && localInventory.length) return localInventory;
  if (mustForce && anyInventory.length) return anyInventory;
  const multiplier = Math.max(1, Number(settings.inventory_preference_multiplier ?? 4));
  return candidates.map(card => cardUsesSelectedInventory(card, content, setup) ? ({ ...card, weight: Math.max(1, Number(card.weight ?? 1)) * multiplier }) : card);
}
