import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("selector visible de intensidad r22", () => {
  const setup = readFileSync("src/screens/SetupScreen.tsx", "utf8");

  it("muestra el selector en el paso de niveles y lo conecta a maxIntensity", () => {
    expect(setup).toContain("Intensidad de la partida");
    expect(setup).toContain("updateFilters({");
    expect(setup).toContain("selectMaximumIntensity(Number(event.target.value))");
    const intensityBlock = setup.slice(
      setup.indexOf("const selectMaximumIntensity"),
      setup.indexOf("const toggleCustomLevel"),
    );
    expect(intensityBlock).not.toContain("levelIds");
    expect(setup).toContain("limitFilterDefinitions");
  });

  it("permite elegir niveles personalizados de forma independiente", () => {
    expect(setup).toContain("const toggleCustomLevel = (levelId: Id)");
    expect(setup).toContain("levelIds: toggleId(setup.levelIds, levelId)");
    expect(setup).toContain("Marcar uno no activa los anteriores.");
    expect(setup).toContain("aria-pressed={selected}");
    expect(setup).not.toContain("selectProgressionCeiling");
    expect(setup).not.toContain("level.intensity_order <= ceiling");
  });
});
