import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { settingsSchema } from "../api/schemas";
import { createDefaultSetup } from "../engine/session";
import { ensureIntensityFilterDefinition } from "../lib/dynamicFilters";
import type { ContentBundle } from "../types";

const intensityFilter = {
  id: "intensity",
  key: "maxIntensity",
  label: "Intensidad",
  description: null,
  icon: null,
  filter_kind: "max_number" as const,
  card_fields: [],
  numeric_field: "intensity",
  default_enabled: false,
  default_number: 7,
  min_value: 1,
  max_value: 7,
  visible: true,
  advanced: false,
  sort: 1,
};

describe("intensidad predeterminada administrable r24.4", () => {
  it("la configuración general prevalece sobre el default histórico del filtro", () => {
    const [definition] = ensureIntensityFilterDefinition(
      [intensityFilter],
      { default_intensity_level: 4 },
    );

    expect(definition.default_number).toBe(4);
  });

  it("sin el campo nuevo conserva el valor configurable de pc_filters", () => {
    const [definition] = ensureIntensityFilterDefinition(
      [{ ...intensityFilter, default_number: 3 }],
      { default_intensity_level: null },
    );

    expect(definition.default_number).toBe(3);
  });

  it("limita configuraciones fuera de rango al intervalo real 1–7", () => {
    const [definition] = ensureIntensityFilterDefinition(
      [intensityFilter],
      { default_intensity_level: 99 },
    );

    expect(definition.default_number).toBe(7);
  });

  it("el esquema conserva compatibilidad cuando el campo todavía no existe", () => {
    const base = {
      id: "settings",
      game: "game",
      status: "published",
      default_mode: null,
      default_level: null,
      start_screen_title: "Inicio",
      intro_text: "Intro",
      instructions_text: "Instrucciones",
      safety_text: "Seguridad",
      stop_word: "ALTO",
      age_gate_enabled: true,
      show_timer: true,
      allow_screen_wake_lock: true,
      allow_fullscreen: true,
      allow_vibration: true,
      allow_offline: true,
      maximum_cards_per_session: 40,
      enable_random_level: true,
      enable_private_filters: true,
      analytics_enabled: false,
      maintenance_mode: false,
      default_exclude_photo_video: false,
      default_exclude_third_parties: false,
      default_exclude_public_places: false,
      default_exclude_restraint: false,
      game_master_enabled: false,
      game_master_default_on: false,
      game_master_title: "IA",
      game_master_description: "IA",
    };

    expect(settingsSchema.parse(base).default_intensity_level).toBeNull();
    expect(
      settingsSchema.parse({ ...base, default_intensity_level: 3 })
        .default_intensity_level,
    ).toBe(3);
  });

  it("una partida nueva separa la progresión completa de la intensidad máxima", () => {
    const filters = ensureIntensityFilterDefinition(
      [intensityFilter],
      { default_intensity_level: 3 },
    );
    const content = {
      settings: {
        default_mode: "mode",
        default_level: "level-2",
        default_intensity_level: 3,
        maximum_cards_per_session: 40,
        default_cards_per_session: 20,
        game_master_enabled: false,
        game_master_default_on: false,
        default_exclude_photo_video: false,
        default_exclude_third_parties: false,
        default_exclude_public_places: false,
        default_exclude_restraint: false,
      },
      levels: [
        { id: "level-1", requires_confirmation: false },
        { id: "level-2", requires_confirmation: false },
      ],
      modes: [{ id: "mode", slug: "clasico", turn_mode: "alternating" }],
      decks: [{ id: "deck", active: true, minimum_players: 2, maximum_players: 2 }],
      elements: [],
      toys: [],
      filters,
    } as unknown as ContentBundle;

    const setup = createDefaultSetup(content);
    expect(setup.levelIds).toEqual(["level-1", "level-2"]);
    expect(setup.filters.maxIntensity).toBe(3);
  });

  it("no muestra estadísticas técnicas de cobertura en la interfaz", () => {
    const source = readFileSync(resolve(process.cwd(), "src/screens/SetupScreen.tsx"), "utf8");
    expect(source).not.toContain(["usan", "lo", "elegido"].join(" "));
    expect(source).not.toContain(["incluyen", "coger/penetración"].join(" "));
    expect(source).not.toContain(["incluyen", "juguetes"].join(" "));
  });
});
