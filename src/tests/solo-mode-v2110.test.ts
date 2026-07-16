import { describe, expect, it } from "vitest";
import type { Card, ContentBundle, EligibilityContext } from "../types";
import { buildEligibilityIndexes, isCardEligible } from "../engine/eligibility";
import {
  createDefaultSetup,
  createSession,
  resolveCurrentCard,
} from "../engine/session";
import { personalizeCardText } from "../utils/personalize-card-text";

function soloCard(sex: string | null): Card {
  return {
    id: "solo-card",
    game: "game",
    level: "level",
    status: "published",
    sort: 1,
    code: "SOLO",
    title: null,
    text: "Recorré tu cuerpo.",
    instructions: null,
    card_type: "action",
    original_deck: null,
    duration_seconds: null,
    weight: 100,
    intensity: 3,
    minimum_players: 1,
    maximum_players: 1,
    play_scope: "solo",
    performer: "self",
    target: "self",
    performer_sex: sex,
    target_sex: sex,
    anatomy_focus: "body",
    anatomy_owner: "performer",
    penetration_method: "none",
    reciprocal_action: false,
    allow_skip: true,
    requires_confirmation: false,
    safety_note: null,
    privacy_risk: 0,
    physical_risk: 0,
    gender_scope: "neutral",
    language: "es-AR",
    contains_oral: false,
    contains_penetration: false,
    contains_anal: false,
    contains_restraint: false,
    contains_food: false,
    contains_temperature: false,
    contains_public_place: false,
    contains_third_parties: false,
    contains_photo: false,
    contains_video: false,
    contains_nudity: false,
    contains_roleplay: false,
    contains_toy: false,
    contains_manual_stimulation: true,
    contains_explicit_language: false,
    requires_device: false,
    requires_private_space: true,
    gm_escalation_score: 1,
    gm_energy_score: 3,
    gm_intimacy_score: 3,
    gm_humor_score: 0,
    gm_recovery_score: 0,
    gm_novelty_score: 4,
    gm_continuity_group: "solo-body",
    gm_scene_role: "continuation",
  };
}

const filters = {
  excludePhotoVideo: false,
  excludeThirdParties: false,
  excludePublicPlaces: false,
  excludeRestraint: false,
  excludePenetration: false,
  excludeAnal: false,
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
};

describe("modo Solitario v2.11.0", () => {
  it("acepta una carta individual compatible y bloquea una de pareja", () => {
    const card = soloCard("male");
    const content = {
      deckCards: [],
      cardElements: [],
      cardToys: [],
    } as unknown as ContentBundle;
    const context: EligibilityContext = {
      playerCount: 1,
      selectedLevelIds: new Set(["level"]),
      selectedDeckIds: new Set(),
      selectedElementIds: new Set(),
      selectedToyIds: new Set(),
      filters,
      currentPlayerSexId: "male",
      partnerSexId: null,
    };
    const indexes = buildEligibilityIndexes(content);
    expect(isCardEligible(card, context, indexes)).toBe(true);
    expect(
      isCardEligible(
        { ...card, play_scope: "couple", minimum_players: 2 },
        context,
        indexes,
      ),
    ).toBe(false);
  });

  it("mantiene siempre el turno en la persona única", () => {
    const content = {
      settings: {
        default_mode: "solo",
        default_level: "level",
        maximum_cards_per_session: 20,
        default_exclude_photo_video: false,
        default_exclude_third_parties: false,
        default_exclude_public_places: false,
        default_exclude_restraint: false,
        game_master_enabled: false,
        game_master_default_on: false,
      },
      levels: [
        { id: "level", requires_confirmation: false, intensity_order: 1 },
      ],
      modes: [
        {
          id: "solo",
          slug: "solitario",
          turn_mode: "single",
          starting_level: "level",
        },
      ],
      decks: [
        { id: "deck", active: true, minimum_players: 1, maximum_players: 1 },
      ],
    } as unknown as ContentBundle;
    const setup = createDefaultSetup(content);
    const session = {
      ...createSession(content, setup),
      currentCardId: "card",
      currentPlayer: 0 as const,
    };
    expect(
      resolveCurrentCard(content, setup, session, "completed").currentPlayer,
    ).toBe(0);
  });

  it("resuelve la variable player", () => {
    expect(
      personalizeCardText({
        text: "{{player}}, recorré tu cuerpo.",
        actorName: "Ale",
        targetName: "Ale",
        partnerName: "Ale",
        playerOneName: "Ale",
        playerTwoName: "Ale",
        playerName: "Ale",
        playerSex: "hombre",
      }),
    ).toBe("Ale, recorré tu cuerpo.");
  });
});
