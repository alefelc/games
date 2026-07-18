import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const frontendApi = readFileSync(resolve(process.cwd(), "src/auth/auth-api.ts"), "utf8");
const frontendScreen = readFileSync(resolve(process.cwd(), "src/screens/AuthScreen.tsx"), "utf8");
const backendDirectus = readFileSync(
  resolve(process.cwd(), "../te-animas-game-master-main/src/directus.ts"),
  "utf8",
);
const backendAccount = readFileSync(
  resolve(process.cwd(), "../te-animas-game-master-main/src/account.ts"),
  "utf8",
);
const backendServer = readFileSync(
  resolve(process.cwd(), "../te-animas-game-master-main/src/server.ts"),
  "utf8",
);
const installerSource = readFileSync(
  resolve(process.cwd(), "../directus-auth-r19/lib.mjs"),
  "utf8",
);

describe("seguridad de cuentas v2.14.3", () => {
  it("usa cookie HTTP-only para refresh y no persiste tokens", () => {
    expect(frontendApi).toContain('mode: "cookie"');
    expect(frontendApi).toContain('credentials: "include"');
    expect(frontendApi).not.toContain("localStorage.setItem");
    expect(frontendApi).not.toContain("sessionStorage.setItem");
  });

  it("el navegador no accede directamente a la colección privada", () => {
    expect(frontendApi).toContain('"/v1/account/me"');
    expect(frontendApi).toContain('"/v1/account/profile"');
    expect(frontendApi).not.toContain("/items/pc_user_profiles");
    expect(frontendApi).not.toContain("userId");
  });

  it("el registro pasa por Game Master y la activación usa la invitación nativa", () => {
    expect(frontendApi).toContain('"/v1/account/register"');
    expect(frontendApi).toContain('"/users/invite/accept"');
    expect(frontendApi).not.toContain('"/users/register"');
    expect(frontendScreen).toContain('"accept-invite"');
    expect(frontendScreen).not.toContain('auth=verify');
  });

  it("la API identifica al dueño desde el token y fija el user en el servidor", () => {
    expect(backendDirectus).toContain('"/users/me?fields=id"');
    expect(backendDirectus).toContain("JSON.stringify({ user: userId, preferences })");
    expect(backendAccount).toContain("authenticateAccountToken(accessToken)");
    expect(backendServer).toContain('requestUrl.pathname.startsWith("/v1/account/")');
    expect(backendServer).toContain("bearerToken(request)");
  });

  it("la API crea usuarios invitados sin depender del registro público", () => {
    expect(backendDirectus).toContain('status: "invited"');
    expect(backendDirectus).toContain('"/users/invite"');
    expect(backendDirectus).toContain("config.playerRoleId");
    expect(backendServer).toContain('requestUrl.pathname === "/v1/account/register"');
  });

  it("el instalador no toca settings, permisos, políticas ni access", () => {
    expect(installerSource).toContain("'/collections'");
    expect(installerSource).toContain("'/roles'");
    expect(installerSource).toContain("'/policies/me/globals'");
    expect(installerSource).not.toMatch(/client\.request\(['"](?:POST|PATCH|DELETE)['"],\s*['"]\/(?:settings|permissions|policies|access)/);
    expect(installerSource).not.toMatch(/\b(knex|ALTER TABLE|INSERT INTO|DELETE FROM|directus_migrations)\b/i);
  });

  it("exige Admin Access antes del primer cambio y revierte objetos nuevos", () => {
    const preflight = installerSource.indexOf("globals.data?.admin_access !== true");
    const firstWrite = installerSource.indexOf("await ensureCollection");
    expect(preflight).toBeGreaterThan(-1);
    expect(firstWrite).toBeGreaterThan(preflight);
    expect(installerSource).toContain("await rollback(client, state, log)");
  });
});
