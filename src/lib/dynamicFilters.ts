import type { AppSettings } from "../types";

export interface DynamicFilterDefinition {
  id: string;
  game?: string;
  status?: string;
  key: string;
  label: string;
  description?: string | null;
  icon?: string | null;
  filter_kind: "boolean_exclusion" | "max_number";
  card_fields: string[];
  numeric_field?: string | null;
  default_enabled: boolean;
  default_number?: number | null;
  min_value?: number | null;
  max_value?: number | null;
  visible: boolean;
  advanced: boolean;
  sort: number;
}

export type DynamicFilterValues = Record<string, boolean | number>;

function asBoolean(value: unknown): boolean {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["false", "0", "no", ""].includes(normalized)) return false;
    if (["true", "1", "yes", "si", "sí"].includes(normalized)) return true;
  }
  return value === true || value === 1;
}

const booleanFilter = (
  key: string,
  label: string,
  cardFields: string[],
  sort: number,
  advanced = false,
  description: string | null = null,
): DynamicFilterDefinition => ({
  id: `fallback-${key}`,
  status: "published",
  key,
  label,
  description,
  icon: null,
  filter_kind: "boolean_exclusion",
  card_fields: cardFields,
  numeric_field: null,
  default_enabled: false,
  default_number: null,
  min_value: null,
  max_value: null,
  visible: true,
  advanced,
  sort,
});

const numberFilter = (
  key: string,
  label: string,
  numericField: string,
  sort: number,
  options: {
    description?: string | null;
    defaultNumber?: number;
    minValue?: number;
    maxValue?: number;
    advanced?: boolean;
  } = {},
): DynamicFilterDefinition => ({
  id: `fallback-${key}`,
  status: "published",
  key,
  label,
  description: options.description ?? null,
  icon: null,
  filter_kind: "max_number",
  card_fields: [],
  numeric_field: numericField,
  default_enabled: false,
  default_number: options.defaultNumber ?? 1,
  min_value: options.minValue ?? 0,
  max_value: options.maxValue ?? 3,
  visible: true,
  advanced: options.advanced ?? true,
  sort,
});

/**
 * Compatibility catalog used only when an older public bundle does not yet
 * contain pc_filters. Live definitions from the content service always win.
 */
export function fallbackFilterDefinitions(
  settings?: Partial<AppSettings>,
): DynamicFilterDefinition[] {
  const definitions = [
    numberFilter(
      "maxIntensity",
      "Intensidad máxima de las cartas",
      "intensity",
      5,
      {
        description:
          "La escala real del contenido va de 1 a 7. Los niveles elegidos siguen definiendo la progresión.",
        defaultNumber: 7,
        minValue: 1,
        maxValue: 7,
        advanced: false,
      },
    ),
    booleanFilter(
      "excludePhotoVideo",
      "Fotos o videos",
      ["contains_photo", "contains_video"],
      10,
      false,
      "Evita crear o enviar contenido íntimo.",
    ),
    booleanFilter(
      "excludeThirdParties",
      "Terceras personas",
      ["contains_third_parties"],
      20,
    ),
    booleanFilter(
      "excludePublicPlaces",
      "Lugares públicos",
      ["contains_public_place"],
      30,
    ),
    booleanFilter(
      "excludeRestraint",
      "Ataduras o sujeción",
      ["contains_restraint"],
      40,
    ),
    booleanFilter(
      "excludePenetration",
      "Penetración",
      ["contains_penetration"],
      50,
    ),
    booleanFilter("excludeOral", "Sexo oral", ["contains_oral"], 60),
    booleanFilter(
      "excludeAnal",
      "Anal",
      ["contains_anal"],
      70,
      false,
      "Excluye estimulación externa y penetración anal.",
    ),
    booleanFilter("excludeNudity", "Desnudez", ["contains_nudity"], 80),
    booleanFilter(
      "excludeManualStimulation",
      "Estimulación manual",
      ["contains_manual_stimulation"],
      90,
    ),
    booleanFilter("excludeToys", "Juguetes", ["contains_toy"], 100),
    booleanFilter(
      "excludeRoleplay",
      "Roles o fantasías actuadas",
      ["contains_roleplay"],
      110,
      true,
    ),
    booleanFilter(
      "excludeFood",
      "Comida o bebidas",
      ["contains_food"],
      120,
      true,
    ),
    booleanFilter(
      "excludeTemperature",
      "Frío o calor",
      ["contains_temperature"],
      130,
      true,
    ),
    booleanFilter(
      "excludeExplicitLanguage",
      "Lenguaje explícito",
      ["contains_explicit_language"],
      140,
      true,
    ),
    numberFilter(
      "maxPrivacyRisk",
      "Riesgo de privacidad máximo",
      "privacy_risk",
      150,
    ),
    numberFilter(
      "maxPhysicalRisk",
      "Riesgo físico máximo",
      "physical_risk",
      160,
    ),
  ];

  const settingDefaults: Record<string, boolean> = {
    excludePhotoVideo: Boolean(settings?.default_exclude_photo_video),
    excludeThirdParties: Boolean(settings?.default_exclude_third_parties),
    excludePublicPlaces: Boolean(settings?.default_exclude_public_places),
    excludeRestraint: Boolean(settings?.default_exclude_restraint),
  };

  return definitions.map((definition) =>
    definition.key in settingDefaults
      ? { ...definition, default_enabled: settingDefaults[definition.key] }
      : definition,
  );
}

