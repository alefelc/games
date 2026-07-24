import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ContentBundle } from "../types";
import {
  createDefaultSetup,
  createSession,
  drawNextCard,
  getDrawCandidatePool,
  previewEligibleStats,
  resolveCurrentCard,
} from "../engine/session";
import { resolveDefaultCards, resolveMaximumCards } from "../lib/cardCount";

const localBootstrap = resolve(process.cwd(), "public/bootstrap-content.json");
const workspaceBootstrap = resolve(
  process.cwd(),
  "games-main/public/bootstrap-content.json",
);
const content = JSON.parse(
  readFileSync(
    existsSync(localBootstrap) ? localBootstrap : workspaceBootstrap,
    "utf8",
  ),
) as ContentBundle;

function runSession(
  setup: ReturnType<typeof createDefaultSetup>,
  assertCard?: (cardId: string, levelId: string, cardNumber: number) => void,
) {
  let session = createSession(content, setup);
  const selected: string[] = [];

  for (let cardNumber = 1; cardNumber <= setup.maxCards; cardNumber += 1) {
    const draw = drawNextCard(content, setup, session, () => 0);

    expect(
      draw.exhausted,
      JSON.stringify({
        cardNumber,
        configuredMaximum: setup.maxCards,
        scene: session.scene,
        candidateCount: getDrawCandidatePool(content, setup, session).candidates
          .length,
        selected,
      }),
    ).toBe(false);
    expect(draw.card, `la carta ${cardNumber} debe existir`).not.toBeNull();
    selected.push(draw.card!.id);
    assertCard?.(draw.card!.id, draw.card!.level, cardNumber);

    session = resolveCurrentCard(
      content,
      setup,
      draw.session,
      "completed",
      () => 0,
    );
  }

  const finished = drawNextCard(content, setup, session, () => 0);
  expect(finished.exhausted).toBe(true);
  expect(finished.card).toBeNull();
  expect(finished.session.resolvedCount).toBe(setup.maxCards);
}

describe("regresión configurable de finalización", () => {
  it("respeta el valor predeterminado publicado sin conocerlo de antemano", () => {
    localStorage.clear();
    const setup = createDefaultSetup(content);

    expect(setup.maxCards).toBe(resolveDefaultCards(content.settings));
    runSession(setup);
  });

  it("respeta distintas cantidades, incluido el máximo publicado", () => {
    const defaultCards = resolveDefaultCards(content.settings);
    const maximumCards = resolveMaximumCards(content.settings);
    const requestedCounts = [
      Math.min(5, maximumCards),
      defaultCards,
      Math.ceil((defaultCards + maximumCards) / 2),
      maximumCards,
    ];

    for (const requested of [...new Set(requestedCounts)]) {
      localStorage.clear();
      const setup = createDefaultSetup(content);
      const capacity = previewEligibleStats(content, setup).sessionCapacity;
      setup.maxCards = Math.min(requested, capacity);
      expect(setup.maxCards).toBeGreaterThan(0);
      runSession(setup);
    }
  });

  it("funciona con cada techo de nivel publicado", () => {
    const levels = [...content.levels].sort(
      (a, b) => a.intensity_order - b.intensity_order,
    );

    for (const selectedLevel of levels) {
      localStorage.clear();
      const setup = createDefaultSetup(content);
      setup.levelIds = levels
        .filter(
          (level) =>
            level.intensity_order <= selectedLevel.intensity_order,
        )
        .map((level) => level.id);
      const capacity = previewEligibleStats(content, setup).sessionCapacity;
      const preferred = resolveDefaultCards(content.settings);
      setup.maxCards =
        capacity >= 5
          ? Math.min(preferred, Math.floor(capacity / 5) * 5)
          : capacity;

      expect(setup.maxCards).toBeGreaterThan(0);
      runSession(setup, (_cardId, levelId) => {
        expect(setup.levelIds).toContain(levelId);
      });
    }
  });

  it("no se agota antes por el historial acumulado de otras partidas", () => {
    localStorage.clear();
    const maximumCards = resolveMaximumCards(content.settings);
    const warmupCounts = [
      Math.min(5, maximumCards),
      resolveDefaultCards(content.settings),
    ];

    for (const count of warmupCounts) {
      const setup = createDefaultSetup(content);
      setup.maxCards = count;
      runSession(setup);
    }

    const setup = createDefaultSetup(content);
    setup.maxCards = Math.min(
      maximumCards,
      previewEligibleStats(content, setup).sessionCapacity,
    );
    runSession(setup);
  });
});
