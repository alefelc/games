import type {
  Card,
  ContentBundle,
  GameMode,
  GameSetup,
  Id,
  SessionState,
} from "../types";
import { eligibleCards } from "./eligibility";
import { weightedPick } from "./random";
import { usedVisibleCardFingerprints, visibleCardFingerprint } from "./card-identity";
import { preferFreshCards, recordCardSeen } from "./card-history";
import {
  applyCardMemory,
  beginMemorySession,
  rememberCardInSession,
} from "./card-memory";
import {
  buildDynamicFilterDefaults,
  fallbackFilterDefinitions,
} from "../lib/dynamicFilters";
import { chooseInventoryPool } from "../lib/inventoryCoverage";
import { choosePracticePool } from "../lib/practiceCoverage";
import { resolveDefaultCards } from "../lib/cardCount";
import {
  buildHistoryKey,
  readCardHistory,
  rememberCard,
  resetCardHistory,
} from "../lib/persistentHistory";
import {
  advanceCompletedScene,
  applySceneWeights,
  initialSceneState,
  sceneCompatibleCards,
} from "./scene";

function historyContext(content: ContentBundle, setup: GameSetup) {
  const mode = content.modes.find((item) => item.id === setup.modeId);
  const players: 1 | 2 =
    mode?.slug === "solitario" || mode?.turn_mode === "single" ? 1 : 2;
  return {
    key: buildHistoryKey(content.game?.id ?? "default", setup.modeId, players),
    limit: Math.max(
      50,
      content.settings?.cross_session_history_limit || 800,
    ),
  };
}

export function createDefaultSetup(content: ContentBundle): GameSetup {
  const defaultModeRecord =
    content.modes.find((mode) => mode.id === content.settings.default_mode) ??
    content.modes[0];
  const defaultMode = defaultModeRecord?.id ?? "";
  const defaultSolo = defaultModeRecord?.slug === "solitario";
  const previaOnly = ["previa-solamente", "solo-previa"].includes(defaultModeRecord?.slug ?? "");
  const orderedLevels = [...content.levels].sort((a, b) => a.intensity_order - b.intensity_order);
  const defaultLevels = previaOnly
    ? orderedLevels.filter((level) => level.slug === "previa").map((level) => level.id)
    : orderedLevels.map((level) => level.id);
  const compatibleDecks = content.decks.filter(
    (deck) =>
      deck.active &&
      (defaultSolo
        ? Number(deck.minimum_players ?? 2) <= 1 &&
          Number(deck.maximum_players ?? 2) >= 1
        : Number(deck.minimum_players ?? 2) <= 2 &&
          Number(deck.maximum_players ?? 2) >= 2),
  );

  return {
    playerOne: "",
    playerTwo: "",
    playerOneSexId: null,
    playerTwoSexId: null,
    modeId: defaultMode,
    levelIds: defaultLevels,
    deckIds: compatibleDecks.map((deck) => deck.id),
    elementIds: (content.elements ?? [])
      .filter((item) => item.visible_in_setup && item.default_selected)
      .sort((a, b) => a.selection_priority - b.selection_priority)
      .map((item) => item.id),
    toyIds: (content.toys ?? [])
      .filter((item) => item.visible_in_setup && item.default_selected)
      .sort((a, b) => a.selection_priority - b.selection_priority)
      .map((item) => item.id),
    filters: buildDynamicFilterDefaults(
      content.filters?.length
        ? content.filters
        : fallbackFilterDefinitions(content.settings),
    ),
    maxCards: resolveDefaultCards(content.settings),
    intenseConsent: false,
    gameMasterEnabled:
      content.settings.game_master_enabled &&
      content.settings.game_master_default_on,
  };
}

