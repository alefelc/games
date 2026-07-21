import { z } from "zod";

export const SceneRoleSchema = z.enum([
  "starter",
  "bridge",
  "continuation",
  "climax",
  "recovery",
  "closer",
]);

export type SceneRole = z.infer<typeof SceneRoleSchema>;

interface SceneRoleContext {
  levelOrder?: number | null;
  intensity?: number | null;
  escalationScore?: number | null;
  recoveryScore?: number | null;
}

const sceneRoleAliases: Record<string, SceneRole> = {
  starter: "starter",
  start: "starter",
  opening: "starter",
  opener: "starter",
  intro: "starter",
  introduction: "starter",
  inicio: "starter",
  inicial: "starter",
  previa: "starter",
  warmup: "starter",
  calentamiento: "starter",
  bridge: "bridge",
  transition: "bridge",
  transitional: "bridge",
  transition_card: "bridge",
  puente: "bridge",
  transicion: "bridge",
  enlace: "bridge",
  escalation: "bridge",
  escalate: "bridge",
  escalada: "bridge",
  continuation: "continuation",
  continue: "continuation",
  continuing: "continuation",
  sustain: "continuation",
  sustained: "continuation",
  development: "continuation",
  develop: "continuation",
  build: "continuation",
  middle: "continuation",
  desarrollo: "continuation",
  continuacion: "continuation",
  continuidad: "continuation",
  accion: "continuation",
  climax: "climax",
  peak: "climax",
  payoff: "climax",
  orgasm: "climax",
  orgasmic: "climax",
  climax_card: "climax",
  pico: "climax",
  orgasmo: "climax",
  culminacion: "climax",
  recovery: "recovery",
  recover: "recovery",
  cooldown: "recovery",
  cool_down: "recovery",
  reset: "recovery",
  aftercare: "recovery",
  descanso: "recovery",
  recuperacion: "recovery",
  cuidado: "recovery",
  pausa: "recovery",
  closer: "closer",
  close: "closer",
  closing: "closer",
  ending: "closer",
  end: "closer",
  finale: "closer",
  finish: "closer",
  cierre: "closer",
  final: "closer",
  terminar: "closer",
};

function sceneRoleToken(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function finiteNumber(value: number | null | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function normalizeSceneRole(
  value: unknown,
  context: SceneRoleContext = {},
): SceneRole {
  const normalized = sceneRoleToken(value);
  const alias = normalized ? sceneRoleAliases[normalized] : undefined;
  if (alias) return alias;

  const levelOrder = finiteNumber(context.levelOrder, 3);
  const intensity = finiteNumber(context.intensity, levelOrder);
  const escalation = finiteNumber(context.escalationScore, 0);
  const recovery = finiteNumber(context.recoveryScore, 0);

  if (recovery >= 4) return "recovery";
  if (levelOrder >= 7) return "closer";
  if (levelOrder >= 6 || (intensity >= 8 && escalation >= 2)) return "climax";
  if (levelOrder <= 1 || intensity <= 1) return "starter";
  if (levelOrder === 2) return "bridge";
  return "continuation";
}

export const StrategySchema = z.enum([
  "continue_scene",
  "escalate",
  "slow_down",
  "balance_players",
  "intimate_question",
  "humor_break",
  "change_style",
  "prepare_climax",
  "close_session",
]);

export const PhaseSchema = z.enum([
  "warmup",
  "build",
  "intimate",
  "intense",
  "recovery",
  "peak",
  "closing",
]);

export const NextResponseSchema = z.object({
  selected_card_id: z.string().min(1),
  phase: PhaseSchema,
  strategy: StrategySchema,
  target_tension: z.number().int().min(0).max(100),
  target_energy: z.number().int().min(0).max(100),
  host_message: z.string().max(140),
  confidence: z.number().min(0).max(1),
  provider: z.enum(["openai", "adaptive_fallback"]),
  model: z.string(),
  latency_ms: z.number().int().min(0),
  fallback_used: z.boolean(),
  fallback_code: z.string().nullable().optional().default(null),
  fallback_reason: z.string().max(500).nullable().optional().default(null),
  request_id: z.string().nullable().optional().default(null),
  api_version: z.string().nullable().optional().default(null),
});

export type NextResponse = z.infer<typeof NextResponseSchema>;
