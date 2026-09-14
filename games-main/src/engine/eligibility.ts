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
  const performerRole =
    card.performer === "none" ? "current_player" : card.performer;
  const targetRole =
    card.target === "none"
      ? context.playerCount === 1
        ? "self"
        : "partner"
      : card.target;
  return (
    roleMatchesSex(
      performerRole,
      card.performer_sex,
      context.currentPlayerSexId,
      context.partnerSexId,
      context.playerCount,
    ) &&
    roleMatchesSex(
      targetRole,
      card.target_sex,
      context.currentPlayerSexId,
      context.partnerSexId,
      context.playerCount,
    )
  );
}

type CanonicalSex = "hombre" | "mujer" | null;

function normalizeSexSlug(value: string | null | undefined): CanonicalSex {
  const normalized = value?.trim().toLocaleLowerCase("es-AR");
  if (["hombre", "masculino", "male"].includes(normalized ?? "")) {
    return "hombre";
  }
  if (["mujer", "femenino", "female"].includes(normalized ?? "")) {
    return "mujer";
  }
  return null;
}

function roleSexSlug(
  role: string,
  context: EligibilityContext,
): CanonicalSex {
  const current = normalizeSexSlug(context.currentPlayerSexSlug);
  const partner = normalizeSexSlug(context.partnerSexSlug);

  if (role === "current_player" || role === "self") return current;
  if (role === "partner") {
    return context.playerCount === 1 ? current : partner;
  }
  if (role === "both") {
    if (context.playerCount === 1) return current;
    return current && current === partner ? current : null;
  }
  return null;
}

function matchesGenderScope(
  card: Card,
  context: EligibilityContext,
): boolean {
  const scope = String(card.gender_scope ?? "neutral")
    .trim()
    .toLocaleLowerCase("es-AR");
  const current = normalizeSexSlug(context.currentPlayerSexSlug);
  const partner =
    context.playerCount === 1
      ? current
      : normalizeSexSlug(context.partnerSexSlug);

  if (["", "neutral", "all", "any"].includes(scope)) return true;
  if (!current || !partner) return false;

  switch (scope) {
    case "male_male":
      return current === "hombre" && partner === "hombre";
    case "female_female":
      return current === "mujer" && partner === "mujer";
    case "male_to_female":
      return current === "hombre" && partner === "mujer";
    case "female_to_male":
      return current === "mujer" && partner === "hombre";
    case "male_performer":
      return (
        roleSexSlug(
          card.performer === "none" ? "current_player" : card.performer,
          context,
        ) === "hombre"
      );
    case "female_performer":
      return (
        roleSexSlug(
          card.performer === "none" ? "current_player" : card.performer,
          context,
        ) === "mujer"
      );
    case "male_target":
      return (
        roleSexSlug(
          card.target === "none"
            ? context.playerCount === 1
              ? "self"
              : "partner"
            : card.target,
          context,
        ) === "hombre"
      );
    case "female_target":
      return (
        roleSexSlug(
          card.target === "none"
            ? context.playerCount === 1
              ? "self"
              : "partner"
            : card.target,
          context,
        ) === "mujer"
      );
    default:
      return false;
  }
}

function matchesAnatomyOwner(
  card: Card,
  context: EligibilityContext,
): boolean {
  const required: CanonicalSex = ["concha", "tetas"].includes(
    card.anatomy_focus,
  )
    ? "mujer"
    : card.anatomy_focus === "pija"
      ? "hombre"
      : null;
  if (!required) return true;

  if (card.anatomy_owner === "performer") {
    return (
      roleSexSlug(
        card.performer === "none" ? "current_player" : card.performer,
        context,
      ) === required
    );
  }
  if (card.anatomy_owner === "self") {
    return normalizeSexSlug(context.currentPlayerSexSlug) === required;
  }
  if (card.anatomy_owner === "target") {
    return (
      roleSexSlug(
        card.target === "none"
          ? context.playerCount === 1
            ? "self"
            : "partner"
          : card.target,
        context,
      ) === required
    );
  }
  if (card.anatomy_owner === "both") {
    const current = normalizeSexSlug(context.currentPlayerSexSlug);
    const partner =
      context.playerCount === 1
        ? current
        : normalizeSexSlug(context.partnerSexSlug);
    return current === required && partner === required;
  }

  // Una anatomía específica sin propietario verificable no es segura para
  // selección automática.
  return false;
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
  if (!matchesGenderScope(card, context)) return false;
  if (!matchesAnatomyOwner(card, context)) return false;

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