export function createSession(
  content: ContentBundle,
  setup: GameSetup,
): SessionState {
  const mode =
    content.modes.find((item) => item.id === setup.modeId) ?? content.modes[0];
  const startingLevel = resolveStartingLevel(content, setup, mode);
  const { key } = historyContext(content, setup);
  const sessionId = crypto.randomUUID();
  beginMemorySession(sessionId);
  return {
    id: sessionId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    currentCardId: null,
    currentLevelId: startingLevel,
    currentPlayer: 0,
    revealed: false,
    usedCardIds: readCardHistory(key),
    completedCardIds: [],
    skippedCardIds: [],
    resolvedCount: 0,
    timerStartedAt: null,
    timerRemaining: null,
    gmPhase: "warmup",
    gmTension: 15,
    gmEnergy: 25,
    gmHostMessage: null,
    gmStrategy: null,
    gmReaction: "none",
    gmEvents: [],
    scene: initialSceneState(),
    gmFallbackUsed: false,
    gmProvider: null,
    gmModel: null,
    gmLatencyMs: null,
    gmErrorCode: null,
    gmErrorReason: null,
    gmEndpoint: null,
    gmRequestId: null,
    gmApiVersion: null,
  };
}

function resolveStartingLevel(
  content: ContentBundle,
  setup: GameSetup,
  mode?: GameMode,
): Id | null {
  const selected = new Set(setup.levelIds);
  if (["previa-solamente", "solo-previa"].includes(mode?.slug ?? "")) {
    return (
      content.levels.find((level) => level.slug === "previa")?.id ??
      setup.levelIds[0] ??
      null
    );
  }
  if (mode?.starting_level && selected.has(mode.starting_level))
    return mode.starting_level;
  return (
    content.levels
      .filter((level) => selected.has(level.id))
      .sort((a, b) => a.intensity_order - b.intensity_order)[0]?.id ?? null
  );
}

function targetLevelsForDraw(
  content: ContentBundle,
  setup: GameSetup,
  session: SessionState,
  mode: GameMode,
  resolvedEvent?: import("../types").GameMasterEvent | null,
): Set<Id> | null {
  const selectedLevels = content.levels
    .filter((level) => setup.levelIds.includes(level.id))
    .sort((a, b) => a.intensity_order - b.intensity_order);

  if (!selectedLevels.length) return new Set();

  if (["previa-solamente", "solo-previa"].includes(mode.slug)) {
    const previa = selectedLevels.find((level) => level.slug === "previa");
    return new Set(previa ? [previa.id] : [selectedLevels[0].id]);
  }

  if (["modo-fuego", "aleatorio"].includes(mode.slug)) {
    return null;
  }

  let baseIndex = 0;
  if (mode.automatic_progression && mode.cards_before_level_up > 0) {
    baseIndex = Math.min(
      selectedLevels.length - 1,
      Math.floor(session.resolvedCount / mode.cards_before_level_up),
    );
  } else if (session.currentLevelId) {
    const found = selectedLevels.findIndex(
      (level) => level.id === session.currentLevelId,
    );
    baseIndex = found >= 0 ? found : 0;
  }

  const event = resolvedEvent;
  const escalationLevels = selectedLevels.filter(
    (level) => level.slug !== "cierre",
  );

  if (event?.reaction === "too_soft" && escalationLevels.length) {
    const currentEscalationIndex = Math.max(
      0,
      escalationLevels.findIndex(
        (level) => level.id === selectedLevels[baseIndex]?.id,
      ),
    );
    const recentRequests = session.gmEvents
      .slice(-4)
      .filter((item) => item.reaction === "too_soft").length;
    const jump = Math.min(4, 2 + recentRequests);
    const targetIndex = Math.min(
      escalationLevels.length - 1,
      currentEscalationIndex + jump,
    );
    const lowerIndex = Math.max(currentEscalationIndex + 1, targetIndex - 1);
    return new Set(
      escalationLevels
        .slice(lowerIndex, targetIndex + 1)
        .map((level) => level.id),
    );
  }

  if (event?.reaction === "too_much") {
    return new Set(
      [
        selectedLevels[Math.max(0, baseIndex - 1)]?.id,
        selectedLevels[baseIndex]?.id,
      ].filter(Boolean) as Id[],
    );
  }

  return new Set([selectedLevels[baseIndex]?.id].filter(Boolean) as Id[]);
}

