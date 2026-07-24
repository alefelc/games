import { env } from "../env";
import type { ContentBundle, ContentSource } from "../types";
import { readCachedContent, writeCachedContent } from "../db/cache";
import {
  readLiveCatalog,
  readPublicBundle,
  readRuntimeConfig,
} from "./content-api";
import {
  cardElementSchema,
  cardSchema,
  cardTagSchema,
  cardToySchema,
  deckCardSchema,
  deckSchema,
  dynamicFilterSchema,
  elementSchema,
  gameSchema,
  levelSchema,
  modeSchema,
  releaseSchema,
  settingsSchema,
  sexSchema,
  tagSchema,
  themeSchema,
  toySchema,
} from "./schemas";
import {
  ensureIntensityFilterDefinition,
  fallbackFilterDefinitions,
  normalizeFilterDefinitionsForCards,
} from "../lib/dynamicFilters";

const FALLBACK_SEXES = [
  {
    id: "8476232a-8812-5185-bb3f-6bb3917219e8",
    game: "",
    status: "published",
    name: "Hombre",
    slug: "hombre",
    description: null,
    sort: 1,
  },
  {
    id: "ab13a0a8-2b37-59a4-a057-d7aff3904314",
    game: "",
    status: "published",
    name: "Mujer",
    slug: "mujer",
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
  const elements = sortByOrder(
    raw.elements.map((item) => elementSchema.parse(item)),
  );
  const toys = sortByOrder(raw.toys.map((item) => toySchema.parse(item)));
  const tags = sortByOrder(raw.tags.map((item) => tagSchema.parse(item)));
  const settings = settingsSchema.parse(raw.settings);
  const rawFilters = Array.isArray(raw.filters) && raw.filters.length
    ? raw.filters
    : fallbackFilterDefinitions(settings);
  const parsedFilters = sortByOrder(
    ensureIntensityFilterDefinition(
      rawFilters.map((item) => dynamicFilterSchema.parse(item)),
      settings,
    ),
  );
  const rawSexes =
    Array.isArray(raw.sexes) && raw.sexes.length
      ? raw.sexes
      : FALLBACK_SEXES.map((sex) => ({ ...sex, game: game.id }));
  const sexes = sortByOrder(rawSexes.map((item) => sexSchema.parse(item)));
  const cards = sortByOrder(raw.cards.map((item) => cardSchema.parse(item)));
  const filters = normalizeFilterDefinitionsForCards(
    parsedFilters,
    cards as unknown as Array<Record<string, unknown>>,
  );
  const deckCards = raw.deckCards.map((item) => deckCardSchema.parse(item));
  const cardElements = raw.cardElements.map((item) =>
    cardElementSchema.parse(item),
  );
  const cardToys = raw.cardToys.map((item) => cardToySchema.parse(item));
  const cardTags = raw.cardTags.map((item) => cardTagSchema.parse(item));
  const release = releaseSchema.parse(raw.release);

  if (!cards.length) throw new Error("No hay cartas disponibles.");
  if (!levels.length) throw new Error("No hay niveles disponibles.");
  if (!modes.length) throw new Error("No hay modos disponibles.");

  return {
    game,
    theme,
    levels,
    decks,
    modes,
    elements,
    toys,
    tags,
    filters,
    sexes,
    cards,
    deckCards,
    cardElements,
    cardToys,
    cardTags,
    settings,
    release,
    fetchedAt: raw.fetchedAt || new Date().toISOString(),
    contentHash: raw.contentHash,
  };
}

async function buildLiveBundle(
  runtime: Awaited<ReturnType<typeof readRuntimeConfig>>,
  contentHash: string,
  publishedVersion: string,
  publishedAt: string | undefined,
  signal?: AbortSignal,
): Promise<ContentBundle> {
  const game = gameSchema.parse(runtime.game);
  const catalog = await readLiveCatalog(game.id, signal);
  const releaseRecord =
    runtime.release &&
    typeof runtime.release === "object" &&
    !Array.isArray(runtime.release)
      ? {
          ...(runtime.release as Record<string, unknown>),
          version: publishedVersion,
          ...(publishedAt ? { published_at: publishedAt } : {}),
        }
      : runtime.release;

  const raw = {
    game,
    theme: themeSchema.parse(runtime.theme),
    settings: settingsSchema.parse(runtime.settings),
    levels: catalog.levels,
    decks: catalog.decks,
    modes: catalog.modes,
    elements: catalog.elements,
    toys: catalog.toys,
    tags: catalog.tags,
    filters: catalog.filters.length
      ? catalog.filters
      : fallbackFilterDefinitions(settingsSchema.parse(runtime.settings)),
    sexes: catalog.sexes,
    cards: catalog.cards,
    deckCards: catalog.deckCards,
    cardElements: catalog.cardElements,
    cardToys: catalog.cardToys,
    cardTags: catalog.cardTags,
    release: releaseRecord,
    fetchedAt: new Date().toISOString(),
    contentHash,
  } as unknown as ContentBundle;

  return validateBundle(raw);
}

async function fetchCurrentContent(
  signal?: AbortSignal,
): Promise<ContentBundle> {
  const [record, runtime] = await Promise.all([
    readPublicBundle({
      includeBundle: false,
      signal,
    }),
    readRuntimeConfig(signal),
  ]);

  return buildLiveBundle(
    runtime,
    record.content_hash,
    record.version,
    record.published_at,
    signal,
  );
}

async function readBootstrap(): Promise<ContentBundle> {
  const response = await fetch(`${env.basePath}bootstrap-content.json`, {
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      "No se pudo abrir el contenido inicial incluido en la app.",
    );
  return validateBundle((await response.json()) as ContentBundle);
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

export async function loadContent(
  options: {
    force?: boolean;
    signal?: AbortSignal;
  } = {},
): Promise<LoadResult> {
  const cached = await readCachedContent();

  if (cached && !navigator.onLine && isFresh(cached)) {
    return {
      bundle: validateBundle(cached),
      source: "cache",
      warning: "Sin conexión: usando contenido guardado.",
    };
  }

  try {
    const bundle = await fetchCurrentContent(options.signal);
    await writeCachedContent(bundle);

    return {
      bundle,
      source: "network",
      warning: null,
    };
  } catch {
    if (cached) {
      return {
        bundle: validateBundle(cached),
        source: "cache",
        warning:
          "No se pudieron cargar los últimos cambios. " +
          "Se usa el contenido guardado.",
      };
    }

    if (env.allowBootstrapFallback) {
      const bundle = await readBootstrap();
      await writeCachedContent(bundle);

      return {
        bundle,
        source: "bootstrap",
        warning: "Se está usando el contenido incluido en la aplicación.",
      };
    }

    throw new Error("No se pudo preparar el juego.");
  }
}
