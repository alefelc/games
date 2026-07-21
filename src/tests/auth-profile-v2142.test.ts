import { describe, expect, it } from "vitest";
import { applySavedPreferences, serializeSetupPreferences } from "../auth/profile-preferences";
import type { ContentBundle, GameSetup } from "../types";

function contentFixture() {
  return {
    settings: {
      maximum_cards_per_session: 40,
      game_master_enabled: true,
    },
    sexes: [
      { id: "sex-1", slug: "hombre" },
      { id: "sex-2", slug: "mujer" },
    ],
    modes: [{ id: "mode-1", slug: "pareja" }],
    levels: [{ id: "level-1", slug: "caliente" }],
    decks: [{ id: "deck-1", slug: "caliente" }],
    elements: [{ id: "element-1", slug: "aceite" }],
    toys: [{ id: "toy-1", slug: "vibrador" }],
  } as unknown as ContentBundle;
}

function setupFixture(): GameSetup {
  return {
    playerOne: "Ale",
    playerTwo: "Luz",
    playerOneSexId: "sex-1",
    playerTwoSexId: "sex-2",
    modeId: "mode-1",
    levelIds: ["level-1"],
    deckIds: ["deck-1"],
    elementIds: ["element-1"],
    toyIds: ["toy-1"],
    filters: { exclude_photo_video: true },
    maxCards: 25,
    gameMasterEnabled: true,
    intenseConsent: false,
  } as GameSetup;
}

describe("preferencias de perfil v2.14.3", () => {
  it("guarda slugs estables en lugar de ids del servidor", () => {
    const saved = serializeSetupPreferences(contentFixture(), setupFixture());
    expect(saved).toMatchObject({
      playerOne: "Ale",
      playerTwo: "Luz",
      playerOneSexSlug: "hombre",
      playerTwoSexSlug: "mujer",
      modeSlug: "pareja",
      levelSlugs: ["caliente"],
      elementSlugs: ["aceite"],
      toySlugs: ["vibrador"],
      maxCards: 25,
    });
  });

  it("reconstruye una configuración con los ids actuales del contenido", () => {
    const content = contentFixture();
    const saved = serializeSetupPreferences(content, setupFixture());
    const defaults = { ...setupFixture(), playerOne: "", playerTwo: "", levelIds: [] };
    const restored = applySavedPreferences(content, defaults, saved);
    expect(restored.playerOne).toBe("Ale");
    expect(restored.playerTwo).toBe("Luz");
    expect(restored.levelIds).toEqual(["level-1"]);
    expect(restored.filters.exclude_photo_video).toBe(true);
  });

  it("limita la cantidad guardada al máximo actual", () => {
    const saved = { ...serializeSetupPreferences(contentFixture(), setupFixture()), maxCards: 999 };
    const restored = applySavedPreferences(contentFixture(), setupFixture(), saved);
    expect(restored.maxCards).toBe(40);
  });
});