function nextPlayer(
  current: 0 | 1,
  mode: GameMode,
  random: () => number,
): 0 | 1 {
  if (mode.turn_mode === "single" || mode.slug === "solitario") return 0;
  if (mode.turn_mode === "random") return random() < 0.5 ? 0 : 1;
  return current === 0 ? 1 : 0;
}

export interface DrawResult {
  session: SessionState;
  card: Card | null;
  exhausted: boolean;
}

export interface DrawCandidatePool {
  player: 0 | 1;
  candidates: Card[];
  exhausted: boolean;
}

export function getDrawCandidatePool(
  content: ContentBundle,
  setup: GameSetup,
  session: SessionState,
  resolvedEvent: import("../types").GameMasterEvent | null = null,
): DrawCandidatePool {
  if (session.resolvedCount >= setup.maxCards) {
    return { player: session.currentPlayer, candidates: [], exhausted: true };
  }

  const mode =
    content.modes.find((item) => item.id === setup.modeId) ?? content.modes[0];
  if (!mode) {
    return { player: session.currentPlayer, candidates: [], exhausted: true };
  }

  const isSolo = mode.slug === "solitario" || mode.turn_mode === "single";
  const contextForPlayer = (player: 0 | 1) => ({
    playerCount: isSolo ? (1 as const) : (2 as const),
    selectedLevelIds: new Set(setup.levelIds),
    selectedDeckIds: new Set(setup.deckIds),
    selectedElementIds: new Set(setup.elementIds),
    selectedToyIds: new Set(setup.toyIds),
    filters: setup.filters,
    filterDefinitions: content.filters?.length
      ? content.filters
      : fallbackFilterDefinitions(content.settings),
    currentPlayerSexId:
      player === 0 ? setup.playerOneSexId : setup.playerTwoSexId,
    partnerSexId: isSolo
      ? null
      : player === 0
        ? setup.playerTwoSexId
        : setup.playerOneSexId,
  });

  const targetLevels = targetLevelsForDraw(
    content,
    setup,
    session,
    mode,
    resolvedEvent,
  );
  let used = new Set(session.usedCardIds.map(String));
  let usedFingerprints = usedVisibleCardFingerprints(
    content.cards ?? [],
    used,
  );
  let drawPlayer = session.currentPlayer;

  const rawEligibleFor = (player: 0 | 1) =>
    eligibleCards(content, contextForPlayer(player)).filter((card) => {
      if (used.has(String(card.id))) return false;
      const fingerprint = visibleCardFingerprint(card);
      return !fingerprint || !usedFingerprints.has(fingerprint);
    });
  const eligibleFor = (player: 0 | 1) =>
    sceneCompatibleCards(rawEligibleFor(player), content, session.scene);

  let allEligible = eligibleFor(drawPlayer);
  let candidates = targetLevels
    ? allEligible.filter((card) => targetLevels.has(card.level))
    : allEligible;

  if (!candidates.length && !["previa-solamente", "solo-previa"].includes(mode.slug)) {
    candidates = allEligible;
  }

  if (!candidates.length && !isSolo) {
    const otherPlayer: 0 | 1 = drawPlayer === 0 ? 1 : 0;
    const otherEligible = eligibleFor(otherPlayer);
    const otherCandidates = targetLevels
      ? otherEligible.filter((card) => targetLevels.has(card.level))
      : otherEligible;

    if (otherCandidates.length || otherEligible.length) {
      drawPlayer = otherPlayer;
      allEligible = otherEligible;
      candidates = otherCandidates.length ? otherCandidates : otherEligible;
    }
  }

  if (!candidates.length && session.usedCardIds.length) {
    const currentSessionIds = new Set([
      ...session.completedCardIds,
      ...session.skippedCardIds,
    ]);
    used = new Set(Array.from(currentSessionIds, String));
    usedFingerprints = usedVisibleCardFingerprints(
      content.cards ?? [],
      used,
    );
    resetCardHistory(historyContext(content, setup).key);
    drawPlayer = session.currentPlayer;
    allEligible = eligibleFor(drawPlayer);
    candidates = targetLevels
      ? allEligible.filter((card) => targetLevels.has(card.level))
      : allEligible;
    if (!candidates.length && !["previa-solamente", "solo-previa"].includes(mode.slug)) {
      candidates = allEligible;
    }
  }

  const inventoryAware = chooseInventoryPool(
    candidates,
    allEligible,
    content,
    setup,
    session,
  );
  const practiceAware = choosePracticePool(
    inventoryAware,
    content,
    setup,
    session,
  );

  const memoryAware = applyCardMemory(practiceAware);
  const fresh = preferFreshCards(memoryAware);
  const sceneWeighted = applySceneWeights(fresh, content, setup, session);

  return {
    player: drawPlayer,
    candidates: sceneWeighted,
    exhausted: sceneWeighted.length === 0,
  };
}

