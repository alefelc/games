import { describe, expect, it } from "vitest";
import {
  createDefaultSetup,
  previewEligibleStats,
} from "../engine/session";
import { sceneCompatibleCards, initialSceneState } from "../engine/scene";
import type { ContentBundle } from "../types";
import bootstrap from "../../public/bootstrap-content.json";

const content = bootstrap as unknown as ContentBundle;

describe("capacidad real de una partida", () => {
  it("no confunde las cartas de apertura con el total de cartas jugables", () => {
    const setup = createDefaultSetup(content);
    const mode = content.modes.find((item) => item.slug === "clasico");
    const man = content.sexes.find((item) => item.slug === "hombre");
    const woman = content.sexes.find((item) => item.slug === "mujer");

    expect(mode).toBeDefined();
    expect(man).toBeDefined();
    expect(woman).toBeDefined();

    setup.modeId = mode!.id;
    setup.playerOneSexId = woman!.id;
    setup.playerTwoSexId = man!.id;
    setup.levelIds = content.levels.map((level) => level.id);
    setup.deckIds = content.decks
      .filter(
        (deck) =>
          deck.active &&
          Number(deck.minimum_players ?? 2) <= 2 &&
          Number(deck.maximum_players ?? 2) >= 2,
      )
      .map((deck) => deck.id);

    const stats = previewEligibleStats(content, setup);
    const openers = sceneCompatibleCards(
      content.cards,
      content,
      initialSceneState(),
    );

    expect(stats.sessionCapacity).toBe(stats.total);
    expect(stats.sessionCapacity).toBeGreaterThan(1);
    expect(stats.sessionCapacity).toBeGreaterThanOrEqual(
      new Set(openers.map((card) => card.id)).size,
    );
  });
});
