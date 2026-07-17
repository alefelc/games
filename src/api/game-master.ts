import { z } from "zod";
import { env } from "../env";
import type {
  Card,
  ContentBundle,
  GameMasterEvent,
  GameSetup,
  SessionState,
} from "../types";
import { normalizeSceneRole } from "../lib/sceneRole";
import {
  recentAnatomyFocuses,
  recentCardIds,
  recentContinuityGroups,
} from "../engine/card-history";

const wireResponseSchema = z.object({
  selected_card_id: z.string(),
  phase: z.string(),
  strategy: z.string(),
  target_tension: z.number(),
  target_energy: z.number(),
  host_message: z.string(),
  confidence: z.number(),
  provider: z.enum(["openai", "adaptive_fallback"]),
  model: z.string(),
  latency_ms: z.number(),
  fallback_used: z.boolean(),
  fallback_code: z.string().nullable().optional(),
  fallback_reason: z.string().nullable().optional(),
  request_id: z.string().nullable().optional(),
  api_version: z.string().nullable().optional(),
});

type WireGameMasterDecision = z.infer<typeof wireResponseSchema>;

export type GameMasterDecision = WireGameMasterDecision & {
  endpoint: string;
  request_id: string | null;
  api_version: string | null;
};

export interface GameMasterErrorDetails {
  code: string;
  reason: string;
  endpoint: string | null;
  status: number | null;
  requestId: string | null;
}

export class GameMasterClientError extends Error {
  constructor(
    readonly details: GameMasterErrorDetails,
    options?: ErrorOptions,
  ) {
    super(details.reason, options);
    this.name = "GameMasterClientError";
  }
}

function sanitizeReason(value: string) {
  return value.replace(/sk-[A-Za-z0-9_-]+/g, "[clave oculta]").slice(0, 700);
}

function responseCode(status: number, payload: unknown) {
  if (payload && typeof payload === "object" && "code" in payload) {
    const code = (payload as { code?: unknown }).code;
    if (typeof code === "string" && code) return code;
  }
  return `HTTP_${status}`;
}

