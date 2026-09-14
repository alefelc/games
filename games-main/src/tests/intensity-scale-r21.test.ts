import { describe, expect, it } from "vitest";
import {
  buildDynamicFilterDefaults,
  cardPassesDynamicFilters,
  ensureIntensityFilterDefinition,
  normalizeFilterDefinitionsForCards,
  type DynamicFilterDefinition,
} from "../lib/dynamicFilters";

const staleIntensityFilter: DynamicFilterDefinition = {
  id: "legacy-max-intensity",
  status: "published",
  key: "maxIntensity",
  label: "Intensidad máxima",
  description: null,
  icon: null,
  filter_kind: "max_number",
  card_fields: [],
  numeric_field: "intensity",
  default_enabled: false,
  default_number: 3,
  min_value: 1,
  max_value: 3,
  visible: true,
  advanced: false,
  sort: 5,
};

describe("escala de intensidad r21", () => {
  it("agrega el filtro de intensidad cuando un catálogo antiguo no lo trae", () => {
    const [definition] = ensureIntensityFilterDefinition([]);

    expect(definition.key).toBe("maxIntensity");
    expect(definition.numeric_field).toBe("intensity");
    expect(definition.visible).toBe(true);
    expect(definition.advanced).toBe(false);
    expect(definition.max_value).toBe(7);
  });

  it("amplía una definición heredada hasta la intensidad real del catálogo", () => {
    const [definition] = normalizeFilterDefinitionsForCards(
      [staleIntensityFilter],
      [{ intensity: 1 }, { intensity: 4 }, { intensity: 7 }],
    );

    expect(definition.min_value).toBe(1);
    expect(definition.max_value).toBe(7);
    expect(definition.default_number).toBe(7);
  });

  it("permite intensidad 4 cuando el máximo elegido es 4 y la excluye en 3", () => {
    const definitions = normalizeFilterDefinitionsForCards(
      [staleIntensityFilter],
      [{ intensity: 1 }, { intensity: 4 }, { intensity: 7 }],
    );
    const values = buildDynamicFilterDefaults(definitions);

    values.maxIntensity = 4;
    expect(
      cardPassesDynamicFilters({ intensity: 4 }, definitions, values),
    ).toBe(true);
    expect(
      cardPassesDynamicFilters({ intensity: 5 }, definitions, values),
    ).toBe(false);
  });


  it("aísla las franjas y no arrastra cartas suaves a una partida intensa", () => {
    const definitions = normalizeFilterDefinitionsForCards(
      [staleIntensityFilter],
      [{ intensity: 1 }, { intensity: 4 }, { intensity: 7 }],
    );
    const values = buildDynamicFilterDefaults(definitions);

    values.maxIntensity = 7;
    expect(cardPassesDynamicFilters({ intensity: 1 }, definitions, values)).toBe(false);
    expect(cardPassesDynamicFilters({ intensity: 4 }, definitions, values)).toBe(false);
    expect(cardPassesDynamicFilters({ intensity: 5 }, definitions, values)).toBe(true);
    expect(cardPassesDynamicFilters({ intensity: 7 }, definitions, values)).toBe(true);

    values.maxIntensity = 4;
    expect(cardPassesDynamicFilters({ intensity: 2 }, definitions, values)).toBe(false);
    expect(cardPassesDynamicFilters({ intensity: 3 }, definitions, values)).toBe(true);
    expect(cardPassesDynamicFilters({ intensity: 4 }, definitions, values)).toBe(true);
    expect(cardPassesDynamicFilters({ intensity: 5 }, definitions, values)).toBe(false);
  });
});
