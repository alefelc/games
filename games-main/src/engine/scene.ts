import {
  advanceSceneState,
  checkSceneCompatibility,
  initialSceneState,
  scoreSceneCandidate,
  type SceneCandidate,
  type SceneState,
} from "@te-animas/game-domain";
import type { Card, ContentBundle, GameSetup, SessionState } from "../types";
import {
  recentContinuityGroups,
  recentVariantGroups,
} from "./card-history";

export { initialSceneState };

export function cardInventoryKeys(card: Card, content: ContentBundle): string[] {
  const elements = (content.cardElements ?? [])
    .filter((row) => row.card === card.id)
    .map((row) => (content.elements ?? []).find((item) => item.id === row.element))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => `element:${item.slug}`);
  const toys = (content.cardToys ?? [])
    .filter((row) => row.card === card.id)
    .map((row) => (content.toys ?? []).find((item) => item.id === row.toy))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => `toy:${item.slug}`);
  return [...new Set([...elements, ...toys])];
}

export function toSceneCandidate(
  card: Card,
  content: ContentBundle,
): SceneCandidate {
  return {
    id: card.id,
    intensity: card.intensity,
    card_kind: card.card_kind,
    scene_phase_min: card.scene_phase_min,
    scene_phase_max: card.scene_phase_max,
    scene_phase_after: card.scene_phase_after,
    physical_state_min: card.physical_state_min,
    physical_state_after: card.physical_state_after,
    activity_family: card.activity_family,
    activity_action: card.activity_action,
    requires_previous_activity: card.requires_previous_activity,
    forbidden_after_activity: card.forbidden_after_activity,
    allow_activity_change: card.allow_activity_change,
    allow_position_change: card.allow_position_change,
    allow_rhythm_change: card.allow_rhythm_change,
    inventory_action: card.inventory_action,
    inventory_keys: cardInventoryKeys(card, content),
    gm_continuity_group: card.gm_continuity_group,
    gm_escalation_score: card.gm_escalation_score,
    gm_recovery_score: card.gm_recovery_score,
    gm_novelty_score: card.gm_novelty_score,
    variant_group: card.variant_group,
    cooldown_sessions: card.cooldown_sessions,
  };
}

function toSceneCandidateForState(
  card: Card,
  content: ContentBundle,
  scene: SceneState,
): SceneCandidate {
  const candidate = toSceneCandidate(card, content);

  // El catálogo 5.0 marca como `switch` las transiciones que abren la primera
  // actividad. Sin actividad previa, la operación efectiva es `start`.
  return !scene.active_activity && candidate.activity_action === "switch"
    ? { ...candidate, activity_action: "start" }
    : candidate;
}

function questionStreakIsOnlyBlock(reasons: string[]): boolean {
  return (
    reasons.length > 0 &&
    reasons.every((reason) => reason === "question_streak_limit")
  );
}

function resetQuestionStreak(scene: SceneState): SceneState {
  return { ...scene, consecutive_questions: 0 };
}

function completeActiveActivity(scene: SceneState): SceneState | null {
  if (!scene.active_activity || scene.climax_reached) return null;

  return {
    ...scene,
    active_activity: null,
    completed_activities: [
      ...new Set([...scene.completed_activities, scene.active_activity]),
    ],
    consecutive_questions: 0,
    consecutive_actions: 0,
    activity_streak: 0,
    last_continuity_group: null,
  };
}

function preparedCandidateForScene(
  card: Card,
  content: ContentBundle,
  scene: SceneState,
): { scene: SceneState; candidate: SceneCandidate } | null {
  const directCandidate = toSceneCandidateForState(card, content, scene);
  const direct = checkSceneCompatibility(scene, directCandidate);
  if (direct.compatible) {
    return { scene, candidate: directCandidate };
  }

  if (questionStreakIsOnlyBlock(direct.reasons)) {
    const recoveredScene = resetQuestionStreak(scene);
    const recoveredCandidate = toSceneCandidateForState(
      card,
      content,
      recoveredScene,
    );
    if (
      checkSceneCompatibility(recoveredScene, recoveredCandidate).compatible
    ) {
      return { scene: recoveredScene, candidate: recoveredCandidate };
    }
  }

  const recoveredScene = completeActiveActivity(scene);
  if (!recoveredScene) return null;
  const recoveredCandidate = toSceneCandidateForState(
    card,
    content,
    recoveredScene,
  );
  return checkSceneCompatibility(recoveredScene, recoveredCandidate).compatible
    ? { scene: recoveredScene, candidate: recoveredCandidate }
    : null;
}

