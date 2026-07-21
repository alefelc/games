import { env } from "../env";

export class ContentApiError extends Error {
  status: number;
  endpoint: string;

  constructor(message: string, status: number, endpoint: string) {
    super(message);
    this.name = "ContentApiError";
    this.status = status;
    this.endpoint = endpoint;
  }
}

async function getJson<T>(
  endpoint: string,
  signal?: AbortSignal,
  options: { noStore?: boolean } = {},
): Promise<T> {
  const response = await fetch(`${env.directusUrl}${endpoint}`, {
    headers: { Accept: "application/json" },
    signal,
    cache: options.noStore ? "no-store" : "default",
  });

  const text = await response.text();
  let payload: unknown = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const details =
      typeof payload === "string" ? payload : JSON.stringify(payload);

    throw new ContentApiError(
      `No se pudo leer el contenido solicitado. ${details.slice(0, 300)}`,
      response.status,
      endpoint,
    );
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

export interface PublicBundleRecord {
  id?: string;
  version: string;
  published_at?: string;
  content_hash: string;
  bundle?: unknown;
}

export async function readPublicBundle(
  options: {
    includeBundle?: boolean;
    signal?: AbortSignal;
  } = {},
): Promise<PublicBundleRecord> {
  const fields =
    options.includeBundle === false
      ? ["id", "version", "published_at", "content_hash"]
      : ["id", "version", "published_at", "content_hash", "bundle"];

  const params = new URLSearchParams({
    fields: fields.join(","),
    _runtime: String(Date.now()),
  });

  const endpoints = [
    `/items/pc_public_bundle?${params.toString()}`,
    `/items/pc_public_bundle/singleton?${params.toString()}`,
  ];

  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const result = await getJson<PublicBundleRecord | PublicBundleRecord[]>(
        endpoint,
        options.signal,
        { noStore: true },
      );

      if (Array.isArray(result)) {
        if (result.length !== 1) {
          throw new ContentApiError(
            "El contenido publicado no tiene un formato válido.",
            500,
            endpoint,
          );
        }

        return result[0];
      }

      return result;
    } catch (error) {
      lastError = error;

      if (
        !(error instanceof ContentApiError) ||
        ![403, 404, 405].includes(error.status)
      ) {
        throw error;
      }
    }
  }

  throw lastError;
}

const GAME_FIELDS = [
  "id",
  "status",
  "name",
  "slug",
  "tagline",
  "description",
  "minimum_age",
  "default_locale",
  "active",
  "theme",
  "privacy_notice",
  "stop_word",
  "terms_url",
  "sort",
  "cover_image",
];

const THEME_FIELDS = [
  "id",
  "status",
  "name",
  "slug",
  "primary_color",
  "secondary_color",
  "accent_color",
  "background_color",
  "surface_color",
  "card_background_color",
  "card_border_color",
  "text_color",
  "muted_text_color",
  "danger_color",
  "heading_font_family",
  "body_font_family",
  "card_font_family",
  "heading_font_url",
  "body_font_url",
  "card_font_url",
  "border_radius",
  "card_border_radius",
  "button_height",
  "card_ratio",
  "shadow_intensity",
  "enable_card_flip",
  "enable_vibration",
  "enable_sounds",
  "enable_particles",
  "animation_speed",
  "logo_file",
  "favicon_file",
  "app_icon_file",
];

