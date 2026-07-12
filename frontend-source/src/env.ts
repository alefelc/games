const directusUrl = String(import.meta.env.VITE_DIRECTUS_URL || '').replace(/\/+$/, '');
if (!directusUrl) throw new Error('VITE_DIRECTUS_URL no está configurado.');

export const env = {
  directusUrl,
  basePath: String(import.meta.env.BASE_URL || '/'),
  gameSlug: String(import.meta.env.VITE_GAME_SLUG || 'pecadoclub'),
  allowBootstrapFallback: String(import.meta.env.VITE_ALLOW_BOOTSTRAP_FALLBACK || 'true') !== 'false',
  cacheHours: Math.max(1, Number(import.meta.env.VITE_CONTENT_CACHE_HOURS || 24)),
};

export function assetUrl(fileId: string | null | undefined) {
  return fileId ? `${env.directusUrl}/assets/${encodeURIComponent(fileId)}` : null;
}