export function sceneCompatibleCards(
  cards: Card[],
  content: ContentBundle,
  scene: SceneState,
): Card[] {
  const evaluated = cards.map((card) => ({
    card,
    compatibility: checkSceneCompatibility(
      scene,
      toSceneCandidateForState(card, content, scene),
    ),
  }));
  const strict = evaluated
    .filter(({ compatibility }) => compatibility.compatible)
    .map(({ card }) => card);

  if (strict.length) return strict;

  // La variedad entre preguntas es una preferencia, no una condición capaz de
  // finalizar la partida. Si es el único bloqueo restante, permitimos otra
  // pregunta sin relajar continuidad, fase, actividad, inventario ni clímax.
  const questionFallback = evaluated
    .filter(
      ({ compatibility }) =>
        questionStreakIsOnlyBlock(compatibility.reasons),
    )
    .map(({ card }) => card);
  if (questionFallback.length) return questionFallback;

  // Una sesión larga puede consumir todas las continuaciones de la actividad
  // actual. Cerrarla de forma interna habilita otra actividad manteniendo la
  // fase, el estado físico, el inventario y las restricciones duras.
  const recoveredScene = completeActiveActivity(scene);
  if (!recoveredScene) return [];
  return cards.filter((card) => {
    const candidate = toSceneCandidateForState(card, content, recoveredScene);
    return checkSceneCompatibility(recoveredScene, candidate).compatible;
  });
}

function selectedInventoryKeys(content: ContentBundle, setup: GameSetup) {
  return [
    ...(content.elements ?? [])
      .filter((item) => (setup.elementIds ?? []).includes(item.id))
      .map((item) => `element:${item.slug}`),
    ...(content.toys ?? [])
      .filter((item) => (setup.toyIds ?? []).includes(item.id))
      .map((item) => `toy:${item.slug}`),
  ];
}

export function applySceneWeights(
  cards: Card[],
  content: ContentBundle,
  setup: GameSetup,
  session: SessionState,
): Card[] {
  const progress = setup.maxCards > 0 ? session.resolvedCount / setup.maxCards : 0;
  const targetIntensity = Math.max(1, Number(setup.filters.maxIntensity ?? 7));
  const context = {
    progress,
    targetIntensity,
    recentVariantGroups: recentVariantGroups(100),
    recentContinuityGroups: recentContinuityGroups(100),
    selectedInventory: selectedInventoryKeys(content, setup),
  };

  return cards
    .map((card) => {
      const prepared = preparedCandidateForScene(
        card,
        content,
        session.scene,
      );
      const score = scoreSceneCandidate(
        prepared?.scene ?? session.scene,
        prepared?.candidate ??
          toSceneCandidateForState(card, content, session.scene),
        context,
      );
      return {
        ...card,
        weight: Math.max(1, Math.round((card.weight || 1) * Math.max(0.05, score / 100))),
      };
    })
    .sort((a, b) => b.weight - a.weight);
}

export function advanceCompletedScene(
  scene: SceneState,
  card: Card,
  content: ContentBundle,
): SceneState {
  const prepared = preparedCandidateForScene(card, content, scene);
  if (!prepared) {
    return advanceSceneState(
      scene,
      toSceneCandidateForState(card, content, scene),
    );
  }
  return advanceSceneState(
    prepared.scene,
    prepared.candidate,
  );
}

export function tryAdvanceCompletedScene(
  scene: SceneState,
  card: Card,
  content: ContentBundle,
): { scene: SceneState; applied: boolean; reasons: string[] } {
  const prepared = preparedCandidateForScene(card, content, scene);
  if (!prepared) {
    const candidate = toSceneCandidateForState(card, content, scene);
    const compatibility = checkSceneCompatibility(scene, candidate);
    return { scene, applied: false, reasons: compatibility.reasons };
  }
  return {
    scene: advanceSceneState(prepared.scene, prepared.candidate),
    applied: true,
    reasons: [],
  };
}
