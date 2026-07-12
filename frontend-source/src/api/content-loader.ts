import { env } from '../env';
import type { ContentBundle, ContentSource } from '../types';
import { readCachedContent, writeCachedContent } from '../db/cache';
import { readPublicBundle } from './directus';
import {
  cardElementSchema, cardSchema, cardTagSchema, cardToySchema, deckCardSchema, deckSchema,
  elementSchema, gameSchema, levelSchema, modeSchema, releaseSchema, settingsSchema, tagSchema,
  themeSchema, toySchema,
} from './schemas';

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
  const cards = sortByOrder(raw.cards.map((item) => cardSchema.parse(item)));
  const deckCards = raw.deckCards.map((item) => deckCardSchema.parse(item));
  const cardElements = raw.cardElements.map((item) => cardElementSchema.parse(item));
  const cardToys = raw.cardToys.map((item) => cardToySchema.parse(item));
  const cardTags = raw.cardTags.map((item) => cardTagSchema.parse(item));
  const settings = settingsSchema.parse(raw.settings);
  const release = releaseSchema.parse(raw.release);

  if (!cards.length) throw new Error('Directus no devolvió cartas publicadas.');
  if (!levels.length) throw new Error('Directus no devolvió niveles publicados.');
  if (!modes.length) throw new Error('Directus no devolvió modos publicados.');

  return {
    game, theme, levels, decks, modes, elements, toys, tags, cards, deckCards,
    cardElements, cardToys, cardTags, settings, release,
    fetchedAt: raw.fetchedAt || new Date().toISOString(),
    contentHash: raw.contentHash,
  };
}

function parseBundle(value: unknown): ContentBundle {
  if (typeof value === 'string') return JSON.parse(value) as ContentBundle;
  if (!value || typeof value !== 'object') throw new Error('El snapshot público de Directus no contiene un bundle válido.');
  return value as ContentBundle;
}

async function fetchFullBundle(signal?: AbortSignal): Promise<ContentBundle> {
  const record = await readPublicBundle({ includeBundle: true, signal });
  const raw = parseBundle(record.bundle);
  return validateBundle({
    ...raw,
    contentHash: record.content_hash,
    fetchedAt: new Date().toISOString(),
  });
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
        return { bundle: validateBundle(cached), source: 'cache', warning: null };
      }
    }

    const bundle = await fetchFullBundle(options.signal);
    await writeCachedContent(bundle);
    return { bundle, source: 'network', warning: null };
  } catch (error) {
    if (cached) {
      return {
        bundle: validateBundle(cached),
        source: 'cache',
        warning: `No se pudo actualizar desde Directus. Se usa la copia local. ${error instanceof Error ? error.message : ''}`.trim(),
      };
    }

    if (env.allowBootstrapFallback) {
      const bundle = await readBootstrap();
      await writeCachedContent(bundle);
      return {
        bundle,
        source: 'bootstrap',
        warning: 'Directus todavía no está accesible públicamente. Se usa el contenido inicial incluido en la app.',
      };
    }

    throw error;
  }
}
