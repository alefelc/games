import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ContentBundle } from "../types";

const bundle = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/bootstrap-content.json"), "utf8"),
) as ContentBundle;

describe("mazos de intensidad R24", () => {
  it("conserva 1030 cartas originales y agrega 2060 variantes", () => {
    expect(bundle.cards).toHaveLength(3090);
    expect(bundle.deckCards).toHaveLength(3090);
    expect(
      bundle.cards.filter((card) => /-V(?:12|34|57)$/.test(card.code)),
    ).toHaveLength(2060);
  });

  it("cada etapa tiene cartas en las tres franjas", () => {
    for (const level of bundle.levels) {
      const cards = bundle.cards.filter((card) => card.level === level.id);
      expect(cards.some((card) => card.intensity <= 2)).toBe(true);
      expect(
        cards.some((card) => card.intensity >= 3 && card.intensity <= 4),
      ).toBe(true);
      expect(cards.some((card) => card.intensity >= 5)).toBe(true);
    }
  });
});
