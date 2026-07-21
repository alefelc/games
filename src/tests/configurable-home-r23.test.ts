import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveDefaultCards } from "../lib/cardCount";
import { createDefaultSetup } from "../engine/session";
import type { ContentBundle } from "../types";

describe("configuración editable del inicio r23", () => {
  const home = readFileSync("src/screens/HomeScreen.tsx", "utf8");
  const installer = readFileSync(
    "../directus-installer-2026-07-17/installer-lib.mjs",
    "utf8",
  );

  it("elimina el cuadro redundante de creación de cuenta", () => {
    expect(home).not.toContain("Guardá tus preferencias");
    expect(home).not.toContain("Creá una cuenta y evitá configurar cada partida.");
    expect(home).toContain("Abrir mi perfil");
  });

  it("renderiza Cómo se juega desde pc_app_settings", () => {
    expect(home).toContain("content.settings.how_to_play_eyebrow");
    expect(home).toContain("content.settings.how_to_play_title");
    expect(home).toContain("content.settings.how_to_play_step_1_title");
    expect(home).toContain("content.settings.how_to_play_step_4_text");
    expect(home).toContain("content.settings.how_to_play_button_label");
  });

  it("crea los campos editables en Directus", () => {
    expect(installer).toContain("default_cards_per_session");
    expect(installer).toContain("how_to_play_step_1_title");
    expect(installer).toContain("how_to_play_step_4_text");
    expect(installer).toContain("ensureAppSettingsFields");
  });
});

describe("cantidad predeterminada de cartas r23", () => {
  it("usa el valor de Directus", () => {
    expect(
      resolveDefaultCards({
        maximum_cards_per_session: 40,
        default_cards_per_session: 30,
      }),
    ).toBe(30);
  });

  it("nunca supera el máximo permitido", () => {
    expect(
      resolveDefaultCards({
        maximum_cards_per_session: 25,
        default_cards_per_session: 40,
      }),
    ).toBe(25);
  });

  it("se aplica al crear una partida nueva", () => {
    const content = {
      settings: {
        default_mode: "mode",
        default_level: "level",
        maximum_cards_per_session: 40,
        default_cards_per_session: 35,
        game_master_enabled: false,
        game_master_default_on: false,
        default_exclude_photo_video: true,
        default_exclude_third_parties: true,
        default_exclude_public_places: true,
        default_exclude_restraint: false,
      },
      levels: [{ id: "level", requires_confirmation: false }],
      modes: [{ id: "mode", slug: "pareja", turn_mode: "alternating" }],
      decks: [{ id: "deck", active: true, minimum_players: 2, maximum_players: 2 }],
      elements: [],
      toys: [],
      filters: [],
    } as unknown as ContentBundle;

    expect(createDefaultSetup(content).maxCards).toBe(35);
  });
});