export function rememberSelectedCard(
  content: ContentBundle,
  setup: GameSetup,
  card: Card,
): void {
  const { key, limit } = historyContext(content, setup);
  rememberCard(key, card.id, limit);
}

export function applyCardSelection(
  session: SessionState,
  card: Card,
  player: 0 | 1,
  gameMaster?: {
    phase?: string;
    tension?: number;
    energy?: number;
    hostMessage?: string | null;
    strategy?: string | null;
    fallbackUsed?: boolean;
    provider?:
      | "openai"
      | "adaptive_fallback"
      | "frontend_fallback"
      | "local"
      | null;
    model?: string | null;
    latencyMs?: number | null;
    errorCode?: string | null;
    errorReason?: string | null;
    endpoint?: string | null;
    requestId?: string | null;
    apiVersion?: string | null;
  },
): SessionState {
  recordCardSeen(card);
  rememberCardInSession(card, session.id);

  return {
    ...session,
    currentPlayer: player,
    currentCardId: card.id,
    currentLevelId: card.level,
    revealed: false,
    usedCardIds: [...session.usedCardIds, card.id],
    timerStartedAt: null,
    timerRemaining: card.duration_seconds ?? card.estimated_duration_seconds,
    gmPhase: gameMaster?.phase ?? session.gmPhase,
    gmTension: gameMaster?.tension ?? session.gmTension,
    gmEnergy: gameMaster?.energy ?? session.gmEnergy,
    gmHostMessage: gameMaster?.hostMessage ?? null,
    gmStrategy: gameMaster?.strategy ?? null,
    gmReaction: "none",
    gmFallbackUsed: gameMaster?.fallbackUsed ?? false,
    gmProvider: gameMaster?.provider ?? null,
    gmModel: gameMaster?.model ?? null,
    gmLatencyMs: gameMaster?.latencyMs ?? null,
    gmErrorCode: gameMaster?.errorCode ?? null,
    gmErrorReason: gameMaster?.errorReason ?? null,
    gmEndpoint: gameMaster?.endpoint ?? null,
    gmRequestId: gameMaster?.requestId ?? null,
    gmApiVersion: gameMaster?.apiVersion ?? null,
  };
}

export function drawNextCard(
  content: ContentBundle,
  setup: GameSetup,
  session: SessionState,
  random: () => number = Math.random,
): DrawResult {
  const pool = getDrawCandidatePool(content, setup, session);
  const card = weightedPick(pool.candidates, random);

  if (!card) {
    return {
      session: { ...session, currentCardId: null },
      card: null,
      exhausted: true,
    };
  }

  rememberSelectedCard(content, setup, card);

  return {
    session: applyCardSelection(session, card, pool.player, {
      fallbackUsed: false,
      provider: "local",
      model: "local-browser",
      latencyMs: 0,
    }),
    card,
    exhausted: false,
  };
}

