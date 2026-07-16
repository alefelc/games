import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { personalizeCardText } from "../utils/personalize-card-text";

const base = {
  actorName: "Ale",
  targetName: "Ann",
  partnerName: "Ann",
  playerOneName: "Ale",
  playerTwoName: "Ann",
  currentPlayerName: "Ale",
  actorSex: "hombre",
  targetSex: "mujer",
  partnerSex: "mujer",
  playerOneSex: "hombre",
  playerTwoSex: "mujer",
  currentPlayerSex: "hombre",
};

describe("variables y género v2.10.1", () => {
  it("resuelve variables dentro del mensaje de ritmo", () => {
    expect(
      personalizeCardText({
        ...base,
        text: "{{actor}}, seguí provocando a {{target}}.",
      }),
    ).toBe("Ale, seguí provocando a Ann.");
  });

  it("elige la forma femenina", () => {
    expect(
      personalizeCardText({
        ...base,
        text: "No pares hasta hacerla o hacerlo acabar.",
      }),
    ).toBe("No pares hasta hacerla acabar.");
  });

  it("elige la forma masculina", () => {
    expect(
      personalizeCardText({
        ...base,
        targetName: "Bruno",
        targetSex: "hombre",
        text: "No pares hasta hacerlo o hacerla acabar.",
      }),
    ).toBe("No pares hasta hacerlo acabar.");
  });

  it("resuelve pronombres declarados", () => {
    expect(
      personalizeCardText({
        ...base,
        text: "Acercate a {{target}} y no dejes de mirar{{target_object}}.",
      }),
    ).toBe("Acercate a Ann y no dejes de mirarla.");
  });

  it("no deja variables visibles", () => {
    expect(
      personalizeCardText({
        ...base,
        text: "{{actor}} avanzá. {{variable_desconocida}}",
      }),
    ).toBe("Ale avanzá.");
  });

  it("el GameScreen personaliza también el ritmo", () => {
    const screen = readFileSync("src/screens/GameScreen.tsx", "utf8");

    expect(screen).toContain("personalizedHostMessage");
    expect(screen).toContain("renderText(session.gmHostMessage)");
    expect(screen).not.toContain("<p>{session.gmHostMessage}</p>");
  });
});
