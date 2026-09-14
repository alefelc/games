import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const authApi = readFileSync(new URL("../auth/auth-api.ts", import.meta.url), "utf8");
const gameMasterApi = readFileSync(new URL("../api/game-master.ts", import.meta.url), "utf8");

describe("acceso obligatorio 5.1.1", () => {
  it("no renderiza el juego mientras la sesión se inicializa o es anónima", () => {
    const initializingGate = app.indexOf('authStatus === "initializing"');
    const anonymousGate = app.indexOf('authStatus !== "authenticated"');
    const gameRouter = app.indexOf("switch (stage)");

    expect(initializingGate).toBeGreaterThan(-1);
    expect(anonymousGate).toBeGreaterThan(initializingGate);
    expect(gameRouter).toBeGreaterThan(anonymousGate);
    expect(app).toContain("required");
  });

  it("envía el token efímero de la sesión al Game Master", () => {
    expect(authApi).toContain("export function getAccessToken()");
    expect(gameMasterApi).toContain("const accessToken = getAccessToken()");
    expect(gameMasterApi).toContain("Authorization: `Bearer ${accessToken}`");
    expect(gameMasterApi).toContain('code: "ACCOUNT_UNAUTHORIZED"');
  });
});
