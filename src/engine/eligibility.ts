import type { Card, ContentBundle, EligibilityContext, Id } from "../types";
import { cardPassesDynamicFilters } from "../lib/dynamicFilters";

function indexByCard<T extends { card: Id }>(rows: T[]): Map<Id, T[]> {
  const map = new Map<Id, T[]>();
  for (const row of rows) {
    const existing = map.get(row.card) ?? [];
    existing.push(row);
    map.set(row.card, existing);
  }
  return map;
}

export interface EligibilityIndexes {
  decksByCard: Map<Id, Id[]>;
  elementsByCard: Map<Id, Array<{ id: Id; requirement: string }>>;
  toysByCard: Map<Id, Array<{ id: Id; requirement: string }>>;
}

export function buildEligibilityIndexes(
  content: ContentBundle,
): EligibilityIndexes {
  const deckRows = indexByCard(content.deckCards.filter((row) => row.enabled));
  const elementRows = indexByCard(content.cardElements);
  const toyRows = indexByCard(content.cardToys);

  return {
    decksByCard: new Map(
      [...deckRows].map(([card, rows]) => [card, rows.map((row) => row.deck)]),
    ),
    elementsByCard: new Map(
      [...elementRows].map(([card, rows]) => [
        card,
        rows.map((row) => ({ id: row.element, requirement: row.requirement })),
      ]),
    ),
    toysByCard: new Map(
      [...toyRows].map(([card, rows]) => [
        card,
        rows.map((row) => ({ id: row.toy, requirement: row.requirement })),
      ]),
    ),
  };
}

function hasRequiredResources(
  resources: Array<{ id: Id; requirement: string }>,
  selected: Set<Id>,
): boolean {
  const required = resources.filter(
    (resource) => resource.requirement === "required",
  );
  if (required.some((resource) => !selected.has(resource.id))) return false;

  const alternatives = resources.filter(
    (resource) => resource.requirement === "alternative",
  );
  if (
    alternatives.length > 0 &&
    !alternatives.some((resource) => selected.has(resource.id))
  )
    return false;

  return true;
}

function roleSex(
  role: string,
  currentPlayerSexId: Id | null | undefined,
  partnerSexId: Id | null | undefined,
): Id | null {
  if (role === "current_player" || role === "self") {
    return currentPlayerSexId ?? null;
  }
  if (role === "partner") return partnerSexId ?? null;
  return null;
}

function roleMatchesSex(
  role: string,
  requiredSexId: Id | null,
  currentPlayerSexId: Id | null | undefined,
  partnerSexId: Id | null | undefined,
  playerCount: 1 | 2,
): boolean {
  if (!requiredSexId) return true;

  if (role === "both") {
    if (playerCount === 1) return currentPlayerSexId === requiredSexId;
    return (
      currentPlayerSexId === requiredSexId && partnerSexId === requiredSexId
    );
  }

  return roleSex(role, currentPlayerSexId, partnerSexId) === requiredSexId;
}

function matchesSexRequirements(
  card: Card,
  context: EligibilityContext,
): boolean {
  return (
    roleMatchesSex(
      card.performer,
      card.performer_sex,
      context.currentPlayerSexId,
      context.partnerSexId,
      context.playerCount,
    ) &&
    roleMatchesSex(
      card.target,
      card.target_sex,
      context.currentPlayerSexId,
      context.partnerSexId,
      context.playerCount,
    )
  );
}

function matchesPlayScope(card: Card, playerCount: 1 | 2 = 2): boolean {
  const scope =
    card.play_scope ?? (card.maximum_players <= 1 ? "solo" : "couple");
  if (
    card.minimum_players > playerCount ||
    card.maximum_players < playerCount
  ) {
    return false;
  }

  if (playerCount === 1) {
    return scope === "solo" || scope === "universal";
  }

  return scope === "couple" || scope === "universal";
}

export function isCardEligible(
  card: Card,
  context: EligibilityContext,
  indexes: EligibilityIndexes,
): boolean {
  if (card.status !== "published") return false;
  if (!context.selectedLevelIds.has(card.level)) return false;
  if (!matchesPlayScope(card, context.playerCount ?? 2)) return false;
  if (!matchesSexRequirements(card, context)) return false;

  if (context.selectedDeckIds.size > 0) {
    const cardDecks = indexes.decksByCard.get(card.id) ?? [];
    if (!cardDecks.some((deckId) => context.selectedDeckIds.has(deckId)))
      return false;
  }

  if (
    !cardPassesDynamicFilters(
      card as unknown as Record<string, unknown>,
      context.filterDefinitions,
      context.filters,
    )
  ) {
    return false;
  }

  if (
    !hasRequiredResources(
      indexes.elementsByCard.get(card.id) ?? [],
      context.selectedElementIds,
    )
  )
    return false;
  if (
    !hasRequiredResources(
      indexes.toysByCard.get(card.id) ?? [],
      context.selectedToyIds,
    )
  )
    return false;

  return true;
}

export function eligibleCards(
  content: ContentBundle,
  context: EligibilityContext,
): Card[] {
  const indexes = buildEligibilityIndexes(content);
  return content.cards.filter((card) => isCardEligible(card, context, indexes));
}
