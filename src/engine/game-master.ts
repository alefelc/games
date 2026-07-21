import {
  normalizeGameMasterError,
  requestGameMasterDecision,
} from "../api/game-master";
import type {
  Card,
  ContentBundle,
  GameMasterEvent,
  GameSetup,
  SessionState,
} from "../types";
import {
  applyCardSelection,
  drawNextCard,
  getDrawCandidatePool,
  rememberSelectedCard,
  type DrawResult,
} from "./session";
import { cardHistoryPenalty } from "./card-history";

function rankCandidates(
  candidates: Card[],
  session: SessionState,
  resolvedEvent: GameMasterEvent | null,
) {
  const continuity = resolvedEvent?.continuityGroup;

  const scored = candidates.map((card) => {
    let value = card.weight / 100;
    value += card.gm_novelty_score * 0.45;
    value -= cardHistoryPenalty(card);

    const recentGroupRepeats = session.gmEvents
      .slice(-8)
      .filter(
        (event) =>
          event.continuityGroup &&
          event.continuityGroup === card.gm_continuity_group,
      ).length;

    if (resolvedEvent?.reaction !== "repeat_style") {
      value -= recentGroupRepeats * 3.5;
    }

    if (continuity && card.gm_continuity_group === continuity) {
      if (resolvedEvent?.reaction === "repeat_style") value += 8;
      else if (resolvedEvent?.reaction === "change_style") value -= 14;
      else value += 1.5;
    }

    if (resolvedEvent?.reaction === "change_style") {
      value += card.gm_novelty_score * 1.5;
    }

    if (resolvedEvent?.reaction === "too_much") {
      value += card.gm_recovery_score * 2;
      value -= Math.max(0, card.gm_escalation_score) * 3;
    }

    if (resolvedEvent?.reaction === "too_soft") {
      value += card.gm_escalation_score * 5;
      value +=
        Math.max(0, card.intensity - (resolvedEvent?.intensity || 0)) * 3;
    }

    value -= session.usedCardIds.includes(card.id) ? 100 : 0;
    value += Math.random() * 4;
    return { card, value };
  });

  scored.sort((a, b) => b.value - a.value);

  const selected: Card[] = [];
  const ids = new Set<string>();
  const groupCounts = new Map<string, number>();
  const anatomyCounts = new Map<string, number>();

  const add = (card: Card, force = false) => {
    if (ids.has(card.id) || selected.length >= 60) return false;

    const group = card.gm_continuity_group || "none";
    const anatomy = card.anatomy_focus || "none";
    const groupCount = groupCounts.get(group) || 0;
    const anatomyCount = anatomyCounts.get(anatomy) || 0;

    if (
      !force &&
      selected.length < 42 &&
      (groupCount >= 3 || anatomyCount >= 7)
    ) {
      return false;
    }

    ids.add(card.id);
    selected.push(card);
    groupCounts.set(group, groupCount + 1);
    anatomyCounts.set(anatomy, anatomyCount + 1);
    return true;
  };

  // First frame: best cards, but never a wall of the same practice.
  for (const { card } of scored) {
    add(card);
    if (selected.length >= 20) break;
  }

  // Second frame: one candidate from every distinct level/anatomy/group.
  const groups = new Map<string, typeof scored>();
  for (const item of scored) {
    const key = [
      item.card.level,
      item.card.anatomy_focus,
      item.card.gm_continuity_group || "none",
    ].join("|");
    groups.set(key, [...(groups.get(key) || []), item]);
  }

  const groupList = [...groups.values()].sort(() => Math.random() - 0.5);
  for (let round = 0; round < 4; round += 1) {
    for (const group of groupList) {
      const item = group[round];
      if (item) add(item.card);
      if (selected.length >= 50) break;
    }
    if (selected.length >= 50) break;
  }

  // Fill the remainder without caps so a small eligible pool never stalls.
  scored.forEach(({ card }) => add(card, true));
  return selected;
}

export async function drawAdaptiveCard(
  content: ContentBundle,
  setup: GameSetup,
  session: SessionState,
  resolvedEvent: GameMasterEvent | null,
): Promise<DrawResult> {
  if (!setup.gameMasterEnabled) {
    return drawNextCard(content, setup, session);
  }

  const pool = getDrawCandidatePool(content, setup, session, resolvedEvent);
  if (pool.exhausted || !pool.candidates.length) {
    return { session, card: null, exhausted: true };
  }

  try {
    const candidates = rankCandidates(pool.candidates, session, resolvedEvent);

    const decision = await requestGameMasterDecision({
      content,
      setup,
      session,
      player: pool.player,
      candidates,
      resolvedEvent,
    });

    const selected = candidates.find(
      (card) => card.id === decision.selected_card_id,
    );

    if (!selected) {
      throw new Error("La carta elegida ya no está disponible.");
    }

    rememberSelectedCard(content, setup, selected);

    return {
      session: applyCardSelection(session, selected, pool.player, {
        phase: decision.phase,
        tension: decision.target_tension,
        energy: decision.target_energy,
        hostMessage: decision.host_message || null,
        strategy: decision.strategy,
        fallbackUsed: decision.fallback_used,
        provider: decision.provider,
        model: decision.model,
        latencyMs: decision.latency_ms,
        errorCode: decision.fallback_code ?? null,
        errorReason: decision.fallback_reason ?? null,
        endpoint: decision.endpoint,
        requestId: decision.request_id,
        apiVersion: decision.api_version,
      }),
      card: selected,
      exhausted: false,
    };
  } catch (error) {
    const failure = normalizeGameMasterError(error);
    console.warn("Se continuó con la selección local.", failure, error);

    const localCandidates = rankCandidates(
      pool.candidates,
      session,
      resolvedEvent,
    );
    const selected = localCandidates[0] ?? null;

    if (!selected) {
      return {
        session: { ...session, currentCardId: null },
        card: null,
        exhausted: true,
      };
    }


    rememberSelectedCard(content, setup, selected);

    return {
      session: applyCardSelection(session, selected, pool.player, {
        phase: session.gmPhase,
        tension: Math.max(session.gmTension, selected.intensity * 14),
        energy: selected.gm_energy_score * 20,
        hostMessage:
          resolvedEvent?.reaction === "too_soft"
            ? "Subimos el ritmo de verdad."
            : "La conexión falló en esta carta; se reintentará en la próxima.",
        strategy:
          resolvedEvent?.reaction === "too_soft"
            ? "escalate"
            : "continue_scene",
        fallbackUsed: true,
        provider: "frontend_fallback",
        model: "local-browser",
        latencyMs: null,
        errorCode: failure.code,
        errorReason: failure.reason,
        endpoint: failure.endpoint,
        requestId: failure.requestId,
        apiVersion: null,
      }),
      card: selected,
      exhausted: false,
    };
  }
}
