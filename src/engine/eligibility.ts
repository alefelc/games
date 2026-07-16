import type { Card, ContentBundle, EligibilityContext, Id } from '../types';

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

export function buildEligibilityIndexes(content: ContentBundle): EligibilityIndexes {
  const deckRows = indexByCard(content.deckCards.filter((row) => row.enabled));
  const elementRows = indexByCard(content.cardElements);
  const toyRows = indexByCard(content.cardToys);

  return {
    decksByCard: new Map([...deckRows].map(([card, rows]) => [card, rows.map((row) => row.deck)])),
    elementsByCard: new Map([...elementRows].map(([card, rows]) => [
      card,
      rows.map((row) => ({ id: row.element, requirement: row.requirement })),
    ])),
    toysByCard: new Map([...toyRows].map(([card, rows]) => [
      card,
      rows.map((row) => ({ id: row.toy, requirement: row.requirement })),
    ])),
  };
}

function hasRequiredResources(
  resources: Array<{ id: Id; requirement: string }>,
  selected: Set<Id>,
): boolean {
  const required = resources.filter((resource) => resource.requirement === 'required');
  if (required.some((resource) => !selected.has(resource.id))) return false;

  const alternatives = resources.filter((resource) => resource.requirement === 'alternative');
  if (alternatives.length > 0 && !alternatives.some((resource) => selected.has(resource.id))) return false;

  return true;
}


function roleMatchesSex(
  role: string,
  requiredSexId: Id | null,
  currentPlayerSexId: Id,
  partnerSexId: Id,
): boolean {
  if (!requiredSexId) return true;

  if (role === 'current_player') {
    return currentPlayerSexId === requiredSexId;
  }

  if (role === 'partner') {
    return partnerSexId === requiredSexId;
  }

  if (role === 'both') {
    return (
      currentPlayerSexId === requiredSexId &&
      partnerSexId === requiredSexId
    );
  }

  return true;
}

function matchesSexRequirements(
  card: Card,
  currentPlayerSexId: Id | null | undefined,
  partnerSexId: Id | null | undefined,
): boolean {
  if (!card.performer_sex && !card.target_sex) {
    return true;
  }

  if (!currentPlayerSexId || !partnerSexId) {
    return false;
  }

  return (
    roleMatchesSex(
      card.performer,
      card.performer_sex,
      currentPlayerSexId,
      partnerSexId,
    ) &&
    roleMatchesSex(
      card.target,
      card.target_sex,
      currentPlayerSexId,
      partnerSexId,
    )
  );
}

export function isCardEligible(
  card: Card,
  context: EligibilityContext,
  indexes: EligibilityIndexes,
): boolean {
  if (card.status !== 'published') return false;
  if (!context.selectedLevelIds.has(card.level)) return false;
  if (card.minimum_players > 2 || card.maximum_players < 2) return false;
  if (!matchesSexRequirements(
    card,
    context.currentPlayerSexId,
    context.partnerSexId,
  )) return false;

  if (context.selectedDeckIds.size > 0) {
    const cardDecks = indexes.decksByCard.get(card.id) ?? [];
    if (!cardDecks.some((deckId) => context.selectedDeckIds.has(deckId))) return false;
  }

  const filters = context.filters;
  if (filters.excludePhotoVideo && (card.contains_photo || card.contains_video)) return false;
  if (filters.excludeThirdParties && card.contains_third_parties) return false;
  if (filters.excludePublicPlaces && card.contains_public_place) return false;
  if (filters.excludeRestraint && card.contains_restraint) return false;
  if (filters.excludeAnal && card.contains_anal) return false;
  if (filters.excludePenetration && card.contains_penetration) return false;
  if (filters.excludeOral && card.contains_oral) return false;
  if (filters.excludeNudity && card.contains_nudity) return false;
  if (filters.excludeExplicitLanguage && card.contains_explicit_language) return false;
  if (filters.excludeFood && card.contains_food) return false;
  if (filters.excludeTemperature && card.contains_temperature) return false;
  if (filters.excludeRoleplay && card.contains_roleplay) return false;
  if (filters.excludeManualStimulation && card.contains_manual_stimulation) return false;
  if (filters.excludeToys && card.contains_toy) return false;
  if (card.privacy_risk > filters.maxPrivacyRisk) return false;
  if (card.physical_risk > filters.maxPhysicalRisk) return false;

  if (!hasRequiredResources(indexes.elementsByCard.get(card.id) ?? [], context.selectedElementIds)) return false;
  if (!hasRequiredResources(indexes.toysByCard.get(card.id) ?? [], context.selectedToyIds)) return false;

  return true;
}

export function eligibleCards(content: ContentBundle, context: EligibilityContext): Card[] {
  const indexes = buildEligibilityIndexes(content);
  return content.cards.filter((card) => isCardEligible(card, context, indexes));
}