export function resolveCurrentCard(
  content: ContentBundle,
  setup: GameSetup,
  session: SessionState,
  result: "completed" | "skipped",
  random: () => number = Math.random,
): SessionState {
  if (!session.currentCardId) return session;
  const mode =
    content.modes.find((item) => item.id === setup.modeId) ?? content.modes[0];
  if (!mode) return session;

  const resolvedCard = (content.cards ?? []).find((card) => card.id === session.currentCardId) ?? null;
  const nextScene =
    result === "completed" && resolvedCard
      ? advanceCompletedScene(session.scene, resolvedCard, content)
      : session.scene;

  return {
    ...session,
    scene: nextScene,
    currentCardId: null,
    currentPlayer: nextPlayer(session.currentPlayer, mode, random),
    completedCardIds:
      result === "completed"
        ? [...session.completedCardIds, session.currentCardId]
        : session.completedCardIds,
    skippedCardIds:
      result === "skipped"
        ? [...session.skippedCardIds, session.currentCardId]
        : session.skippedCardIds,
    resolvedCount: session.resolvedCount + 1,
    revealed: false,
    timerStartedAt: null,
    timerRemaining: null,
    gmReaction: "none",
  };
}

export function previewEligibleCount(
  content: ContentBundle,
  setup: GameSetup,
): number {
  const mode = content.modes.find((item) => item.id === setup.modeId);
  const isSolo = mode?.slug === "solitario" || mode?.turn_mode === "single";
  const common = {
    playerCount: isSolo ? (1 as const) : (2 as const),
    selectedLevelIds: new Set(setup.levelIds),
    selectedDeckIds: new Set(setup.deckIds),
    selectedElementIds: new Set(setup.elementIds),
    selectedToyIds: new Set(setup.toyIds),
    filters: setup.filters,
    filterDefinitions: content.filters?.length
      ? content.filters
      : fallbackFilterDefinitions(content.settings),
  };

  const one = eligibleCards(content, {
    ...common,
    currentPlayerSexId: setup.playerOneSexId,
    partnerSexId: isSolo ? null : setup.playerTwoSexId,
  });

  if (isSolo) return one.length;

  const two = eligibleCards(content, {
    ...common,
    currentPlayerSexId: setup.playerTwoSexId,
    partnerSexId: setup.playerOneSexId,
  });

  return new Set([...one, ...two].map((card) => card.id)).size;
}

export interface EligiblePreviewStats {
  total: number;
  withSelectedInventory: number;
  penetration: number;
  toys: number;
}

export function previewEligibleStats(
  content: ContentBundle,
  setup: GameSetup,
): EligiblePreviewStats {
  const mode = content.modes.find((item) => item.id === setup.modeId);
  const isSolo = mode?.slug === "solitario" || mode?.turn_mode === "single";
  const common = {
    playerCount: isSolo ? (1 as const) : (2 as const),
    selectedLevelIds: new Set(setup.levelIds),
    selectedDeckIds: new Set(setup.deckIds),
    selectedElementIds: new Set(setup.elementIds),
    selectedToyIds: new Set(setup.toyIds),
    filters: setup.filters,
    filterDefinitions: content.filters?.length
      ? content.filters
      : fallbackFilterDefinitions(content.settings),
  };
  const one = eligibleCards(content, {
    ...common,
    currentPlayerSexId: setup.playerOneSexId,
    partnerSexId: isSolo ? null : setup.playerTwoSexId,
  });
  const two = isSolo
    ? []
    : eligibleCards(content, {
        ...common,
        currentPlayerSexId: setup.playerTwoSexId,
        partnerSexId: setup.playerOneSexId,
      });
  const cards = [...new Map([...one, ...two].map((card) => [card.id, card])).values()];
  const selectedInventory = new Set([...setup.elementIds, ...setup.toyIds]);
  const usesSelectedInventory = (card: Card) =>
    content.cardElements.some(
      (row) => row.card === card.id && selectedInventory.has(row.element),
    ) ||
    content.cardToys.some(
      (row) => row.card === card.id && selectedInventory.has(row.toy),
    ) ||
    (setup.toyIds.length > 0 &&
      card.contains_toy &&
      !content.cardToys.some((row) => row.card === card.id));

  return {
    total: cards.length,
    withSelectedInventory: cards.filter(usesSelectedInventory).length,
    penetration: cards.filter((card) => card.contains_penetration).length,
    toys: cards.filter((card) => card.contains_toy).length,
  };
}
