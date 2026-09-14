import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const screen = readFileSync("src/screens/GameScreen.tsx", "utf8");

describe("cuadro Ritmo de la partida v2.13.4", () => {
  it("pasa el mensaje y la carta por una defensa antirrepetición", () => {
    expect(screen).toContain("resolveGamePaceMessage({");
    expect(screen).toContain("hostMessage: personalizedHostMessage");
    expect(screen).toContain("cardText: personalizedCardText");
    expect(screen).toContain("<p>{gamePaceMessage}</p>");
    expect(screen).not.toContain("<p>{personalizedHostMessage}</p>");
  });
});
