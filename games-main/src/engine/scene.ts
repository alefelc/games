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

export function sceneCompatibleCards(
  cards: Card[],
  content: ContentBundle,
  scene: SceneState,
): Card[] {
  return cards.filter(
    (card) => checkSceneCompatibility(scene, toSceneCandidate(card, content)).compatible,
  );
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
      const score = scoreSceneCandidate(
        session.scene,
        toSceneCandidate(card, content),
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
  return advanceSceneState(scene, toSceneCandidate(card, content));
}

export function tryAdvanceCompletedScene(
  scene: SceneState,
  card: Card,
  content: ContentBundle,
): { scene: SceneState; applied: boolean; reasons: string[] } {
  const candidate = toSceneCandidate(card, content);
  const compatibility = checkSceneCompatibility(scene, candidate);
  if (!compatibility.compatible) {
    return { scene, applied: false, reasons: compatibility.reasons };
  }
  return {
    scene: advanceSceneState(scene, candidate),
    applied: true,
    reasons: [],
  };
}
