import { describe, expect, it } from "vitest";
import {
  buildDynamicFilterDefaults,
  cardPassesDynamicFilters,
  fallbackFilterDefinitions,
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
});
