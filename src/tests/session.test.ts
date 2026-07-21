import { describe, expect, it } from "vitest";
import type { Card, ContentBundle } from "../types";
import {
  createDefaultSetup,
  createSession,
  drawNextCard,
  resolveCurrentCard,
} from "../engine/session";

function makeCard(id: string, level: string): Card {
  return {
    id,
    game: "game",
    level,
    status: "published",
    sort: 1,
    code: id,
    title: null,
    text: id,
    instructions: null,
    card_type: "challenge",
    original_deck: null,
    duration_seconds: null,
    weight: 100,
    intensity: 1,
    minimum_players: 2,
    maximum_players: 2,
    performer: "current_player",
    target: "partner",
    allow_skip: true,
    requires_confirmation: false,
    safety_note: null,
    privacy_risk: 0,
    physical_risk: 0,
    gender_scope: "neutral",
    language: "es-AR",
    contains_oral: false,
    contains_penetration: false,
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
    contains_manual_stimulation: false,
    contains_explicit_language: false,
    requires_device: false,
    requires_private_space: false,
  };
}

const content = {
  settings: {
    default_mode: "mode",
    default_level: "level-1",
    default_exclude_photo_video: true,
    default_exclude_third_parties: true,
    default_exclude_public_places: true,
    default_exclude_restraint: false,
    maximum_cards_per_session: 40,
  },
  levels: [
    {
      id: "level-1",
      slug: "previa",
      intensity_order: 1,
      requires_confirmation: false,
    },
    {
      id: "level-2",
      slug: "caliente",
      intensity_order: 2,
      requires_confirmation: false,
    },
  ],
  modes: [
    {
      id: "mode",
      slug: "escalada",
      starting_level: "level-1",
      automatic_progression: true,
      cards_before_level_up: 1,
      allow_manual_level_change: false,
      turn_mode: "alternating",
    },
  ],
  decks: [{ id: "deck", active: true }],
  cards: [makeCard("a", "level-1"), makeCard("b", "level-2")],
  deckCards: [
    { id: "da", deck: "deck", card: "a", sort: 1, enabled: true },
    { id: "db", deck: "deck", card: "b", sort: 2, enabled: true },
  ],
  cardElements: [],
  cardToys: [],
} as unknown as ContentBundle;

describe("motor de sesión", () => {
  it("mantiene el modo previa-solamente dentro de la fase inicial", () => {
    const previaContent = {
      ...content,
      settings: { ...content.settings, default_mode: "mode-previa" },
      modes: [
        {
          ...content.modes[0],
          id: "mode-previa",
          slug: "previa-solamente",
          automatic_progression: false,
          starting_level: "level-1",
        },
      ],
    } as ContentBundle;

    const setup = createDefaultSetup(previaContent);
    setup.filters.maxIntensity = 2;
    expect(setup.levelIds).toEqual(["level-1"]);

    const session = createSession(previaContent, setup);
    const draw = drawNextCard(previaContent, setup, session, () => 0);
    expect(draw.card?.id).toBe("a");
    expect(draw.session.currentLevelId).toBe("level-1");
  });

  it("sube de nivel en modo escalada y no repite", () => {
    const setup = createDefaultSetup(content);
    setup.levelIds = ["level-1", "level-2"];
    setup.deckIds = ["deck"];
    setup.filters.maxIntensity = 2;
    let session = createSession(content, setup);
    let draw = drawNextCard(content, setup, session, () => 0);
    expect(draw.card?.id).toBe("a");
    session = resolveCurrentCard(
      content,
      setup,
      draw.session,
      "completed",
      () => 0,
    );
    draw = drawNextCard(content, setup, session, () => 0);
    expect(draw.card?.id).toBe("b");
    expect(draw.session.usedCardIds).toEqual(["a", "b"]);
  });
});
