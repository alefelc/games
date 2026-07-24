import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  cardElementSchema,
  cardSchema,
  cardTagSchema,
  cardToySchema,
  deckCardSchema,
  deckSchema,
  elementSchema,
  gameSchema,
  levelSchema,
  modeSchema,
  releaseSchema,
  settingsSchema,
  sexSchema,
  tagSchema,
  themeSchema,
  toySchema,
} from "../api/schemas";
import type { ContentBundle } from "../types";

function loadBootstrap(): ContentBundle {
  const file = resolve(process.cwd(), "public/bootstrap-content.json");
  return JSON.parse(readFileSync(file, "utf8")) as ContentBundle;
}

describe("contenido inicial", () => {
  it("contiene únicamente el catálogo público y referencias válidas", () => {
    const bundle = loadBootstrap();
    gameSchema.parse(bundle.game);
    themeSchema.parse(bundle.theme);
    settingsSchema.parse(bundle.settings);
    releaseSchema.parse(bundle.release);
    bundle.levels.forEach((item) => levelSchema.parse(item));
    bundle.decks.forEach((item) => deckSchema.parse(item));
    bundle.modes.forEach((item) => modeSchema.parse(item));
    bundle.elements.forEach((item) => elementSchema.parse(item));
    bundle.toys.forEach((item) => toySchema.parse(item));
    bundle.tags.forEach((item) => tagSchema.parse(item));
    bundle.sexes.forEach((item) => sexSchema.parse(item));
    bundle.cards.forEach((item) => cardSchema.parse(item));
    bundle.deckCards.forEach((item) => deckCardSchema.parse(item));
    bundle.cardElements.forEach((item) => cardElementSchema.parse(item));
    bundle.cardToys.forEach((item) => cardToySchema.parse(item));
    bundle.cardTags.forEach((item) => cardTagSchema.parse(item));

    expect(bundle.cards).toHaveLength(894);
    expect(bundle.levels).toHaveLength(7);
    expect(bundle.sexes).toHaveLength(2);
    expect(bundle.cards.every((card) => card.status === "published")).toBe(
      true,
    );

    const cardIds = new Set(bundle.cards.map((card) => card.id));
    const levelIds = new Set(bundle.levels.map((level) => level.id));
    const deckIds = new Set(bundle.decks.map((deck) => deck.id));
    const elementIds = new Set(bundle.elements.map((item) => item.id));
    const toyIds = new Set(bundle.toys.map((item) => item.id));
    const tagIds = new Set(bundle.tags.map((item) => item.id));

    expect(bundle.cards.every((card) => levelIds.has(card.level))).toBe(true);
    expect(
      bundle.deckCards.every(
        (row) => cardIds.has(row.card) && deckIds.has(row.deck),
      ),
    ).toBe(true);
    expect(
      bundle.cardElements.every(
        (row) => cardIds.has(row.card) && elementIds.has(row.element),
      ),
    ).toBe(true);
    expect(
      bundle.cardToys.every(
        (row) => cardIds.has(row.card) && toyIds.has(row.toy),
      ),
    ).toBe(true);
    expect(
      bundle.cardTags.every(
        (row) => cardIds.has(row.card) && tagIds.has(row.tag),
      ),
    ).toBe(true);
  });
});
