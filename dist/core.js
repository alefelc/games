import crypto from 'node:crypto';

export const PUBLIC_COLLECTION = 'pc_public_bundle';
export const PUBLIC_ITEM_ID = '7f723cbf-5aa8-4dcf-ae32-652d3ac5c8fe';

export const SOURCE_COLLECTIONS = new Set([
  'pc_games',
  'pc_themes',
  'pc_levels',
  'pc_decks',
  'pc_game_modes',
  'pc_elements',
  'pc_toys',
  'pc_tags',
  'pc_cards',
  'pc_decks_cards',
  'pc_cards_elements',
  'pc_cards_toys',
  'pc_cards_tags',
  'pc_app_settings',
  'pc_releases',
]);

export const SAFE_FIELDS = {
  pc_games: [
    'id','status','name','slug','tagline','description','minimum_age','default_locale','active',
    'theme','privacy_notice','stop_word','terms_url','sort','cover_image',
  ],
  pc_themes: [
    'id','status','name','slug','primary_color','secondary_color','accent_color','background_color',
    'surface_color','card_background_color','card_border_color','text_color','muted_text_color',
    'danger_color','heading_font_family','body_font_family','card_font_family','heading_font_url',
    'body_font_url','card_font_url','border_radius','card_border_radius','button_height','card_ratio',
    'shadow_intensity','enable_card_flip','enable_vibration','enable_sounds','enable_particles',
    'animation_speed','logo_file','favicon_file','app_icon_file',
  ],
  pc_levels: [
    'id','game','status','name','slug','description','intensity_order','color','icon','minimum_cards',
    'recommended_duration_minutes','requires_confirmation','sort','background_image',
  ],
  pc_decks: [
    'id','game','level','status','name','slug','description','deck_type','minimum_players',
    'maximum_players','active','sort','cover_image',
  ],
  pc_game_modes: [
    'id','game','status','name','slug','description','starting_level','automatic_progression',
    'cards_before_level_up','allow_manual_level_change','turn_mode','skip_limit',
    'session_duration_minutes','repetition_policy','timer_policy','sort',
  ],
  pc_elements: [
    'id','game','status','name','slug','category','description','safety_instructions',
    'is_consumable','is_optional','sort','image',
  ],
  pc_toys: [
    'id','game','status','name','slug','category','description','intensity_min','difficulty',
    'body_safe_notice','requires_cleaning','cleaning_instructions','requires_lubricant','sort','image',
  ],
  pc_tags: ['id','game','status','name','slug','category','color','sort'],
  pc_cards: [
    'id','game','level','status','sort','code','title','text','instructions','card_type',
    'original_deck','duration_seconds','weight','intensity','minimum_players','maximum_players',
    'performer','target','allow_skip','requires_confirmation','safety_note','privacy_risk',
    'physical_risk','gender_scope','language','contains_oral','contains_penetration',
    'contains_restraint','contains_food','contains_temperature','contains_public_place',
    'contains_third_parties','contains_photo','contains_video','contains_nudity',
    'contains_roleplay','contains_toy','contains_manual_stimulation',
    'contains_explicit_language','requires_device','requires_private_space',
  ],
  pc_decks_cards: ['id','deck','card','sort','enabled'],
  pc_cards_elements: ['id','card','element','requirement','quantity','preparation_note','sort'],
  pc_cards_toys: ['id','card','toy','requirement','quantity','preparation_note','sort'],
  pc_cards_tags: ['id','card','tag','sort'],
  pc_app_settings: [
    'id','game','status','default_mode','default_level','start_screen_title','intro_text',
    'instructions_text','safety_text','stop_word','age_gate_enabled','show_timer',
    'allow_screen_wake_lock','allow_fullscreen','allow_vibration','allow_offline',
    'maximum_cards_per_session','enable_random_level','enable_private_filters',
    'analytics_enabled','maintenance_mode','default_exclude_photo_video',
    'default_exclude_third_parties','default_exclude_public_places',
    'default_exclude_restraint',
  ],
  pc_releases: [
    'id','game','status','version','published_at','changelog','minimum_app_version','config_hash',
  ],
};

