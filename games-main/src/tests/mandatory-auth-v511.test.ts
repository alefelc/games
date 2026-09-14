import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const packageRoot = existsSync(resolve(process.cwd(), "src/App.tsx"))
  ? process.cwd()
  : resolve(process.cwd(), "games-main");
const app = readFileSync(resolve(packageRoot, "src/App.tsx"), "utf8");
const authApi = readFileSync(resolve(packageRoot, "src/auth/auth-api.ts"), "utf8");
const gameMasterApi = readFileSync(resolve(packageRoot, "src/api/game-master.ts"), "utf8");

describe("acceso obligatorio 5.1.3", () => {
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

  it("no cancela el login si falla una función opcional de pareja", () => {
    const authStore = readFileSync(resolve(packageRoot, "src/auth/useAuthStore.ts"), "utf8");
    expect(authStore).toContain("[401, 403, 404, 503].includes(error.status)");
  });

  it("conserva una sesión válida cuando el servicio privado está caído", () => {
    const authStore = readFileSync(resolve(packageRoot, "src/auth/useAuthStore.ts"), "utf8");

    expect(authApi).toContain("export async function readCurrentUser()");
    expect(authApi).toContain("/users/me?fields=id,email,first_name,last_name,status");
    expect(authStore).toContain("const user = await readCurrentUser()");
    expect(authStore).toContain("account = { user, profile: null }");
  });
});