const SETTINGS_FIELDS = [
  "id",
  "game",
  "status",
  "default_mode",
  "default_level",
  "default_intensity_level",
  "start_screen_title",
  "intro_text",
  "instructions_text",
  "how_to_play_eyebrow",
  "how_to_play_title",
  "how_to_play_step_1_title",
  "how_to_play_step_1_text",
  "how_to_play_step_2_title",
  "how_to_play_step_2_text",
  "how_to_play_step_3_title",
  "how_to_play_step_3_text",
  "how_to_play_step_4_title",
  "how_to_play_step_4_text",
  "how_to_play_button_label",
  "safety_text",
  "stop_word",
  "age_gate_enabled",
  "show_timer",
  "allow_screen_wake_lock",
  "allow_fullscreen",
  "allow_vibration",
  "allow_offline",
  "maximum_cards_per_session",
  "default_cards_per_session",
  "enable_random_level",
  "enable_private_filters",
  "analytics_enabled",
  "analytics_measurement_id",
  "maintenance_mode",
  "default_exclude_photo_video",
  "default_exclude_third_parties",
  "default_exclude_public_places",
  "default_exclude_restraint",
  "setup_step_1_label",
  "setup_step_1_title",
  "setup_step_1_subtitle",
  "setup_step_2_label",
  "setup_step_2_title",
  "setup_step_2_subtitle",
  "setup_intensity_title",
  "setup_intensity_level_1_text",
  "setup_intensity_level_2_text",
  "setup_intensity_level_3_text",
  "setup_intensity_level_4_text",
  "setup_intensity_level_5_text",
  "setup_intensity_level_6_text",
  "setup_intensity_level_7_text",
  "setup_step_3_label",
  "setup_step_3_title",
  "setup_step_3_subtitle",
  "setup_step_4_label",
  "setup_step_4_title",
  "setup_step_4_subtitle",
  "cross_session_history_limit",
  "inventory_guarantee_after_cards",
  "inventory_minimum_cards_per_session",
  "inventory_preference_multiplier",
  "game_master_enabled",
  "game_master_default_on",
  "game_master_title",
  "game_master_description",
  "game_master_show_reactions",
];

const OPTIONAL_SETTINGS_FIELDS = new Set([
  "default_intensity_level",
  "analytics_measurement_id",
  "default_cards_per_session",
  "how_to_play_eyebrow",
  "how_to_play_title",
  "how_to_play_step_1_title",
  "how_to_play_step_1_text",
  "how_to_play_step_2_title",
  "how_to_play_step_2_text",
  "how_to_play_step_3_title",
  "how_to_play_step_3_text",
  "how_to_play_step_4_title",
  "how_to_play_step_4_text",
  "how_to_play_button_label",
  "setup_intensity_title",
  "setup_intensity_level_1_text",
  "setup_intensity_level_2_text",
  "setup_intensity_level_3_text",
  "setup_intensity_level_4_text",
  "setup_intensity_level_5_text",
  "setup_intensity_level_6_text",
  "setup_intensity_level_7_text",
]);

const LEVEL_FIELDS = [
  "id",
  "game",
  "status",
  "name",
  "slug",
  "description",
  "intensity_order",
  "color",
  "icon",
  "minimum_cards",
  "recommended_duration_minutes",
  "requires_confirmation",
  "sort",
  "background_image",
];

const DECK_FIELDS = [
  "id",
  "game",
  "level",
  "status",
  "name",
  "slug",
  "description",
  "deck_type",
  "minimum_players",
  "maximum_players",
  "active",
  "sort",
  "cover_image",
];

const MODE_FIELDS = [
  "id",
  "game",
  "status",
  "name",
  "slug",
  "description",
  "starting_level",
  "automatic_progression",
  "cards_before_level_up",
  "allow_manual_level_change",
  "turn_mode",
  "skip_limit",
  "session_duration_minutes",
  "repetition_policy",
  "timer_policy",
  "sort",
];

const ELEMENT_FIELDS = [
  "id",
  "game",
  "status",
  "name",
  "slug",
  "category",
  "description",
  "safety_instructions",
  "is_consumable",
  "is_optional",
  "solo_compatible",
  "solo_gender_scope",
  "visible_in_setup",
  "default_selected",
  "selection_priority",
  "guarantee_in_session",
  "sort",
  "image",
];

const TOY_FIELDS = [
  "id",
  "game",
  "status",
  "name",
  "slug",
  "category",
  "description",
  "intensity_min",
  "difficulty",
  "body_safe_notice",
  "requires_cleaning",
  "cleaning_instructions",
  "requires_lubricant",
  "solo_compatible",
  "solo_gender_scope",
  "visible_in_setup",
  "default_selected",
  "selection_priority",
  "guarantee_in_session",
  "sort",
  "image",
];

const TAG_FIELDS = [
  "id",
  "game",
  "status",
  "name",
  "slug",
  "category",
  "color",
  "sort",
];

const FILTER_FIELDS = [
  "id",
  "game",
  "status",
  "key",
  "label",
  "description",
  "icon",
  "filter_kind",
  "card_fields",
  "numeric_field",
  "default_enabled",
  "default_number",
  "min_value",
  "max_value",
  "visible",
  "advanced",
  "sort",
];

const SEX_FIELDS = [
  "id",
  "game",
  "status",
  "name",
  "slug",
  "description",
  "sort",
];

