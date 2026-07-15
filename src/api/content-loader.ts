import { env } from '../env';
import type { ContentBundle, ContentSource } from '../types';
import { readCachedContent, writeCachedContent } from '../db/cache';
import { readPublicBundle, readPublishedSexes, readRuntimeConfig } from './directus';
import {
  cardElementSchema, cardSchema, cardTagSchema, cardToySchema, deckCardSchema, deckSchema,
  elementSchema, gameSchema, levelSchema, modeSchema, releaseSchema, settingsSchema, sexSchema, tagSchema,
  themeSchema, toySchema,
} from './schemas';


const FALLBACK_SEXES = [
  {
    id: '8476232a-8812-5185-bb3f-6bb3917219e8',
    game: '',
    status: 'published',
    name: 'Hombre',
    slug: 'hombre',
    description: null,
    sort: 1,
  },
  {
    id: 'ab13a0a8-2b37-59a4-a057-d7aff3904314',
    game: '',
    status: 'published',
    name: 'Mujer',
    slug: 'mujer',
    description: null,
    sort: 2,
  },
];

function sortByOrder<T extends { sort?: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.sort ?? 9999) - (b.sort ?? 9999));
}

function validateBundle(raw: ContentBundle): ContentBundle {
  const game = gameSchema.parse(raw.game);
  const theme = themeSchema.parse(raw.theme);
  const levels = sortByOrder(raw.levels.map((item) => levelSchema.parse(item)));
  const decks = sortByOrder(raw.decks.map((item) => deckSchema.parse(item)));
  const modes = sortByOrder(raw.modes.map((item) => modeSchema.parse(item)));
  const elements = sortByOrder(raw.elements.map((item) => elementSchema.parse(item)));
  const toys = sortByOrder(raw.toys.map((item) => toySchema.parse(item)));
  const tags = sortByOrder(raw.tags.map((item) => tagSchema.parse(item)));
  const rawSexes = Array.isArray(raw.sexes) && raw.sexes.length
    ? raw.sexes
    : FALLBACK_SEXES.map((sex) => ({ ...sex, game: game.id }));
  const sexes = sortByOrder(rawSexes.map((item) => sexSchema.parse(item)));
  const cards = sortByOrder(raw.cards.map((item) => cardSchema.parse(item)));
  const deckCards = raw.deckCards.map((item) => deckCardSchema.parse(item));
  const cardElements = raw.cardElements.map((item) => cardElementSchema.parse(item));
  const cardToys = raw.cardToys.map((item) => cardToySchema.parse(item));
  const cardTags = raw.cardTags.map((item) => cardTagSchema.parse(item));
  const settings = settingsSchema.parse(raw.settings);
  const release = releaseSchema.parse(raw.release);

  if (!cards.length) throw new Error('No hay cartas disponibles.');
  if (!levels.length) throw new Error('No hay niveles disponibles.');
  if (!modes.length) throw new Error('No hay modos disponibles.');

  return {
    game, theme, levels, decks, modes, elements, toys, tags, sexes, cards, deckCards,
    cardElements, cardToys, cardTags, settings, release,
    fetchedAt: raw.fetchedAt || new Date().toISOString(),
    contentHash: raw.contentHash,
  };
}

function parseBundle(value: unknown): ContentBundle {
  if (typeof value === 'string') return JSON.parse(value) as ContentBundle;
  if (!value || typeof value !== 'object') throw new Error('El contenido del juego no es válido.');
  return value as ContentBundle;
}


async function mergeRuntimeConfig(
  bundle: ContentBundle,
  signal?: AbortSignal,
): Promise<{ bundle: ContentBundle; updated: boolean; warning: string | null }> {
  try {
    const live = await readRuntimeConfig(signal);
    const liveGame = gameSchema.parse(live.game);

    let liveSexes = bundle.sexes;

    try {
      const rows = await readPublishedSexes(liveGame.id, signal);
      if (rows.length) {
        liveSexes = sortByOrder(
          rows.map((item) => sexSchema.parse(item)),
        );
      }
    } catch {
      // Si la colección no está abierta para lectura, se conserva la copia incluida.
    }

    const merged = validateBundle({
      ...bundle,
      game: liveGame,
      theme: themeSchema.parse(live.theme),
      settings: settingsSchema.parse(live.settings),
      sexes: liveSexes,
      fetchedAt: new Date().toISOString(),
    });

    return { bundle: merged, updated: true, warning: null };
  } catch (error) {
    return {
      bundle,
      updated: false,
      warning: 'No se pudieron aplicar los últimos ajustes. Se usa la configuración guardada.',
    };
  }
}

async function fetchFullBundle(
  signal?: AbortSignal,
): Promise<{ bundle: ContentBundle; warning: string | null }> {
  const record = await readPublicBundle({ includeBundle: true, signal });
  const raw = parseBundle(record.bundle);
  const snapshot = validateBundle({
    ...raw,
    contentHash: record.content_hash,
    fetchedAt: new Date().toISOString(),
  });
  const live = await mergeRuntimeConfig(snapshot, signal);
  return { bundle: live.bundle, warning: live.warning };
}

async function readBootstrap(): Promise<ContentBundle> {
  const response = await fetch(`${env.basePath}bootstrap-content.json`, { cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo abrir el contenido inicial incluido en la app.');
  return validateBundle(await response.json() as ContentBundle);
}

function isFresh(bundle: ContentBundle): boolean {
  const age = Date.now() - new Date(bundle.fetchedAt).getTime();
  return age < env.cacheHours * 60 * 60 * 1000;
}

export interface LoadResult {
  bundle: ContentBundle;
  source: ContentSource;
  warning: string | null;
}

export async function loadContent(options: { force?: boolean; signal?: AbortSignal } = {}): Promise<LoadResult> {
  const cached = await readCachedContent();

  if (!options.force && cached && !navigator.onLine && isFresh(cached)) {
    return { bundle: validateBundle(cached), source: 'cache', warning: 'Sin conexión: usando contenido guardado.' };
  }

  try {
    if (!options.force && cached?.contentHash) {
      const metadata = await readPublicBundle({ includeBundle: false, signal: options.signal });
      if (metadata.content_hash === cached.contentHash && isFresh(cached)) {
        const live = await mergeRuntimeConfig(validateBundle(cached), options.signal);
        await writeCachedContent(live.bundle);
        return {
          bundle: live.bundle,
          source: live.updated ? 'network' : 'cache',
          warning: live.warning,
        };
      }
    }

    const loaded = await fetchFullBundle(options.signal);
    await writeCachedContent(loaded.bundle);
    return { bundle: loaded.bundle, source: 'network', warning: loaded.warning };
  } catch (error) {
    if (cached) {
      return {
        bundle: validateBundle(cached),
        source: 'cache',
        warning: 'No se pudieron cargar los últimos cambios. Se usa el contenido guardado.',
      };
    }

    if (env.allowBootstrapFallback) {
      const bundle = await readBootstrap();
      await writeCachedContent(bundle);
      return {
        bundle,
        source: 'bootstrap',
        warning: 'Se está usando el contenido incluido en la aplicación.',
      };
    }

    throw error;
  }
}
