import { describe, expect, it } from "vitest";
import { normalizeSceneRole } from "../lib/sceneRole";

describe("compatibilidad de gm_scene_role 2.13.2", () => {
  it.each([
    ["warmup", "starter"],
    ["inicio", "starter"],
    ["escalation", "bridge"],
    ["transición", "bridge"],
    ["sustain", "continuation"],
    ["continuación", "continuation"],
    ["payoff", "climax"],
    ["orgasmo", "climax"],
    ["aftercare", "recovery"],
    ["recuperación", "recovery"],
    ["ending", "closer"],
    ["cierre", "closer"],
  ])("convierte %s en %s", (input, expected) => {
    expect(normalizeSceneRole(input)).toBe(expected);
  });

  it("infiere un rol personalizado sin enviarlo crudo a la API", () => {
    expect(
      normalizeSceneRole("custom-role", {
        levelOrder: 6,
        intensity: 8,
        escalationScore: 3,
      }),
    ).toBe("climax");
  });

  it("usa recuperación cuando el puntaje lo exige", () => {
    expect(
      normalizeSceneRole(null, {
        levelOrder: 5,
        intensity: 6,
        recoveryScore: 5,
      }),
    ).toBe("recovery");
  });
});