const CARD_FIELDS = [
  "id",
  "game",
  "level",
  "status",
  "sort",
  "code",
  "title",
  "text",
  "instructions",
  "card_type",
  "original_deck",
  "duration_seconds",
  "weight",
  "intensity",
  "minimum_players",
  "maximum_players",
  "play_scope",
  "performer",
  "target",
  "performer_sex",
  "target_sex",
  "anatomy_focus",
  "anatomy_owner",
  "penetration_method",
  "reciprocal_action",
  "allow_skip",
  "requires_confirmation",
  "safety_note",
  "privacy_risk",
  "physical_risk",
  "gender_scope",
  "language",
  "contains_oral",
  "contains_penetration",
  "contains_anal",
  "contains_restraint",
  "contains_food",
  "contains_temperature",
  "contains_public_place",
  "contains_third_parties",
  "contains_photo",
  "contains_video",
  "contains_nudity",
  "contains_roleplay",
  "contains_toy",
  "contains_manual_stimulation",
  "contains_explicit_language",
  "requires_device",
  "requires_private_space",
  "gm_escalation_score",
  "gm_energy_score",
  "gm_intimacy_score",
  "gm_humor_score",
  "gm_recovery_score",
  "gm_novelty_score",
  "gm_continuity_group",
  "gm_scene_role",
  "card_kind",
  "scene_phase_min",
  "scene_phase_max",
  "scene_phase_after",
  "physical_state_min",
  "physical_state_after",
  "activity_family",
  "activity_action",
  "requires_previous_activity",
  "forbidden_after_activity",
  "allow_activity_change",
  "allow_position_change",
  "allow_rhythm_change",
  "inventory_action",
  "estimated_duration_seconds",
  "variant_group",
  "cooldown_sessions",
];

const DECK_CARD_FIELDS = ["id", "deck", "card", "sort", "enabled"];

const CARD_ELEMENT_FIELDS = [
  "id",
  "card",
  "element",
  "requirement",
  "quantity",
  "preparation_note",
  "sort",
];

const CARD_TOY_FIELDS = [
  "id",
  "card",
  "toy",
  "requirement",
  "quantity",
  "preparation_note",
  "sort",
];

const CARD_TAG_FIELDS = ["id", "card", "tag", "sort"];

function relationId(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: string | number }).id;

    return id === undefined || id === null ? null : String(id);
  }

  return null;
}

async function readFirst<T>(
  collection: string,
  fields: string[],
  filters: Record<string, string>,
  signal?: AbortSignal,
): Promise<T> {
  const params = new URLSearchParams({
    fields: fields.join(","),
    limit: "1",
    ...filters,
    _runtime: String(Date.now()),
  });

  const endpoint = `/items/${collection}?${params.toString()}`;

  const result = await getJson<T[] | T>(endpoint, signal, { noStore: true });

  const item = Array.isArray(result) ? result[0] : result;

  if (!item) {
    throw new ContentApiError(
      "No se encontró el contenido solicitado.",
      404,
      endpoint,
    );
  }

  return item;
}

async function readMany(
  collection: string,
  fields: string[],
  filters: Record<string, string>,
  signal?: AbortSignal,
): Promise<unknown[]> {
  const params = new URLSearchParams({
    fields: fields.join(","),
    limit: "-1",
    ...filters,
    _runtime: String(Date.now()),
  });

  const result = await getJson<unknown[]>(
    `/items/${collection}?${params.toString()}`,
    signal,
    { noStore: true },
  );

  return Array.isArray(result) ? result : [];
}

export interface RuntimeConfigRecord {
  game: unknown;
  theme: unknown;
  settings: unknown;
}

async function readSettings(
  gameId: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const filters = {
    "filter[game][_eq]": gameId,
    "filter[status][_eq]": "published",
  };

  try {
    return await readFirst<Record<string, unknown>>(
      "pc_app_settings",
      SETTINGS_FIELDS,
      filters,
      signal,
    );
  } catch (error) {
    // Permite desplegar el frontend antes de crear campos opcionales nuevos.
    // El esquema completa valores seguros hasta que Directus sea actualizado.
    if (!(error instanceof ContentApiError) || ![400, 403].includes(error.status)) throw error;

    return readFirst<Record<string, unknown>>(
      "pc_app_settings",
      SETTINGS_FIELDS.filter((field) => !OPTIONAL_SETTINGS_FIELDS.has(field)),
      filters,
      signal,
    );
  }
}

