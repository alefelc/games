import { describe, expect, it } from "vitest";
import {
  buildDynamicFilterDefaults,
  cardPassesDynamicFilters,
  fallbackFilterDefinitions,
  normalizeFilterValues,
} from "../lib/dynamicFilters";

describe("filtros dinámicos v2.12.0", () => {
  it("expone los 16 límites compatibles", () => {
    expect(fallbackFilterDefinitions()).toHaveLength(16);
  });

  it("excluye por campo booleano y riesgo máximo", () => {
    const definitions = fallbackFilterDefinitions();
    const values = buildDynamicFilterDefaults(definitions);
    values.excludeOral = true;
    values.maxPhysicalRisk = 1;

    expect(
      cardPassesDynamicFilters(
        { contains_oral: true, physical_risk: 0 },
        definitions,
        values,
      ),
    ).toBe(false);
    expect(
      cardPassesDynamicFilters(
        { contains_oral: false, physical_risk: 2 },
        definitions,
        values,
      ),
    ).toBe(false);
  });
  it("conserva false cuando una preferencia heredada llega como texto", () => {
    const definitions = fallbackFilterDefinitions();
    const values = normalizeFilterValues(definitions, {
      excludePenetration: "false",
    } as unknown as Record<string, boolean | number>);
    expect(values.excludePenetration).toBe(false);
  });

});
