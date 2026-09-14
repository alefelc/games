import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const packageRoot = existsSync(resolve(process.cwd(), "src/screens/ProfileScreen.tsx"))
  ? process.cwd()
  : resolve(process.cwd(), "games-main");
const profile = readFileSync(resolve(packageRoot, "src/screens/ProfileScreen.tsx"), "utf8");
const setup = readFileSync(resolve(packageRoot, "src/screens/SetupScreen.tsx"), "utf8");
const app = readFileSync(resolve(packageRoot, "src/App.tsx"), "utf8");

describe("preferencias de perfil 5.1.4", () => {
  it("permite guardar identidad y configuración habitual desde el perfil", () => {
    expect(profile).toContain("Tu sexo");
    expect(profile).toContain("Sexo de tu pareja");
    expect(profile).toContain("Modo de juego");
    expect(profile).toContain("Intensidad / nivel máximo");
    expect(profile).toContain("Duración predeterminada");
    expect(profile).toContain("Dirección adaptativa");
    expect(profile).toContain("Guardar preferencias");
  });

  it("persiste sexo, modo, nivel, duración e IA en una sola operación", () => {
    expect(profile).toContain("playerOneSexSlug: playerOneSexSlug || null");
    expect(profile).toContain("playerTwoSexSlug: playerTwoSexSlug || null");
    expect(profile).toContain("modeSlug: modeSlug || null");
    expect(profile).toContain("levelSlugs,");
    expect(profile).toContain("maxIntensity: maximumIntensity");
    expect(profile).toContain("gameMasterEnabled:");
  });

  it("también deja guardar la configuración rápida", () => {
    expect(setup).toContain("const defaultsPanel = authenticated && onSaveDefaults");
    expect(setup.match(/\{defaultsPanel\}/g)).toHaveLength(2);
  });

  it("no declara fallido el perfil si solo falla la sincronización de pareja", () => {
    expect(app).toContain("await saveCouplePreferences(preferences).catch(() => undefined)");
  });
});
