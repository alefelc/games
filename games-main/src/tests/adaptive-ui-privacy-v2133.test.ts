import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("interfaz adaptativa pública v2.13.3", () => {
  it("no expone telemetría técnica dentro de la partida", () => {
    const source = readFileSync("src/screens/GameScreen.tsx", "utf8");

    expect(source).not.toContain("adaptive-technical-data");
    expect(source).not.toContain("<dt>Modelo</dt>");
    expect(source).not.toContain("<dt>Respuesta</dt>");
    expect(source).not.toContain("<dt>API</dt>");
    expect(source).not.toContain("<dt>Ruta</dt>");
    expect(source).not.toContain("<dt>Solicitud</dt>");
    expect(source).not.toContain("gmErrorReason &&");
    expect(source).not.toContain("Falla ${session.gmErrorCode}");
  });

  it("mantiene un estado adaptativo comprensible", () => {
    const source = readFileSync("src/screens/GameScreen.tsx", "utf8");

    expect(source).toContain("IA activa");
    expect(source).toContain("Adaptación local");
    expect(source).toContain("Recuperación temporal");
    expect(source).toContain("Modo local elegido");
  });
});