export function normalizeFilterDefinitionsForCards(
  definitions: DynamicFilterDefinition[],
  cards: Array<Record<string, unknown>>,
): DynamicFilterDefinition[] {
  return definitions.map((definition) => {
    if (
      definition.filter_kind !== "max_number" ||
      !definition.numeric_field
    ) {
      return definition;
    }

    const observedValues = cards
      .map((card) => Number(card[definition.numeric_field as string]))
      .filter(Number.isFinite);

    if (!observedValues.length) return definition;

    const observedMinimum = Math.min(...observedValues);
    const observedMaximum = Math.max(...observedValues);
    const finiteOrNull = (value: number | null | undefined) => {
      if (value === null || value === undefined) {
        return null;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const configuredMinimum = finiteOrNull(definition.min_value);
    const configuredMaximum = finiteOrNull(definition.max_value);
    const effectiveMinimum =
      configuredMinimum === null
        ? observedMinimum
        : Math.min(configuredMinimum, observedMinimum);
    const effectiveMaximum =
      configuredMaximum === null
        ? observedMaximum
        : Math.max(configuredMaximum, observedMaximum);
    const configuredDefault = finiteOrNull(definition.default_number);
    const defaultRepresentedFullRange =
      configuredDefault !== null &&
      ((configuredMaximum === null &&
        definition.numeric_field === "intensity") ||
        (configuredMaximum !== null &&
          configuredDefault >= configuredMaximum));
    const effectiveDefault =
      configuredDefault === null
        ? effectiveMaximum
        : defaultRepresentedFullRange
          ? effectiveMaximum
          : Math.min(
              effectiveMaximum,
              Math.max(effectiveMinimum, configuredDefault),
            );

    return {
      ...definition,
      min_value: effectiveMinimum,
      max_value: effectiveMaximum,
      default_number: effectiveDefault,
    };
  });
}

export function buildDynamicFilterDefaults(
  definitions: DynamicFilterDefinition[] | null | undefined,
): DynamicFilterValues {
  const activeDefinitions = definitions?.length
    ? definitions
    : fallbackFilterDefinitions();
  return Object.fromEntries(
    activeDefinitions.map((definition) => [
      definition.key,
      definition.filter_kind === "max_number"
        ? Number(definition.default_number ?? definition.max_value ?? 0)
        : asBoolean(definition.default_enabled),
    ]),
  );
}

export function normalizeFilterValues(
  definitions: DynamicFilterDefinition[] | null | undefined,
  values: DynamicFilterValues | null | undefined,
): DynamicFilterValues {
  const activeDefinitions = definitions?.length
    ? definitions
    : fallbackFilterDefinitions();
  const defaults = buildDynamicFilterDefaults(activeDefinitions);
  const incoming = values ?? {};

  for (const definition of activeDefinitions) {
    if (!(definition.key in incoming)) continue;

    if (definition.filter_kind === "max_number") {
      const parsed = Number(incoming[definition.key]);
      if (!Number.isFinite(parsed)) continue;
      const minimum = Number(definition.min_value ?? parsed);
      const maximum = Number(definition.max_value ?? parsed);
      defaults[definition.key] = Math.min(
        Math.max(parsed, minimum),
        Math.max(minimum, maximum),
      );
      continue;
    }

    defaults[definition.key] = asBoolean(incoming[definition.key]);
  }

  // Keep legacy preference keys so an older saved profile is not silently
  // erased before its matching content definition is loaded.
  for (const [key, value] of Object.entries(incoming)) {
    if (key in defaults) continue;
    if (typeof value === "number" && Number.isFinite(value)) {
      defaults[key] = value;
    } else {
      defaults[key] = asBoolean(value);
    }
  }

  return defaults;
}

export function cardPassesDynamicFilters(
  card: Record<string, unknown>,
  definitions: DynamicFilterDefinition[] | null | undefined,
  values: DynamicFilterValues,
): boolean {
  const activeDefinitions = definitions?.length
    ? definitions
    : fallbackFilterDefinitions();
  for (const definition of activeDefinitions) {
    const value = values[definition.key];

    if (
      definition.filter_kind === "boolean_exclusion" &&
      value === true &&
      definition.card_fields.some((field) => Boolean(card[field]))
    ) {
      return false;
    }

    if (definition.filter_kind === "max_number" && definition.numeric_field) {
      const maximum = Number(
        value ?? definition.default_number ?? definition.max_value ?? 0,
      );
      if (Number(card[definition.numeric_field] ?? 0) > maximum) return false;
    }
  }

  return true;
}