export async function readRuntimeConfig(
  signal?: AbortSignal,
): Promise<RuntimeConfigRecord> {
  const game = await readFirst<Record<string, unknown>>(
    "pc_games",
    GAME_FIELDS,
    {
      "filter[status][_eq]": "published",
      "filter[active][_eq]": "true",
      sort: "sort",
    },
    signal,
  );

  const gameId = relationId(game.id);
  const themeId = relationId(game.theme);

  if (!gameId || !themeId) {
    throw new ContentApiError(
      "La configuración principal está incompleta.",
      500,
      "/items/pc_games",
    );
  }

  const [theme, settings] = await Promise.all([
    readFirst<Record<string, unknown>>(
      "pc_themes",
      THEME_FIELDS,
      {
        "filter[id][_eq]": themeId,
        "filter[status][_eq]": "published",
      },
      signal,
    ),
    readSettings(gameId, signal),
  ]);

  return { game, theme, settings };
}

export interface LiveCatalogRecord {
  levels: unknown[];
  decks: unknown[];
  modes: unknown[];
  elements: unknown[];
  toys: unknown[];
  tags: unknown[];
  filters: unknown[];
  sexes: unknown[];
  cards: unknown[];
  deckCards: unknown[];
  cardElements: unknown[];
  cardToys: unknown[];
  cardTags: unknown[];
}

export async function readLiveCatalog(
  gameId: string,
  signal?: AbortSignal,
): Promise<LiveCatalogRecord> {
  const common = {
    "filter[game][_eq]": gameId,
    "filter[status][_eq]": "published",
    sort: "sort",
  };

  const [
    levels,
    decks,
    modes,
    elements,
    toys,
    tags,
    filters,
    sexes,
    cards,
    deckCards,
    cardElements,
    cardToys,
    cardTags,
  ] = await Promise.all([
    readMany("pc_levels", LEVEL_FIELDS, common, signal),
    readMany(
      "pc_decks",
      DECK_FIELDS,
      {
        ...common,
        "filter[active][_eq]": "true",
      },
      signal,
    ),
    readMany("pc_game_modes", MODE_FIELDS, common, signal),
    readMany("pc_elements", ELEMENT_FIELDS, common, signal),
    readMany("pc_toys", TOY_FIELDS, common, signal),
    readMany("pc_tags", TAG_FIELDS, common, signal),
    readMany("pc_filters", FILTER_FIELDS, common, signal),
    readMany("pc_sexes", SEX_FIELDS, common, signal),
    readMany("pc_cards", CARD_FIELDS, common, signal),
    readMany(
      "pc_decks_cards",
      DECK_CARD_FIELDS,
      {
        "filter[deck][game][_eq]": gameId,
        sort: "sort",
      },
      signal,
    ),
    readMany(
      "pc_cards_elements",
      CARD_ELEMENT_FIELDS,
      {
        "filter[card][game][_eq]": gameId,
        sort: "sort",
      },
      signal,
    ),
    readMany(
      "pc_cards_toys",
      CARD_TOY_FIELDS,
      {
        "filter[card][game][_eq]": gameId,
        sort: "sort",
      },
      signal,
    ),
    readMany(
      "pc_cards_tags",
      CARD_TAG_FIELDS,
      {
        "filter[card][game][_eq]": gameId,
        sort: "sort",
      },
      signal,
    ),
  ]);

  const cardIds = new Set(
    cards
      .map((row) => relationId((row as { id?: unknown }).id))
      .filter(Boolean),
  );

  const deckIds = new Set(
    decks
      .map((row) => relationId((row as { id?: unknown }).id))
      .filter(Boolean),
  );

  return {
    levels,
    decks,
    modes,
    elements,
    toys,
    tags,
    filters,
    sexes,
    cards,
    deckCards: deckCards.filter((row) => {
      const item = row as { deck?: unknown; card?: unknown };

      return (
        deckIds.has(relationId(item.deck)) && cardIds.has(relationId(item.card))
      );
    }),
    cardElements: cardElements.filter((row) =>
      cardIds.has(relationId((row as { card?: unknown }).card)),
    ),
    cardToys: cardToys.filter((row) =>
      cardIds.has(relationId((row as { card?: unknown }).card)),
    ),
    cardTags: cardTags.filter((row) =>
      cardIds.has(relationId((row as { card?: unknown }).card)),
    ),
  };
}