function idOf(value) {
  if (value && typeof value === 'object') return value.id ?? null;
  return value ?? null;
}

function relationId(record, field) {
  return idOf(record?.[field]);
}

function projectFields(record, fields) {
  if (!record || typeof record !== 'object') return record;
  const projected = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      projected[field] = record[field];
    }
  }
  return projected;
}

function normalizeRows(value, collection) {
  if (!Array.isArray(value)) {
    throw new Error(`${collection} no devolvió una lista válida.`);
  }
  return value.map((item) => projectFields(item, SAFE_FIELDS[collection]));
}

function normalizeSingleton(value, collection) {
  const rows = Array.isArray(value) ? value : [value];
  if (rows.length !== 1 || !rows[0] || typeof rows[0] !== 'object') {
    throw new Error(`${collection} debe contener exactamente un registro.`);
  }
  return projectFields(rows[0], SAFE_FIELDS[collection]);
}

function sanitizeRelationFields(items, fields) {
  return items.map((item) => {
    const copy = { ...item };
    for (const field of fields) copy[field] = idOf(copy[field]);
    return copy;
  });
}

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const order = Number(a.sort ?? 999999) - Number(b.sort ?? 999999);
    return order || String(a.id).localeCompare(String(b.id));
  });
}

export function stableContentHash(bundleWithoutHash) {
  const stable = { ...bundleWithoutHash, fetchedAt: null };
  return crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

export function buildSafeBundleFromRaw(raw, now = new Date()) {
  const gamesRaw = normalizeRows(raw.pc_games, 'pc_games');
  const themesRaw = normalizeRows(raw.pc_themes, 'pc_themes');
  const levelsRaw = normalizeRows(raw.pc_levels, 'pc_levels');
  const decksRaw = normalizeRows(raw.pc_decks, 'pc_decks');
  const modesRaw = normalizeRows(raw.pc_game_modes, 'pc_game_modes');
  const elementsRaw = normalizeRows(raw.pc_elements, 'pc_elements');
  const toysRaw = normalizeRows(raw.pc_toys, 'pc_toys');
  const tagsRaw = normalizeRows(raw.pc_tags, 'pc_tags');
  const cardsRaw = normalizeRows(raw.pc_cards, 'pc_cards');
  const deckCardsRaw = normalizeRows(raw.pc_decks_cards, 'pc_decks_cards');
  const cardElementsRaw = normalizeRows(raw.pc_cards_elements, 'pc_cards_elements');
  const cardToysRaw = normalizeRows(raw.pc_cards_toys, 'pc_cards_toys');
  const cardTagsRaw = normalizeRows(raw.pc_cards_tags, 'pc_cards_tags');
  const settingsRaw = normalizeSingleton(raw.pc_app_settings, 'pc_app_settings');
  const releasesRaw = normalizeRows(raw.pc_releases, 'pc_releases');

  const games = sanitizeRelationFields(gamesRaw, ['theme','cover_image'])
    .filter((item) => item.status === 'published' && item.active === true);
  const game = sortRows(games)[0];
  if (!game) throw new Error('No hay un juego activo y publicado en pc_games.');
  const gameId = game.id;

  const themes = sanitizeRelationFields(themesRaw, ['logo_file','favicon_file','app_icon_file'])
    .filter((item) => item.status === 'published');
  const theme = themes.find((item) => item.id === relationId(game, 'theme')) ?? sortRows(themes)[0];
  if (!theme) throw new Error('No hay un tema publicado en pc_themes.');

  const levels = sortRows(
    sanitizeRelationFields(levelsRaw, ['game','background_image'])
      .filter((item) => item.status === 'published' && relationId(item, 'game') === gameId),
  );
  const levelIds = new Set(levels.map((item) => item.id));

  const decks = sortRows(
    sanitizeRelationFields(decksRaw, ['game','level','cover_image'])
      .filter((item) =>
        item.status === 'published' &&
        item.active === true &&
        relationId(item, 'game') === gameId &&
        (!item.level || levelIds.has(relationId(item, 'level')))
      ),
  );
  const deckIds = new Set(decks.map((item) => item.id));

  const modes = sortRows(
    sanitizeRelationFields(modesRaw, ['game','starting_level'])
      .filter((item) => item.status === 'published' && relationId(item, 'game') === gameId),
  );

  const elements = sortRows(
    sanitizeRelationFields(elementsRaw, ['game','image'])
      .filter((item) => item.status === 'published' && relationId(item, 'game') === gameId),
  );
  const elementIds = new Set(elements.map((item) => item.id));

  const toys = sortRows(
    sanitizeRelationFields(toysRaw, ['game','image'])
      .filter((item) => item.status === 'published' && relationId(item, 'game') === gameId),
  );
  const toyIds = new Set(toys.map((item) => item.id));

  const tags = sortRows(
    sanitizeRelationFields(tagsRaw, ['game'])
      .filter((item) => item.status === 'published' && relationId(item, 'game') === gameId),
  );
  const tagIds = new Set(tags.map((item) => item.id));

  const cards = sortRows(
    sanitizeRelationFields(cardsRaw, ['game','level'])
      .filter((item) =>
        item.status === 'published' &&
        relationId(item, 'game') === gameId &&
        levelIds.has(relationId(item, 'level'))
      ),
  );
  const cardIds = new Set(cards.map((item) => item.id));

  const deckCards = sortRows(
    sanitizeRelationFields(deckCardsRaw, ['deck','card'])
      .filter((item) =>
        item.enabled === true &&
        deckIds.has(relationId(item, 'deck')) &&
        cardIds.has(relationId(item, 'card'))
      ),
  );

  const cardElements = sortRows(
    sanitizeRelationFields(cardElementsRaw, ['card','element'])
      .filter((item) =>
        cardIds.has(relationId(item, 'card')) &&
        elementIds.has(relationId(item, 'element'))
      ),
  );

  const cardToys = sortRows(
    sanitizeRelationFields(cardToysRaw, ['card','toy'])
      .filter((item) =>
        cardIds.has(relationId(item, 'card')) &&
        toyIds.has(relationId(item, 'toy'))
      ),
  );

  const cardTags = sortRows(
    sanitizeRelationFields(cardTagsRaw, ['card','tag'])
      .filter((item) =>
        cardIds.has(relationId(item, 'card')) &&
        tagIds.has(relationId(item, 'tag'))
      ),
  );

  const settings = sanitizeRelationFields([settingsRaw], ['game','default_mode','default_level'])[0];
  if (!settings || settings.status !== 'published' || relationId(settings, 'game') !== gameId) {
    throw new Error('pc_app_settings no está publicado o no pertenece al juego activo.');
  }

  const releases = sanitizeRelationFields(releasesRaw, ['game'])
    .filter((item) => item.status === 'published' && relationId(item, 'game') === gameId)
    .sort((a, b) =>
      new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
    );
  const release = releases[0];
  if (!release) throw new Error('No hay un release publicado en pc_releases.');

  if (!levels.length || !modes.length || !cards.length) {
    throw new Error(
      `Contenido insuficiente: niveles=${levels.length}, modos=${modes.length}, cartas=${cards.length}.`,
    );
  }

  const fetchedAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const bundleWithoutHash = {
    game,
    theme,
    levels,
    decks,
    modes,
    elements,
    toys,
    tags,
    cards,
    deckCards,
    cardElements,
    cardToys,
    cardTags,
    settings,
    release,
    fetchedAt,
  };

  const contentHash = stableContentHash(bundleWithoutHash);
  return {
    bundle: { ...bundleWithoutHash, contentHash },
    contentHash,
    version: release.version || '1.0.0',
  };
}