function parseJsonSafely(text: string): unknown {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function clampScore(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeFivePointScore(value: number, fallback: number) {
  const score = clampScore(value, 0, 10, fallback);
  return score <= 5 ? score : Math.min(5, Math.ceil(score / 2));
}

function normalizeEscalationScore(value: number) {
  const score = clampScore(value, -10, 10, 0);
  return score <= 3 ? Math.max(-2, score) : Math.min(3, Math.round(score / 3));
}

function requestIssueSummary(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("issues" in payload)) return "";
  const issues = (payload as { issues?: unknown }).issues;
  if (!Array.isArray(issues)) return "";

  const summary = issues
    .slice(0, 5)
    .map((issue) => {
      if (!issue || typeof issue !== "object") return "";
      const field =
        "field" in issue && typeof issue.field === "string"
          ? issue.field
          : "solicitud";
      const message =
        "message" in issue && typeof issue.message === "string"
          ? issue.message
          : "valor inválido";
      return `${field}: ${message}`;
    })
    .filter(Boolean)
    .join("; ");

  return summary ? ` Detalle: ${summary}` : "";
}

export function normalizeGameMasterError(error: unknown): GameMasterErrorDetails {
  if (error instanceof GameMasterClientError) return error.details;

  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      code: "CLIENT_TIMEOUT",
      reason: "La solicitud a la IA excedió el tiempo permitido.",
      endpoint: null,
      status: null,
      requestId: null,
    };
  }

  if (error instanceof z.ZodError) {
    return {
      code: "INVALID_RESPONSE_CONTRACT",
      reason: `La API respondió JSON, pero no coincide con el contrato esperado: ${error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join(".") || "respuesta"}: ${issue.message}`)
        .join("; ")}`,
      endpoint: null,
      status: null,
      requestId: null,
    };
  }

  if (error instanceof SyntaxError) {
    return {
      code: "INVALID_RESPONSE_JSON",
      reason: "La ruta adaptativa devolvió una respuesta que no es JSON válido.",
      endpoint: null,
      status: null,
      requestId: null,
    };
  }

  if (error instanceof TypeError) {
    return {
      code: "NETWORK_OR_CORS",
      reason:
        "El navegador no pudo completar la conexión. Las causas probables son DNS, proxy, certificado o CORS.",
      endpoint: null,
      status: null,
      requestId: null,
    };
  }

  return {
    code: "CLIENT_ERROR",
    reason: sanitizeReason(error instanceof Error ? error.message : String(error)),
    endpoint: null,
    status: null,
    requestId: null,
  };
}

function tagSlugsForCard(content: ContentBundle, cardId: string) {
  const tagIds = content.cardTags
    .filter((row) => row.card === cardId)
    .map((row) => row.tag);

  const selected = new Set(tagIds);
  return content.tags
    .filter((tag) => selected.has(tag.id))
    .map((tag) => tag.slug);
}

function sexSlug(content: ContentBundle, sexId: string | null) {
  return content.sexes.find((sex) => sex.id === sexId)?.slug ?? null;
}

function eventPayload(event: GameMasterEvent) {
  return {
    id: event.id,
    card_id: event.cardId,
    result: event.result,
    reaction: event.reaction,
    player_index: event.playerIndex,
    intensity: event.intensity,
    continuity_group: event.continuityGroup,
    scene_role: event.sceneRole,
    created_at: event.createdAt,
  };
}

function candidatePayload(content: ContentBundle, card: Card) {
  const level = content.levels.find((item) => item.id === card.level);

  return {
    id: card.id,
    code: card.code,
    text: card.text,
    level_id: card.level,
    level_order: level?.intensity_order ?? card.intensity,
    card_type: card.card_type,
    intensity: card.intensity,
    play_scope: card.play_scope,
    performer: card.performer,
    target: card.target,
    performer_sex: sexSlug(content, card.performer_sex),
    target_sex: sexSlug(content, card.target_sex),
    anatomy_focus: card.anatomy_focus,
    anatomy_owner: card.anatomy_owner,
    penetration_method: card.penetration_method,
    reciprocal_action: card.reciprocal_action,
    tags: tagSlugsForCard(content, card.id),
    gm_escalation_score: normalizeEscalationScore(card.gm_escalation_score),
    gm_energy_score: normalizeFivePointScore(card.gm_energy_score, 2),
    gm_intimacy_score: normalizeFivePointScore(card.gm_intimacy_score, 2),
    gm_humor_score: normalizeFivePointScore(card.gm_humor_score, 0),
    gm_recovery_score: normalizeFivePointScore(card.gm_recovery_score, 1),
    gm_novelty_score: normalizeFivePointScore(card.gm_novelty_score, 2),
    gm_continuity_group: card.gm_continuity_group,
    gm_scene_role: normalizeSceneRole(card.gm_scene_role, {
      levelOrder: level?.intensity_order ?? card.intensity,
      intensity: card.intensity,
      escalationScore: normalizeEscalationScore(card.gm_escalation_score),
      recoveryScore: normalizeFivePointScore(card.gm_recovery_score, 1),
    }),
  };
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

function shouldRetryRequest(error: unknown, elapsedMs: number) {
  const details = normalizeGameMasterError(error);

  if (details.status !== null) {
    return (
      details.status === 408 ||
      details.status === 409 ||
      details.status === 425 ||
      details.status === 429 ||
      details.status >= 500
    );
  }

  if (details.code === "CLIENT_TIMEOUT") return elapsedMs < 30_000;

  return [
    "NETWORK_OR_CORS",
    "INVALID_RESPONSE_JSON",
    "INVALID_RESPONSE_CONTRACT",
  ].includes(details.code);
}

async function requestOnce(
  baseUrl: string,
  payload: unknown,
  sessionId: string,
  resolvedCount: number,
): Promise<GameMasterDecision> {
  const endpoint = `${baseUrl}/v1/game-master/next`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 48_000);

  try {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Game-Session": sessionId,
          "X-Game-Draw": String(resolvedCount),
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      const details = normalizeGameMasterError(error);
      throw new GameMasterClientError(
        { ...details, endpoint },
        { cause: error },
      );
    }

    const text = await response.text();
    const payloadBody = parseJsonSafely(text);
    const requestId =
      response.headers.get("x-request-id") ||
      (payloadBody && typeof payloadBody === "object" && "request_id" in payloadBody
        ? String((payloadBody as { request_id?: unknown }).request_id || "") || null
        : null);

    if (!response.ok) {
      const serverMessage =
        payloadBody && typeof payloadBody === "object" && "error" in payloadBody
          ? String((payloadBody as { error?: unknown }).error || "")
          : text.slice(0, 500);
      const issueSummary = requestIssueSummary(payloadBody);
      throw new GameMasterClientError({
        status: response.status,
        code: responseCode(response.status, payloadBody),
        reason: sanitizeReason(
          `La dirección adaptativa respondió ${response.status}${serverMessage ? `: ${serverMessage}` : ""}.${issueSummary}`,
        ),
        endpoint,
        requestId,
      });
    }

    if (!payloadBody) {
      throw new GameMasterClientError({
        status: response.status,
        code: "INVALID_RESPONSE_JSON",
        reason:
          "La ruta adaptativa respondió correctamente a nivel HTTP, pero devolvió HTML o texto en lugar de JSON.",
        endpoint,
        requestId,
      });
    }

    try {
      const parsed = wireResponseSchema.parse(payloadBody);
      return {
        ...parsed,
        endpoint,
        request_id: parsed.request_id || requestId,
        api_version:
          parsed.api_version || response.headers.get("x-game-master-version"),
      };
    } catch (error) {
      const details = normalizeGameMasterError(error);
      throw new GameMasterClientError(
        { ...details, endpoint, status: response.status, requestId },
        { cause: error },
      );
    }
  } finally {
    window.clearTimeout(timeout);
  }
}

export type GameMasterAvailability =
  | {
      status: "online";
      version: string | null;
      endpoint: string;
      openaiConfigured: boolean | null;
    }
  | { status: "offline"; reason: string; attempts: GameMasterErrorDetails[] };

async function checkOneAvailability(baseUrl: string, timeoutMs: number) {
  const endpoint = `${baseUrl}/health`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      const details = normalizeGameMasterError(error);
      throw new GameMasterClientError({ ...details, endpoint }, { cause: error });
    }

    const text = await response.text();
    const payload = parseJsonSafely(text);
    const requestId = response.headers.get("x-request-id");

    if (!response.ok) {
      throw new GameMasterClientError({
        code: responseCode(response.status, payload),
        reason: `El servicio respondió ${response.status}.`,
        endpoint,
        status: response.status,
        requestId,
      });
    }

    if (!payload || typeof payload !== "object") {
      throw new GameMasterClientError({
        code: "INVALID_HEALTH_JSON",
        reason: "El endpoint de salud devolvió contenido que no es JSON.",
        endpoint,
        status: response.status,
        requestId,
      });
    }

    return {
      status: "online" as const,
      version:
        typeof (payload as { version?: unknown }).version === "string"
          ? (payload as { version: string }).version
          : null,
      endpoint: baseUrl,
      openaiConfigured:
        typeof (payload as { openai_configured?: unknown }).openai_configured ===
        "boolean"
          ? (payload as { openai_configured: boolean }).openai_configured
          : null,
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function checkGameMasterAvailability(
  timeoutMs = 5_500,
): Promise<GameMasterAvailability> {
  if (!env.gameMasterUrls.length) {
    return {
      status: "offline",
      reason: "La dirección adaptativa no está configurada.",
      attempts: [],
    };
  }

  const attempts: GameMasterErrorDetails[] = [];

  for (const baseUrl of env.gameMasterUrls) {
    try {
      return await checkOneAvailability(baseUrl, timeoutMs);
    } catch (error) {
      attempts.push(normalizeGameMasterError(error));
    }
  }

  const last = attempts.at(-1);
  return {
    status: "offline",
    reason:
      last?.reason || "No se pudo contactar al servicio adaptativo por ninguna ruta.",
    attempts,
  };
}

export async function requestGameMasterDecision({
  content,
  setup,
  session,
  player,
  candidates,
  resolvedEvent,
}: {
  content: ContentBundle;
  setup: GameSetup;
  session: SessionState;
  player: 0 | 1;
  candidates: Card[];
  resolvedEvent: GameMasterEvent | null;
}): Promise<GameMasterDecision> {
  if (!env.gameMasterUrls.length) {
    throw new GameMasterClientError({
      code: "NOT_CONFIGURED",
      reason: "La dirección adaptativa no está configurada.",
      endpoint: null,
      status: null,
      requestId: null,
    });
  }

  const mode = content.modes.find((item) => item.id === setup.modeId);
  const isSolo = mode?.slug === "solitario" || mode?.turn_mode === "single";
  const currentSex =
    player === 0
      ? sexSlug(content, setup.playerOneSexId)
      : sexSlug(content, setup.playerTwoSexId);
  const partnerSex = isSolo
    ? null
    : player === 0
      ? sexSlug(content, setup.playerTwoSexId)
      : sexSlug(content, setup.playerOneSexId);

  const payload = {
    game_id: content.game.id,
    session_id: session.id,
    mode_id: setup.modeId,
    mode_slug: mode?.slug ?? "",
    player_count: isSolo ? 1 : 2,
    current_player: isSolo ? 0 : player,
    resolved_count: session.resolvedCount,
    max_cards: setup.maxCards,
    current_phase: session.gmPhase,
    current_tension: session.gmTension,
    current_energy: session.gmEnergy,
    selected_level_ids: setup.levelIds,
    selected_deck_ids: setup.deckIds,
    player_sexes: [
      sexSlug(content, setup.playerOneSexId),
      isSolo ? null : sexSlug(content, setup.playerTwoSexId),
    ],
    current_player_sex: currentSex,
    partner_sex: partnerSex,
    recently_seen_card_ids: recentCardIds(240),
    recently_seen_groups: recentContinuityGroups(100),
    recently_seen_anatomy: recentAnatomyFocuses(100),
    selected_toy_slugs: content.toys
      .filter((toy) => setup.toyIds.includes(toy.id))
      .map((toy) => toy.slug),
    selected_element_slugs: content.elements
      .filter((item) => setup.elementIds.includes(item.id))
      .map((item) => item.slug),
    recent_events: session.gmEvents
      .filter((event) => event.id !== resolvedEvent?.id)
      .slice(-10)
      .map(eventPayload),
    resolved_event: resolvedEvent ? eventPayload(resolvedEvent) : null,
    candidates: candidates
      .slice(0, 60)
      .map((card) => candidatePayload(content, card)),
  };

  let lastError: unknown = new GameMasterClientError({
    code: "NO_ATTEMPT",
    reason: "No se realizó la solicitud adaptativa.",
    endpoint: null,
    status: null,
    requestId: null,
  });

  for (const baseUrl of env.gameMasterUrls) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const startedAt = Date.now();

      try {
        return await requestOnce(
          baseUrl,
          payload,
          session.id,
          session.resolvedCount,
        );
      } catch (error) {
        lastError = error;
        const elapsedMs = Date.now() - startedAt;

        if (attempt >= 2 || !shouldRetryRequest(error, elapsedMs)) break;

        console.warn(
          `La dirección adaptativa falló en ${baseUrl}; se reintenta antes de probar otra ruta.`,
          error,
        );
        await wait(400 * attempt);
      }
    }
  }

  throw lastError;
}
