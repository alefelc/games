import type { ContentBundle, GameSetup } from "../types";
import type { SavedGamePreferences } from "./types";

function slugFor<T extends { id: string; slug: string }>(items: T[], id: string | null) {
  return id ? items.find((item) => item.id === id)?.slug ?? null : null;
}

function idsForSlugs<T extends { id: string; slug: string }>(items: T[], slugs: string[]) {
  const wanted = new Set(slugs);
  return items.filter((item) => wanted.has(item.slug)).map((item) => item.id);
}

export function serializeSetupPreferences(
  content: ContentBundle,
  setup: GameSetup,
): SavedGamePreferences {
  return {
    version: 1,
    playerOne: setup.playerOne,
    playerTwo: setup.playerTwo,
    playerOneSexSlug: slugFor(content.sexes, setup.playerOneSexId),
    playerTwoSexSlug: slugFor(content.sexes, setup.playerTwoSexId),
    modeSlug: slugFor(content.modes, setup.modeId),
    levelSlugs: setup.levelIds
      .map((id) => slugFor(content.levels, id))
      .filter((value): value is string => Boolean(value)),
    deckSlugs: setup.deckIds
      .map((id) => slugFor(content.decks, id))
      .filter((value): value is string => Boolean(value)),
    elementSlugs: setup.elementIds
      .map((id) => slugFor(content.elements, id))
      .filter((value): value is string => Boolean(value)),
    toySlugs: setup.toyIds
      .map((id) => slugFor(content.toys, id))
      .filter((value): value is string => Boolean(value)),
    filters: structuredClone(setup.filters),
    maxCards: setup.maxCards,
    gameMasterEnabled: setup.gameMasterEnabled,
  };
}

export function applySavedPreferences(
  content: ContentBundle,
  setup: GameSetup,
  preferences: SavedGamePreferences | null | undefined,
): GameSetup {
  if (!preferences || preferences.version !== 1) return setup;

  const playerOneSexId = preferences.playerOneSexSlug
    ? content.sexes.find((item) => item.slug === preferences.playerOneSexSlug)?.id ?? null
    : null;
  const playerTwoSexId = preferences.playerTwoSexSlug
    ? content.sexes.find((item) => item.slug === preferences.playerTwoSexSlug)?.id ?? null
    : null;
  const modeId = preferences.modeSlug
    ? content.modes.find((item) => item.slug === preferences.modeSlug)?.id ?? setup.modeId
    : setup.modeId;
  const levelIds = idsForSlugs(content.levels, preferences.levelSlugs);
  const deckIds = idsForSlugs(content.decks, preferences.deckSlugs);

  return {
    ...setup,
    playerOne: preferences.playerOne || setup.playerOne,
    playerTwo: preferences.playerTwo || setup.playerTwo,
    playerOneSexId,
    playerTwoSexId,
    modeId,
    levelIds: levelIds.length ? levelIds : setup.levelIds,
    deckIds: deckIds.length ? deckIds : setup.deckIds,
    elementIds: idsForSlugs(content.elements, preferences.elementSlugs),
    toyIds: idsForSlugs(content.toys, preferences.toySlugs),
    filters: {
      ...setup.filters,
      ...preferences.filters,
    },
    maxCards: Math.max(
      5,
      Math.min(content.settings.maximum_cards_per_session, preferences.maxCards),
    ),
    gameMasterEnabled:
      content.settings.game_master_enabled && preferences.gameMasterEnabled,
  };
}
