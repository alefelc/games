import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Card, ContentBundle, GameSetup, SessionState } from "../types";
import {
  chooseInventoryPool,
  inventoryTargetCards,
} from "../lib/inventoryCoverage";
import { choosePracticePool } from "../lib/practiceCoverage";
import { elementSchema } from "../api/schemas";

const rootBundle = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/bootstrap-content.json"), "utf8"),
) as ContentBundle;

function card(id: string, level: string, penetration = false): Card {
  return {
    id,
    game: "g",
    level,
    status: "published",
    sort: 1,
    code: id,
    title: null,
    text: id,
    instructions: null,
    card_type: "action",
    original_deck: null,
    duration_seconds: null,
    weight: 100,
    intensity: 5,
    minimum_players: 2,
    maximum_players: 2,
    play_scope: "couple",
    performer: "current_player",
    target: "partner",
    performer_sex: null,
    target_sex: null,
    anatomy_focus: penetration ? "concha" : "body",
    anatomy_owner: "target",
    penetration_method: penetration ? "pija" : "none",
    reciprocal_action: false,
    allow_skip: true,
    requires_confirmation: false,
    safety_note: null,
    privacy_risk: 0,
    physical_risk: 0,
    gender_scope: "neutral",
    language: "es-AR",
    contains_oral: false,
    contains_penetration: penetration,
    contains_anal: false,
    contains_restraint: false,
    contains_food: false,
    contains_temperature: false,
    contains_public_place: false,
    contains_third_parties: false,
    contains_photo: false,
    contains_video: false,
    contains_nudity: true,
    contains_roleplay: false,
    contains_toy: false,
    contains_manual_stimulation: false,
    contains_explicit_language: true,
    requires_device: false,
    requires_private_space: true,
    gm_escalation_score: 1,
    gm_energy_score: 4,
    gm_intimacy_score: 3,
    gm_humor_score: 0,
    gm_recovery_score: 0,
    gm_novelty_score: 3,
    gm_scene_role: "continuation",
    gm_continuity_group: id,
  };
}

const setup = {
  elementIds: ["element"],
  toyIds: [],
  maxCards: 12,
} as unknown as GameSetup;

function session(overrides: Partial<SessionState> = {}): SessionState {
  return {
    id: "s",
    startedAt: "2026-07-18T00:00:00.000Z",
    endedAt: null,
    currentCardId: null,
    currentLevelId: "high",
    currentPlayer: 0,
    revealed: false,
    usedCardIds: [],
    completedCardIds: [],
    skippedCardIds: [],
    resolvedCount: 0,
    timerStartedAt: null,
    timerRemaining: null,
    gmPhase: "intense",
    gmTension: 60,
    gmEnergy: 60,
    gmHostMessage: null,
    gmStrategy: null,
    gmReaction: "none",
    gmEvents: [],
    gmFallbackUsed: false,
    gmProvider: null,
    gmModel: null,
    gmLatencyMs: null,
    gmErrorCode: null,
    gmErrorReason: null,
    gmEndpoint: null,
    gmRequestId: null,
    gmApiVersion: null,
    ...overrides,
  };
}

describe("inventario y variedad R20", () => {
  it("publica las 3.090 cartas y relaciones reales para cada opción visible", () => {
    expect(rootBundle.cards).toHaveLength(3090);
    expect(rootBundle.cardElements.length).toBeGreaterThanOrEqual(132);
    expect(rootBundle.cardToys.length).toBeGreaterThanOrEqual(169);
    expect(rootBundle.cards.filter((item) => item.contains_penetration).length).toBeGreaterThan(100);

    const escalation = rootBundle.modes.find((item) => item.slug === "escalada");
    expect(escalation?.cards_before_level_up).toBe(2);

    for (const item of rootBundle.elements.filter((entry) => entry.visible_in_setup)) {
      expect(rootBundle.cardElements.some((row) => row.element === item.id), item.slug).toBe(true);
    }
    for (const item of rootBundle.toys.filter((entry) => entry.visible_in_setup)) {
      expect(rootBundle.cardToys.some((row) => row.toy === item.id), item.slug).toBe(true);
    }
  });

  it("fuerza inventario desde la tercera carta y apunta al 25% de la sesión", () => {
    const normal = card("normal", "high");
    const inventory = card("inventory", "high");
    const content = {
      settings: {
        inventory_guarantee_after_cards: 3,
        inventory_minimum_cards_per_session: 2,
        inventory_preference_multiplier: 6,
      },
      cards: [normal, inventory],
      cardElements: [
        {
          id: "rel",
          card: inventory.id,
          element: "element",
          requirement: "required",
          quantity: 1,
          preparation_note: null,
          sort: 1,
        },
      ],
      cardToys: [],
    } as unknown as ContentBundle;

    expect(inventoryTargetCards(content, setup)).toBe(3);
    const pool = chooseInventoryPool(
      [normal, inventory],
      [normal, inventory],
      content,
      setup,
      session({ resolvedCount: 2 }),
    );
    expect(pool.map((item) => item.id)).toEqual(["inventory"]);
  });

  it("evita que una fase intensa ignore todas las cartas de penetración", () => {
    const priorA = card("prior-a", "high");
    const priorB = card("prior-b", "high");
    const normal = card("normal", "high");
    const penetration = card("penetration", "high", true);
    const content = {
      levels: [{ id: "high", slug: "accion", intensity_order: 5 }],
      cards: [priorA, priorB, normal, penetration],
    } as unknown as ContentBundle;
    const pool = choosePracticePool(
      [normal, penetration],
      content,
      setup,
      session({ completedCardIds: [priorA.id, priorB.id], resolvedCount: 2 }),
    );
    expect(pool.map((item) => item.id)).toEqual(["penetration"]);
  });

  it("interpreta el string false como falso y no como verdadero", () => {
    const parsed = elementSchema.parse({
      id: "e",
      game: "g",
      status: "published",
      name: "Elemento",
      slug: "elemento",
      category: "otro",
      description: null,
      image: null,
      safety_instructions: null,
      is_consumable: "false",
      is_optional: "false",
      solo_compatible: "true",
      solo_gender_scope: "neutral",
      visible_in_setup: "true",
      default_selected: "false",
      selection_priority: 1,
      guarantee_in_session: "true",
      sort: 1,
    });
    expect(parsed.is_consumable).toBe(false);
    expect(parsed.default_selected).toBe(false);
    expect(parsed.visible_in_setup).toBe(true);
  });
});
