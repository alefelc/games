export const adaptiveSceneRoles = [
  "starter",
  "bridge",
  "continuation",
  "climax",
  "recovery",
  "closer",
] as const;

export type AdaptiveSceneRole = (typeof adaptiveSceneRoles)[number];

export interface SceneRoleContext {
  levelOrder?: number | null;
  intensity?: number | null;
  escalationScore?: number | null;
  recoveryScore?: number | null;
}

const aliases: Record<string, AdaptiveSceneRole> = {
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

function token(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function finite(value: number | null | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Convierte valores históricos, traducidos o personalizados a las seis etapas
 * que entiende la dirección adaptativa. Un valor desconocido nunca invalida
 * toda la partida: se infiere por nivel, intensidad y puntajes de la carta.
 */
export function normalizeSceneRole(
  value: unknown,
  context: SceneRoleContext = {},
): AdaptiveSceneRole {
  const normalized = token(value);
  if (normalized && aliases[normalized]) return aliases[normalized];

  const levelOrder = finite(context.levelOrder, 3);
  const intensity = finite(context.intensity, levelOrder);
  const escalation = finite(context.escalationScore, 0);
  const recovery = finite(context.recoveryScore, 0);

  if (recovery >= 4) return "recovery";
  if (levelOrder >= 7) return "closer";
  if (levelOrder >= 6 || (intensity >= 8 && escalation >= 2)) return "climax";
  if (levelOrder <= 1 || intensity <= 1) return "starter";
  if (levelOrder === 2) return "bridge";
  return "continuation";
}
