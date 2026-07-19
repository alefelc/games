import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("selector visible de intensidad r22", () => {
  const setup = readFileSync("src/screens/SetupScreen.tsx", "utf8");

  it("muestra el selector en el paso de niveles y lo conecta a maxIntensity", () => {
    expect(setup).toContain("Intensidad máxima de las cartas");
    expect(setup).toContain("updateFilters({");
    expect(setup).toContain("maxIntensity: Number(event.target.value)");
    expect(setup).toContain("limitFilterDefinitions");
  });
});
