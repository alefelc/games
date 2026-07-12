import {
  PUBLIC_COLLECTION,
  PUBLIC_ITEM_ID,
  SAFE_FIELDS,
  SOURCE_COLLECTIONS,
  buildSafeBundleFromRaw,
} from './core.js';

const PREFIX = '[PecadoClub Auto Publisher]';

function asBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'on', 'si', 'sí'].includes(String(value).trim().toLowerCase());
}

function asPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export default function register({ action, schedule }, context) {
  const { services, getSchema, env, logger } = context;
  const { ItemsService } = services;

  const enabled = asBoolean(env.PECADOCLUB_AUTO_PUBLISH_ENABLED, true);
  const publishOnStart = asBoolean(env.PECADOCLUB_AUTO_PUBLISH_ON_START, true);
  const debounceMs = asPositiveInteger(env.PECADOCLUB_AUTO_PUBLISH_DEBOUNCE_MS, 1500);
  const startDelayMs = asPositiveInteger(env.PECADOCLUB_AUTO_PUBLISH_START_DELAY_MS, 5000);
  const cronExpression = String(
    env.PECADOCLUB_AUTO_PUBLISH_SCHEDULE ?? '0 */5 * * * *',
  ).trim();

  if (!enabled) {
    logger.warn(`${PREFIX} deshabilitado por PECADOCLUB_AUTO_PUBLISH_ENABLED=false.`);
    return;
  }

  let timer = null;
  let running = false;
  let rerunRequested = false;
  const reasons = new Set();

  const serviceFor = (collection, schema) =>
    new ItemsService(collection, {
      schema,
      accountability: null,
    });

  async function readCollection(collection, schema) {
    const service = serviceFor(collection, schema);
    const rows = await service.readByQuery(
      {
        limit: -1,
        fields: SAFE_FIELDS[collection],
      },
      {
        emitEvents: false,
      },
    );

    return Array.isArray(rows) ? rows : [];
  }

  async function readAllSourceData(schema) {
    const entries = await Promise.all(
      Object.keys(SAFE_FIELDS).map(async (collection) => {
        const rows = await readCollection(collection, schema);
        return [collection, rows];
      }),
    );

    return Object.fromEntries(entries);
  }

  async function publishNow(triggerReasons = []) {
    const startedAt = Date.now();
    const schema = await getSchema();
    const raw = await readAllSourceData(schema);
    const { bundle, contentHash, version } = buildSafeBundleFromRaw(raw, new Date());

    const publicService = serviceFor(PUBLIC_COLLECTION, schema);
    const existingRows = await publicService.readByQuery(
      {
        limit: 1,
        fields: ['id', 'content_hash'],
        filter: { id: { _eq: PUBLIC_ITEM_ID } },
      },
      {
        emitEvents: false,
      },
    );
    const existing = Array.isArray(existingRows) ? existingRows[0] : null;

    if (existing?.content_hash === contentHash) {
      logger.info(
        `${PREFIX} sin cambios públicos; no se reescribe el snapshot. ` +
        `Motivo=${triggerReasons.join(', ') || 'manual/schedule'}`,
      );
      return { changed: false, contentHash, version };
    }

    const publishedAt = new Date().toISOString();
    const payload = {
      version,
      published_at: publishedAt,
      content_hash: contentHash,
      bundle,
    };

    if (existing) {
      await publicService.updateOne(PUBLIC_ITEM_ID, payload, { emitEvents: false });
    } else {
      await publicService.createOne(
        { id: PUBLIC_ITEM_ID, ...payload },
        { emitEvents: false },
      );
    }

    logger.info(
      `${PREFIX} snapshot actualizado: versión=${version}, ` +
      `cartas=${bundle.cards.length}, niveles=${bundle.levels.length}, ` +
      `mazos=${bundle.decks.length}, hash=${contentHash.slice(0, 12)}…, ` +
      `duración=${Date.now() - startedAt}ms, motivo=${triggerReasons.join(', ') || 'manual/schedule'}`,
    );

    return { changed: true, contentHash, version, publishedAt };
  }

  async function flushQueue() {
    timer = null;

    if (running) {
      rerunRequested = true;
      return;
    }

    running = true;
    const triggerReasons = [...reasons];
    reasons.clear();

    try {
      await publishNow(triggerReasons);
    } catch (error) {
      logger.error(
        {
          err: error,
          triggerReasons,
        },
        `${PREFIX} no pudo regenerar pc_public_bundle.`,
      );
    } finally {
      running = false;

      if (rerunRequested || reasons.size > 0) {
        rerunRequested = false;
        queuePublish('cambios pendientes', 300);
      }
    }
  }

  function queuePublish(reason, delayMs = debounceMs) {
    reasons.add(reason);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void flushQueue();
    }, delayMs);
    timer.unref?.();
  }

  const handleItemMutation = (meta) => {
    if (!meta?.collection || !SOURCE_COLLECTIONS.has(meta.collection)) return;
    queuePublish(`${meta.event || 'items.change'}:${meta.collection}`);
  };

  action('items.create', handleItemMutation);
  action('items.update', handleItemMutation);
  action('items.delete', handleItemMutation);
  action('items.sort', handleItemMutation);

  // Las cargas de archivos no siempre emiten items.create/update.
  // El evento se escucha como respaldo; si el ID vinculado no cambió,
  // el hash seguirá igual y el snapshot no se reescribirá.
  action('files.upload', () => queuePublish('files.upload'));
  action('files.update', () => queuePublish('files.update'));
  action('files.delete', () => queuePublish('files.delete'));

  if (publishOnStart) {
    action('server.start', () => queuePublish('server.start', startDelayMs));
  }

  if (cronExpression) {
    try {
      schedule(cronExpression, () => {
        queuePublish('schedule', 0);
      });
    } catch (error) {
      logger.error(
        { err: error, cronExpression },
        `${PREFIX} cron inválido; la publicación por eventos seguirá activa.`,
      );
    }
  }

  logger.info(
    `${PREFIX} activo. debounce=${debounceMs}ms, inicio=${publishOnStart}, ` +
    `cron=${cronExpression || 'deshabilitado'}.`,
  );
}
