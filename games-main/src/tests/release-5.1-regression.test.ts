import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  buildEligibilityIndexes,
  eligibleCards,
  isCardEligible,
} from "../engine/eligibility";
import {
  createDefaultSetup,
  createSession,
  drawNextCard,
  getDrawCandidatePool,
  resolveCurrentCard,
} from "../engine/session";
import type {
  Card,
  ContentBundle,
  EligibilityContext,
  GameSetup,
} from "../types";

const content = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/bootstrap-content.json"), "utf8"),
) as ContentBundle;

const man = content.sexes.find((sex) => sex.slug === "hombre")!;
const woman = content.sexes.find((sex) => sex.slug === "mujer")!;
const indexes = buildEligibilityIndexes(content);

function setupForPair(
  current: typeof man,
  partner: typeof man,
): GameSetup {
  const setup = createDefaultSetup(content);
  setup.modeId = content.modes.find((mode) => mode.slug === "clasico")!.id;
  setup.playerOneSexId = current.id;
  setup.playerTwoSexId = partner.id;
  setup.levelIds = content.levels.map((level) => level.id);
  setup.deckIds = content.decks
    .filter(
      (deck) =>
        deck.active &&
        Number(deck.minimum_players ?? 2) <= 2 &&
        Number(deck.maximum_players ?? 2) >= 2,
    )
    .map((deck) => deck.id);
  setup.elementIds = content.elements.map((element) => element.id);
  setup.toyIds = content.toys.map((toy) => toy.id);
  setup.filters = {
    ...setup.filters,
    maxIntensity: 7,
    excludePhotoVideo: false,
    excludeThirdParties: false,
    excludePublicPlaces: false,
    excludeRestraint: false,
    excludePenetration: false,
    excludeOral: false,
    excludeNudity: false,
    excludeExplicitLanguage: false,
    excludeFood: false,
    excludeTemperature: false,
    excludeRoleplay: false,
    excludeManualStimulation: false,
    excludeToys: false,
    maxPrivacyRisk: 10,
    maxPhysicalRisk: 10,
  };
  setup.gameMasterEnabled = false;
  return setup;
}

function contextForPair(
  current: typeof man,
  partner: typeof man,
): EligibilityContext {
  const setup = setupForPair(current, partner);
  return {
    playerCount: 2,
    selectedLevelIds: new Set(setup.levelIds),
    selectedDeckIds: new Set(setup.deckIds),
    selectedElementIds: new Set(setup.elementIds),
    selectedToyIds: new Set(setup.toyIds),
    filters: setup.filters,
    filterDefinitions: content.filters,
    currentPlayerSexId: current.id,
    partnerSexId: partner.id,
    currentPlayerSexSlug: current.slug,
    partnerSexSlug: partner.slug,
  };
}

function sexForRole(
  role: string,
  current: string,
  partner: string,
  fallback: string,
): string | null {
  if (role === "current_player" || role === "self") return current;
  if (role === "partner") return partner;
  if (role === "both") return current === partner ? current : null;
  if (role === "none") return fallback;
  return null;
}

describe("regresiones de producción 5.1", () => {
  beforeEach(() => localStorage.clear());

  it("aplica gender_scope y anatomía antes de seleccionar una carta", () => {
    const femaleOnly = content.cards.find(
      (card) => card.code === "ACC-FF-014",
    )!;
    const correctedOwner = content.cards.find(
      (card) => card.code === "ACC-MF-008",
    )!;

    expect(
      isCardEligible(femaleOnly, contextForPair(woman, woman), indexes),
    ).toBe(true);
    expect(
      isCardEligible(femaleOnly, contextForPair(man, man), indexes),
    ).toBe(false);
    expect(
      isCardEligible(femaleOnly, contextForPair(man, woman), indexes),
    ).toBe(false);

    expect(correctedOwner.anatomy_owner).toBe("performer");
    expect(
      isCardEligible(correctedOwner, contextForPair(woman, man), indexes),
    ).toBe(true);
    expect(
      isCardEligible(correctedOwner, contextForPair(man, woman), indexes),
    ).toBe(false);
  });

  it("ninguna carta elegible asigna genitales al sexo incorrecto", () => {
    const pairings = [
      [man, man],
      [man, woman],
      [woman, man],
      [woman, woman],
    ] as const;
    const requiredSex = new Map([
      ["concha", "mujer"],
      ["tetas", "mujer"],
      ["pija", "hombre"],
    ]);

    for (const [current, partner] of pairings) {
      const cards = eligibleCards(content, contextForPair(current, partner));
      expect(cards.length).toBeGreaterThan(0);

      for (const card of cards) {
        const required = requiredSex.get(card.anatomy_focus);
        if (!required) continue;

        const ownerSex =
          card.anatomy_owner === "performer"
            ? sexForRole(
                card.performer,
                current.slug,
                partner.slug,
                current.slug,
              )
            : card.anatomy_owner === "target"
              ? sexForRole(
                  card.target,
                  current.slug,
                  partner.slug,
                  partner.slug,
                )
              : card.anatomy_owner === "both" &&
                  current.slug === partner.slug
                ? current.slug
                : null;
        expect(ownerSex, `${card.code} (${current.slug}/${partner.slug})`).toBe(
          required,
        );
      }
    }
  });

  it("el cambio manual exige el nivel pedido en todos los niveles", () => {
    const pairings = [
      [man, man],
      [man, woman],
      [woman, man],
      [woman, woman],
    ] as const;

    for (const [first, second] of pairings) {
      for (const level of content.levels) {
        localStorage.clear();
        const setup = setupForPair(first, second);
        const initial = drawNextCard(
          content,
          setup,
          createSession(content, setup),
          () => 0.37,
        );
        expect(initial.card).not.toBeNull();

        const requested = {
          ...initial.session,
          pendingLevelId: level.id,
        };
        const resolved = resolveCurrentCard(
          content,
          setup,
          requested,
          "completed",
          () => 0,
        );
        const pool = getDrawCandidatePool(content, setup, resolved);
        const label = `${first.slug}/${second.slug}/${level.slug}`;

        expect(pool.candidates.length, label).toBeGreaterThan(0);
        expect(
          pool.candidates.every((card) => card.level === level.id),
          label,
        ).toBe(true);
        const next = drawNextCard(content, setup, resolved, () => 0.5);
        expect(next.card?.level, label).toBe(level.id);
        expect(next.session.pendingLevelId).toBeNull();
      }
    }
  });

  it("baraja cada partida, conserva reintentos y registra una sola vista", () => {
    const setup = setupForPair(woman, man);
    const selected = new Set<string>();

    for (let index = 0; index < 30; index += 1) {
      localStorage.clear();
      const session = {
        ...createSession(content, setup),
        id: `partida-${index}`,
      };
      const first = drawNextCard(content, setup, session);
      expect(first.card).not.toBeNull();
      selected.add(first.card!.id);

      const history = JSON.parse(
        localStorage.getItem("te-animas-card-history-v3") ?? "[]",
      ) as Array<{ cardId: string; seenCount: number }>;
      expect(history.find((entry) => entry.cardId === first.card!.id)?.seenCount)
        .toBe(1);

      localStorage.clear();
      const retry = drawNextCard(content, setup, session);
      expect(retry.card?.id).toBe(first.card?.id);
    }

    expect(selected.size).toBeGreaterThanOrEqual(5);
  });
});
