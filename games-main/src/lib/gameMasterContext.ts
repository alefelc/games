import type { GameMasterEvent } from "../types";

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

// The resolved event travels in its own field. Keep the complete event context
// within ten items so older deployed contracts and the current contract receive
// the same bounded shape from draw 1 through long sessions.
export const MAX_GAME_MASTER_EVENT_CONTEXT = 10;

export function buildGameMasterEventContext(
  events: GameMasterEvent[],
  resolvedEvent: GameMasterEvent | null,
) {
  const availableRecentSlots =
    MAX_GAME_MASTER_EVENT_CONTEXT - (resolvedEvent ? 1 : 0);
  const recentEvents = events
    .filter((event) => event.id !== resolvedEvent?.id)
    .slice(-availableRecentSlots)
    .map(eventPayload);

  return {
    recent_events: recentEvents,
    resolved_event: resolvedEvent ? eventPayload(resolvedEvent) : null,
  };
}
