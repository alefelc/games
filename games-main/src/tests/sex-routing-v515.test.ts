import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { eligibleCards } from "../engine/eligibility";
import type { ContentBundle, EligibilityContext } from "../types";

const packageRoot = existsSync(resolve(process.cwd(), "public/bootstrap-content.json"))
  ? process.cwd()
  : resolve(process.cwd(), "games-main");
const content = JSON.parse(
  readFileSync(resolve(packageRoot, "public/bootstrap-content.json"), "utf8"),
) as ContentBundle;

const man = content.sexes.find((sex) => sex.slug === "hombre")!;
const woman = content.sexes.find((sex) => sex.slug === "mujer")!;

function soloContext(sex: typeof man): EligibilityContext {
  return {
    playerCount: 1,
    selectedLevelIds: new Set(content.levels.map((level) => level.id)),
    selectedDeckIds: new Set(
      content.decks
        .filter(
          (deck) =>
            deck.active && deck.minimum_players <= 1 && deck.maximum_players >= 1,
        )
        .map((deck) => deck.id),
    ),
    selectedElementIds: new Set(content.elements.map((element) => element.id)),
    selectedToyIds: new Set(content.toys.map((toy) => toy.id)),
    filters: {
      maxIntensity: 7,
      maxPrivacyRisk: 3,
      maxPhysicalRisk: 3,
    },
    filterDefinitions: content.filters,
    currentPlayerSexId: sex.id,
    currentPlayerSexSlug: sex.slug,
    partnerSexId: null,
    partnerSexSlug: null,
  };
}

describe("asignación de sexo 5.1.5", () => {
  it("nunca ofrece cartas SOLO-M o SOLO-MT a un hombre", () => {
    const cards = eligibleCards(content, soloContext(man));
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.filter((card) => /^SOLO-(?:M|MT)-/.test(card.code))).toEqual([]);
  });

  it("nunca ofrece cartas SOLO-H o SOLO-HT a una mujer", () => {
    const cards = eligibleCards(content, soloContext(woman));
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.filter((card) => /^SOLO-(?:H|HT)-/.test(card.code))).toEqual([]);
  });

  it("bloquea cartas masculinas antiguas aunque estén marcadas como neutrales", () => {
    const legacyMale = content.cards.find(
      (card) => /^SOLO-H-/.test(card.code) && !card.performer_sex,
    );
    expect(legacyMale).toBeDefined();
    expect(eligibleCards(content, soloContext(woman))).not.toContainEqual(legacyMale);
    expect(eligibleCards(content, soloContext(man))).toContainEqual(legacyMale);
  });
});
