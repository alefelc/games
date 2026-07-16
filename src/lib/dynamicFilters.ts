export interface DynamicFilterDefinition {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  icon?: string | null;
  filter_kind: 'boolean_exclusion' | 'max_number';
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

export function buildDynamicFilterDefaults(definitions: DynamicFilterDefinition[]): DynamicFilterValues {
  return Object.fromEntries(definitions.map(def => [def.key, def.filter_kind === 'max_number' ? Number(def.default_number ?? def.max_value ?? 0) : Boolean(def.default_enabled)]));
}

export function cardPassesDynamicFilters(card: Record<string, unknown>, definitions: DynamicFilterDefinition[], values: DynamicFilterValues): boolean {
  for (const def of definitions) {
    const value = values[def.key];
    if (def.filter_kind === 'boolean_exclusion' && value === true && def.card_fields.some(field => Boolean(card[field]))) return false;
    if (def.filter_kind === 'max_number' && def.numeric_field) {
      const max = Number(value ?? def.default_number ?? def.max_value ?? 0);
      if (Number(card[def.numeric_field] ?? 0) > max) return false;
    }
  }
  return true;
}
