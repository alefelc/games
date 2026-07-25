import { describe, expect, it } from "vitest";
import {
  buildGameMasterEventContext,
  MAX_GAME_MASTER_EVENT_CONTEXT,
} from "../lib/gameMasterContext";
import type { GameMasterEvent } from "../types";

function event(index: number): GameMasterEvent {
  return {
    id: `event-${index}`,
    cardId: `card-${index}`,
    result: "completed",
    reaction: "none",
    playerIndex: index % 2 === 0 ? 0 : 1,
    intensity: Math.min(7, Math.max(1, index)),
    continuityGroup: `group-${index}`,
    sceneRole: "continuation",
    createdAt: new Date(Date.UTC(2026, 6, 24, 12, index)).toISOString(),
  };
}

describe("contexto adaptativo en partidas largas 5.2.0", () => {
  it("la carta 11 conserva una ventana válida sin duplicar el evento resuelto", () => {
    const events = Array.from({ length: 11 }, (_, index) => event(index + 1));
    const resolved = events.at(-1)!;
    const context = buildGameMasterEventContext(events, resolved);

    expect(context.recent_events).toHaveLength(9);
    expect(context.resolved_event?.id).toBe("event-11");
    expect(context.recent_events.map((item) => item.id)).toEqual([
      "event-2",
      "event-3",
      "event-4",
      "event-5",
      "event-6",
      "event-7",
      "event-8",
      "event-9",
      "event-10",
    ]);
    expect(
      context.recent_events.some(
        (item) => item.id === context.resolved_event?.id,
      ),
    ).toBe(false);
  });

  it("mantiene el mismo límite después de 40 cartas", () => {
    const events = Array.from({ length: 40 }, (_, index) => event(index + 1));
    const resolved = events.at(-1)!;
    const context = buildGameMasterEventContext(events, resolved);

    expect(
      context.recent_events.length + (context.resolved_event ? 1 : 0),
    ).toBe(MAX_GAME_MASTER_EVENT_CONTEXT);
    expect(context.recent_events.at(0)?.id).toBe("event-31");
    expect(context.recent_events.at(-1)?.id).toBe("event-39");
    expect(context.resolved_event?.id).toBe("event-40");
  });
});
