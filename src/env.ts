const directusUrl = String(import.meta.env.VITE_DIRECTUS_URL || "").replace(
  /\/+$/,
  "",
);

const configuredGameMasterUrl = String(
  import.meta.env.VITE_GAME_MASTER_URL || "",
).replace(/\/+$/, "");

if (!directusUrl) throw new Error("VITE_DIRECTUS_URL no está configurado.");

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
  // En producción se usa el mismo dominio del frontend. Nginx reenvía estas
  // solicitudes al Game Master y elimina dependencias de CORS o variables Vite
  // antiguas almacenadas en una PWA.
  gameMasterUrl: import.meta.env.PROD
    ? "/api/game-master"
    : configuredGameMasterUrl || "https://gm.teanimas.com",
};

export function assetUrl(fileId: string | null | undefined) {
  return fileId
    ? `${env.directusUrl}/assets/${encodeURIComponent(fileId)}`
    : null;
}
