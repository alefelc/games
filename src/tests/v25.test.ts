import { describe, expect, it } from "vitest";
import { createDefaultSetup } from "../engine/session";
import { isCardEligible } from "../engine/eligibility";
import type { Card, ContentBundle, EligibilityContext } from "../types";
import bootstrap from "../../public/bootstrap-content.json";

const content = bootstrap as unknown as ContentBundle;

describe("v2.5.0", () => {
  it("usa placeholders reales y no valores falsos", () => {
    const setup = createDefaultSetup(content);
    expect(setup.playerOne).toBe("");
    expect(setup.playerTwo).toBe("");
  });

  it("incluye los selectores de sexo", () => {
    expect(content.sexes.map((x) => x.name)).toEqual(["Hombre", "Mujer"]);
  });

  it("excluye cartas anal cuando el filtro está activo", () => {
    const anal = content.cards.find((x) => x.contains_anal) as Card;
    const context: EligibilityContext = {
      selectedLevelIds: new Set([anal.level]),
      selectedDeckIds: new Set(),
      selectedElementIds: new Set(content.elements.map((x) => x.id)),
      selectedToyIds: new Set(content.toys.map((x) => x.id)),
      filters: {
        excludePhotoVideo: false,
        excludeThirdParties: false,
        excludePublicPlaces: false,
        excludeRestraint: false,
        excludePenetration: false,
        excludeAnal: true,
        excludeOral: false,
        excludeNudity: false,
        excludeExplicitLanguage: false,
        excludeFood: false,
        excludeTemperature: false,
        excludeRoleplay: false,
        excludeManualStimulation: false,
        excludeToys: false,
        maxPrivacyRisk: 3,
        maxPhysicalRisk: 3,
      },
      currentPlayerSexId: content.sexes[0].id,
      partnerSexId: content.sexes[1].id,
    };
    const indexes = {
      decksByCard: new Map(),
      elementsByCard: new Map(),
      toysByCard: new Map(),
    };
    expect(isCardEligible(anal, context, indexes)).toBe(false);
  });
});
