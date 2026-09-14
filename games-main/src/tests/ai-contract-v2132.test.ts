import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("contrato adaptativo 2.13.2", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/api/game-master.ts"),
    "utf8",
  );

  it("normaliza los puntajes altos antes de enviar", () => {
    expect(source).toContain("normalizeEscalationScore(card.gm_escalation_score)");
    expect(source).toContain("normalizeFivePointScore(card.gm_energy_score, 2)");
    expect(source).toContain("normalizeFivePointScore(card.gm_intimacy_score, 2)");
  });

  it("normaliza el rol de escena antes de enviar", () => {
    expect(source).toContain("normalizeSceneRole(card.gm_scene_role");
  });

  it("expone los issues devueltos por un 422", () => {
    expect(source).toContain("requestIssueSummary(payloadBody)");
    expect(source).toContain("Detalle:");
  });
});
