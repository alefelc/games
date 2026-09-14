export interface SoloScopedResource {
  solo_compatible: boolean;
  solo_gender_scope?: string | null;
}

const UNIVERSAL_SCOPES = new Set([
  "",
  "all",
  "any",
  "neutral",
  "unisex",
  "todos",
  "todas",
  "cualquiera",
]);

function normalizeScope(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeSex(value: string | null | undefined): string | null {
  const normalized = normalizeScope(value);
  if (!normalized) return null;
  if (["hombre", "male", "masculino"].includes(normalized)) return "hombre";
  if (["mujer", "female", "femenino"].includes(normalized)) return "mujer";
  return normalized;
}

export function isSoloResourceCompatible(
  resource: SoloScopedResource,
  playerSexSlug: string | null,
): boolean {
  if (!resource.solo_compatible) return false;

  const scope = normalizeScope(resource.solo_gender_scope);
  if (UNIVERSAL_SCOPES.has(scope)) return true;

  const normalizedPlayerSex = normalizeSex(playerSexSlug);
  return normalizedPlayerSex !== null && normalizeSex(scope) === normalizedPlayerSex;
}
