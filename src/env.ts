const directusUrl = String(import.meta.env.VITE_DIRECTUS_URL || "").replace(
  /\/+$/,
  "",
);

const configuredGameMasterUrl = String(
  import.meta.env.VITE_GAME_MASTER_URL || "",
).replace(/\/+$/, "");

if (!directusUrl) throw new Error("VITE_DIRECTUS_URL no está configurado.");

function uniqueUrls(values: string[]) {
  return [...new Set(values.map((value) => value.replace(/\/+$/, "")).filter(Boolean))];
}

const sameOriginGameMasterUrl = "/api/game-master";

export const env = {
  directusUrl,
  basePath: String(import.meta.env.BASE_URL || "/"),
  gameSlug: String(import.meta.env.VITE_GAME_SLUG || "te-animas"),
  allowBootstrapFallback:
    String(import.meta.env.VITE_ALLOW_BOOTSTRAP_FALLBACK || "true") !== "false",
  cacheHours: Math.max(
    1,
    Number(import.meta.env.VITE_CONTENT_CACHE_HOURS || 24),
  ),
  // Se prueban ambas rutas. La URL configurada permite llamar directamente al
  // servicio; la ruta local usa el proxy del contenedor del frontend.
  gameMasterUrl: configuredGameMasterUrl || sameOriginGameMasterUrl,
  gameMasterUrls: uniqueUrls([
    configuredGameMasterUrl,
    sameOriginGameMasterUrl,
  ]),
};

export function assetUrl(fileId: string | null | undefined) {
  return fileId
    ? `${env.directusUrl}/assets/${encodeURIComponent(fileId)}`
    : null;
}
