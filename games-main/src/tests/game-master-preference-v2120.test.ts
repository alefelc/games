import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("preferencia de dirección adaptativa v2.12.0", () => {
  it("permite conservar o cambiar la preferencia aunque el chequeo inicial falle", () => {
    const setup = readFileSync("src/screens/SetupScreen.tsx", "utf8");

    expect(setup).toContain("checked={setup.gameMasterEnabled}");
    expect(setup).toContain("gameMasterEnabled: !setup.gameMasterEnabled");
    expect(setup).toContain("se volverá a comprobar al iniciar");
    expect(setup).not.toContain(
      "checked={setup.gameMasterEnabled && gameMasterAvailable}",
    );
  });
});
