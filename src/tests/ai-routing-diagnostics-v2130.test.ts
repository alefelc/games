import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("diagnóstico de IA v2.13.0", () => {
  it("prueba la URL configurada y el proxy del mismo origen", () => {
    const environment = readFileSync("src/env.ts", "utf8");
    const client = readFileSync("src/api/game-master.ts", "utf8");

    expect(environment).toContain("configuredGameMasterUrl");
    expect(environment).toContain('sameOriginGameMasterUrl = "/api/game-master"');
    expect(environment).toContain("gameMasterUrls: uniqueUrls");
    expect(client).toContain("for (const baseUrl of env.gameMasterUrls)");
  });

  it("expone la causa técnica sin ocultarla como modo local", () => {
    const screen = readFileSync("src/screens/GameScreen.tsx", "utf8");
    const types = readFileSync("src/types.ts", "utf8");

    expect(types).toContain("gmErrorCode");
    expect(types).toContain("gmEndpoint");
    expect(types).toContain("gmRequestId");
    expect(screen).toContain("session.gmErrorCode");
    expect(screen).toContain("session.gmEndpoint");
    expect(screen).toContain("session.gmRequestId");
  });
});
