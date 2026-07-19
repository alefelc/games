import type { Card, ContentBundle, GameSetup, Id, SessionState } from "../types";

export interface CardInventoryIds {
  elements: Id[];
  toys: Id[];
}

function unique(values: Id[]): Id[] {
  return [...new Set(values)];
}

export function selectedInventoryIds(setup: GameSetup): Id[] {
  return unique([...setup.elementIds, ...setup.toyIds]);
}

export function cardInventoryIds(
  card: Pick<Card, "id">,
  content: ContentBundle,
): CardInventoryIds {
  return {
    elements: unique(
      content.cardElements
        .filter((row) => row.card === card.id)
        .map((row) => row.element),
    ),
    toys: unique(
      content.cardToys
        .filter((row) => row.card === card.id)
        .map((row) => row.toy),
    ),
  };
}

export function cardUsesInventoryId(
  card: Pick<Card, "id">,
  resourceId: Id,
  content: ContentBundle,
): boolean {
  const inventory = cardInventoryIds(card, content);
  return (
    inventory.elements.includes(resourceId) || inventory.toys.includes(resourceId)
  );
}

export function cardUsesSelectedInventory(
  card: Card,
  content: ContentBundle,
  setup: GameSetup,
): boolean {
  const chosen = new Set(selectedInventoryIds(setup));
  if (!chosen.size) return false;

  const inventory = cardInventoryIds(card, content);
  return [...inventory.elements, ...inventory.toys].some((id) =>
    chosen.has(id),
  );
}

function sessionCardIds(session: SessionState): Set<Id> {
  return new Set([
    ...session.completedCardIds,
    ...session.skippedCardIds,
    ...(session.currentCardId ? [session.currentCardId] : []),
  ]);
}

export function inventoryCardsSeen(
  session: SessionState,
  content: ContentBundle,
  setup: GameSetup,
): number {
  const seenIds = sessionCardIds(session);
  return content.cards.filter(
    (card) =>
      seenIds.has(card.id) && cardUsesSelectedInventory(card, content, setup),
  ).length;
}

export function inventoryTargetCards(
  content: ContentBundle,
  setup: GameSetup,
): number {
  if (!setup.elementIds.length && !setup.toyIds.length) return 0;

  const configuredMinimum = Math.max(
    0,
    Number(content.settings.inventory_minimum_cards_per_session ?? 1),
  );
  const proportionalTarget = Math.ceil(setup.maxCards * 0.25);
  return Math.min(
    setup.maxCards,
    8,
    Math.max(configuredMinimum, setup.maxCards >= 8 ? 2 : 1, proportionalTarget),
  );
}

function resourceSeenCounts(
  session: SessionState,
  content: ContentBundle,
  setup: GameSetup,
): Map<Id, number> {
  const counts = new Map<Id, number>();
  const selected = selectedInventoryIds(setup);
  selected.forEach((id) => counts.set(id, 0));
  const seenIds = sessionCardIds(session);

  for (const card of content.cards) {
    if (!seenIds.has(card.id)) continue;
    for (const resourceId of selected) {
      if (cardUsesInventoryId(card, resourceId, content)) {
        counts.set(resourceId, (counts.get(resourceId) ?? 0) + 1);
      }
    }
  }

  return counts;
}

function leastSeenResourcePool(
  candidates: Card[],
  content: ContentBundle,
  setup: GameSetup,
  session: SessionState,
): Card[] {
  const counts = resourceSeenCounts(session, content, setup);
  const available = selectedInventoryIds(setup).filter((resourceId) =>
    candidates.some((card) => cardUsesInventoryId(card, resourceId, content)),
  );
  if (!available.length) return candidates;

  const minimum = Math.min(...available.map((id) => counts.get(id) ?? 0));
  const leastSeen = new Set(
    available.filter((id) => (counts.get(id) ?? 0) === minimum),
  );
  const focused = candidates.filter((card) =>
    [...leastSeen].some((id) => cardUsesInventoryId(card, id, content)),
  );
  return focused.length ? focused : candidates;
}

export function chooseInventoryPool(
  candidates: Card[],
  _allEligible: Card[],
  content: ContentBundle,
  setup: GameSetup,
  session: SessionState,
): Card[] {
  if (!setup.elementIds.length && !setup.toyIds.length) return candidates;

  const inventoryCandidates = candidates.filter((card) =>
    cardUsesSelectedInventory(card, content, setup),
  );
  if (!inventoryCandidates.length) return candidates;

  const target = inventoryTargetCards(content, setup);
  const seen = inventoryCardsSeen(session, content, setup);
  const drawNumber = session.resolvedCount + 1;
  const forceAfter = Math.max(
    1,
    Number(content.settings.inventory_guarantee_after_cards ?? 4),
  );
  const usableSlots = Math.max(1, setup.maxCards - forceAfter + 1);
  const elapsedSlots = Math.max(0, drawNumber - forceAfter + 1);
  const expectedByNow = Math.min(
    target,
    Math.ceil((elapsedSlots * target) / usableSlots),
  );
  const remaining = Math.max(0, setup.maxCards - session.resolvedCount);
  const mustForce =
    (drawNumber >= forceAfter && seen < expectedByNow) ||
    remaining <= Math.max(0, target - seen);

  if (mustForce) {
    return leastSeenResourcePool(
      inventoryCandidates,
      content,
      setup,
      session,
    );
  }

  const multiplier = Math.max(
    4,
    Number(content.settings.inventory_preference_multiplier ?? 4),
  );

  return candidates.map((card) =>
    cardUsesSelectedInventory(card, content, setup)
      ? { ...card, weight: Math.max(1, Number(card.weight ?? 1)) * multiplier }
      : card,
  );
}
