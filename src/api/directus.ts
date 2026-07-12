import { env } from '../env';

export class DirectusPublicError extends Error {
  status: number;
  endpoint: string;

  constructor(message: string, status: number, endpoint: string) {
    super(message);
    this.name = 'DirectusPublicError';
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
    headers: { Accept: 'application/json' },
    signal,
    cache: options.noStore ? 'no-store' : 'default',
  });

  const text = await response.text();
  let payload: unknown = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }

  if (!response.ok) {
    const details = typeof payload === 'string' ? payload : JSON.stringify(payload);
    throw new DirectusPublicError(
      `Directus devolvió ${response.status}. ${details.slice(0, 500)}`,
      response.status,
      endpoint,
    );
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
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
  options: { includeBundle?: boolean; signal?: AbortSignal } = {},
): Promise<PublicBundleRecord> {
  const fields = options.includeBundle === false
    ? ['id', 'version', 'published_at', 'content_hash']
    : ['id', 'version', 'published_at', 'content_hash', 'bundle'];
  const params = new URLSearchParams({ fields: fields.join(',') });
  const endpoints = [
    `/items/pc_public_bundle?${params.toString()}`,
    `/items/pc_public_bundle/singleton?${params.toString()}`,
  ];
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const result = await getJson<PublicBundleRecord | PublicBundleRecord[]>(endpoint, options.signal);
      if (Array.isArray(result)) {
        if (result.length !== 1) {
          throw new DirectusPublicError(
            `pc_public_bundle devolvió ${result.length} registros; se esperaba exactamente uno.`,
            500,
            endpoint,
          );
        }
        return result[0];
      }
      return result;
    } catch (error) {
      lastError = error;
      if (!(error instanceof DirectusPublicError) || ![403, 404, 405].includes(error.status)) throw error;
    }
  }

  throw lastError;
}

const GAME_FIELDS = [
  'id','status','name','slug','tagline','description','minimum_age','default_locale','active',
  'theme','privacy_notice','stop_word','terms_url','sort','cover_image',
];

const THEME_FIELDS = [
  'id','status','name','slug','primary_color','secondary_color','accent_color','background_color',
  'surface_color','card_background_color','card_border_color','text_color','muted_text_color',
  'danger_color','heading_font_family','body_font_family','card_font_family','heading_font_url',
  'body_font_url','card_font_url','border_radius','card_border_radius','button_height','card_ratio',
  'shadow_intensity','enable_card_flip','enable_vibration','enable_sounds','enable_particles',
  'animation_speed','logo_file','favicon_file','app_icon_file',
];

const SETTINGS_FIELDS = [
  'id','game','status','default_mode','default_level','start_screen_title','intro_text',
  'instructions_text','safety_text','stop_word','age_gate_enabled','show_timer',
  'allow_screen_wake_lock','allow_fullscreen','allow_vibration','allow_offline',
  'maximum_cards_per_session','enable_random_level','enable_private_filters',
  'analytics_enabled','maintenance_mode','default_exclude_photo_video',
  'default_exclude_third_parties','default_exclude_public_places','default_exclude_restraint',
];

function relationId(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && 'id' in value) {
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
    fields: fields.join(','),
    limit: '1',
    ...filters,
    _runtime: String(Date.now()),
  });

  const endpoint = `/items/${collection}?${params.toString()}`;
  const result = await getJson<T[] | T>(endpoint, signal, { noStore: true });
  const item = Array.isArray(result) ? result[0] : result;

  if (!item) {
    throw new DirectusPublicError(
      `${collection} no devolvió un registro disponible para la app.`,
      404,
      endpoint,
    );
  }

  return item;
}

export interface RuntimeConfigRecord {
  game: unknown;
  theme: unknown;
  settings: unknown;
}

/**
 * Lee en vivo únicamente la identidad visual y la configuración general.
 * Las cartas y relaciones siguen saliendo del snapshot público seguro.
 */
export async function readRuntimeConfig(signal?: AbortSignal): Promise<RuntimeConfigRecord> {
  const game = await readFirst<Record<string, unknown>>(
    'pc_games',
    GAME_FIELDS,
    {
      'filter[status][_eq]': 'published',
      'filter[active][_eq]': 'true',
      sort: 'sort',
    },
    signal,
  );

  const gameId = relationId(game.id);
  const themeId = relationId(game.theme);
  if (!gameId || !themeId) {
    throw new DirectusPublicError(
      'El juego publicado no tiene un tema válido vinculado.',
      500,
      '/items/pc_games',
    );
  }

  const [theme, settings] = await Promise.all([
    readFirst<Record<string, unknown>>(
      'pc_themes',
      THEME_FIELDS,
      {
        'filter[id][_eq]': themeId,
        'filter[status][_eq]': 'published',
      },
      signal,
    ),
    readFirst<Record<string, unknown>>(
      'pc_app_settings',
      SETTINGS_FIELDS,
      {
        'filter[game][_eq]': gameId,
        'filter[status][_eq]': 'published',
      },
      signal,
    ),
  ]);

  return { game, theme, settings };
}

