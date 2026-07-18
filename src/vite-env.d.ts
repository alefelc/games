/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_DIRECTUS_URL: string;
  readonly VITE_BASE_PATH: string;
  readonly VITE_GAME_SLUG: string;
  readonly VITE_GA4_MEASUREMENT_ID: string;
  readonly VITE_ALLOW_BOOTSTRAP_FALLBACK: string;
  readonly VITE_CONTENT_CACHE_HOURS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
