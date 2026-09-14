import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ContentBundle } from "../types";

const bundle = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/bootstrap-content.json"), "utf8"),
) as ContentBundle;
const retired = JSON.parse(
  readFileSync(
    resolve(
      process.cwd(),
      "../directus-installer/data/retired-cards.install.json",
    ),
    "utf8",
  ),
) as Array<{ code: string; reason: string; replacement_code: string | null }>;

describe("catálogo curado 5.1", () => {
  it("publica solo las 894 cartas activas y retira variantes sintéticas", () => {
    expect(bundle.cards).toHaveLength(894);
    expect(bundle.deckCards).toHaveLength(894);
    expect(
      bundle.cards.filter(
        (card) => card.original_deck === "variantes-intensidad-r24",
      ),
    ).toHaveLength(0);
    expect(retired).toHaveLength(2196);
    expect(
      retired.filter((card) => card.reason === "variante_sintetica_r24"),
    ).toHaveLength(2060);
    expect(
      retired.filter((card) => card.reason === "plantilla_corporal_similar"),
    ).toHaveLength(120);
    expect(
      retired.filter(
        (card) => card.reason === "duplicado_exacto_consolidado",
      ),
    ).toHaveLength(14);
    expect(
      retired.filter(
        (card) => card.reason === "duplicado_semantico_consolidado",
      ),
    ).toHaveLength(2);

    const normalized = bundle.cards.map((card) =>
      card.text
        .toLocaleLowerCase("es-AR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9ñ]+/g, " ")
        .trim(),
    );
    expect(new Set(normalized).size).toBe(normalized.length);
  });

  it("mantiene cartas suficientes en todos los niveles publicados", () => {
    for (const level of bundle.levels) {
      const cards = bundle.cards.filter((card) => card.level === level.id);
      expect(cards.length, level.slug).toBeGreaterThanOrEqual(25);
      expect(new Set(cards.map((card) => card.text)).size, level.slug).toBe(
        cards.length,
      );
    }
  });
});
