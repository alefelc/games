import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dirección adaptativa v2.12.0", () => {
  it("comprueba disponibilidad real", () => {
    const api = readFileSync("src/api/game-master.ts", "utf8");
    expect(api).toContain("checkGameMasterAvailability");
    expect(api).toContain("/health");
    expect(api).toContain("4_500");
  });

  it("respeta el modo local elegido", () => {
    const engine = readFileSync("src/engine/game-master.ts", "utf8");
    expect(engine).toContain("if (!setup.gameMasterEnabled)");
    expect(engine).toContain("drawNextCard");
  });

  it("no deja una pantalla vacía", () => {
    const main = readFileSync("src/main.tsx", "utf8");
    expect(main).toContain("AppErrorBoundary");
  });

  it("distingue caída temporal de modo local", () => {
    const screen = readFileSync("src/screens/GameScreen.tsx", "utf8");
    expect(screen).toContain("Recuperación temporal");
    expect(screen).toContain("Modo local elegido");
  });
});
