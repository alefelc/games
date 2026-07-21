import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("logo en pantallas de carga v2.8.4", () => {
  it("muestra una imagen en lugar del nombre escrito", () => {
    const screen = readFileSync("src/screens/LoadingScreen.tsx", "utf8");

    expect(screen).toContain("loading-brand-logo");
    expect(screen).toContain("<img");
    expect(screen).not.toContain("<span>¿Te animás?</span>");
  });

  it("usa el logo configurado y un fallback gráfico", () => {
    const screen = readFileSync("src/screens/LoadingScreen.tsx", "utf8");

    expect(screen).toContain("content?.theme.logo_file");
    expect(screen).toContain("te-animas-symbol.svg");
  });
});
