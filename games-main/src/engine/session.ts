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
import { sessionRandom } from "./session-random";
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
  alignSceneForManualLevel,
  tryAdvanceCompletedScene,
  applySceneWeights,
  initialSceneState,
  sceneCompatibleCards,
} from "./scene";

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
  const sessionId = crypto.randomUUID();
  beginMemorySession(sessionId);
  return {
    id: sessionId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    currentCardId: null,
    currentLevelId: startingLevel,
    pendingLevelId: null,
    currentPlayer: 0,
    revealed: false,
    usedCardIds: [],
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

  if (
    session.pendingLevelId &&
    selectedLevels.some((level) => level.id === session.pendingLevelId)
  ) {
    return new Set([session.pendingLevelId]);
  }

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
  finishReason:
    | "limit_reached"
    | "no_compatible_card"
    | "invalid_configuration"
    | null;
}

export interface DrawCandidatePool {
  player: 0 | 1;
  candidates: Card[];
  exhausted: boolean;
  scene: SessionState["scene"];
  finishReason: DrawResult["finishReason"];
}

function sexSlugById(content: ContentBundle, id: Id | null): string | null {
  return (content.sexes ?? []).find((sex) => sex.id === id)?.slug ?? null;
}

export function getDrawCandidatePool(
  content: ContentBundle,
  setup: GameSetup,
  session: SessionState,
  resolvedEvent: import("../types").GameMasterEvent | null = null,
): DrawCandidatePool {
  if (session.resolvedCount >= setup.maxCards) {
    return {
      player: session.currentPlayer,
      candidates: [],
      exhausted: true,
      scene: session.scene,
      finishReason: "limit_reached",
    };
  }

  const mode =
    content.modes.find((item) => item.id === setup.modeId) ?? content.modes[0];
  if (!mode) {
    return {
      player: session.currentPlayer,
      candidates: [],
      exhausted: true,
      scene: session.scene,
      finishReason: "invalid_configuration",
    };
  }

  const selectedLevels = content.levels
    .filter((level) => setup.levelIds.includes(level.id))
    .sort((a, b) => a.intensity_order - b.intensity_order);
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
    currentPlayerSexSlug: sexSlugById(
      content,
      player === 0 ? setup.playerOneSexId : setup.playerTwoSexId,
    ),
    partnerSexId: isSolo
      ? null
      : player === 0
        ? setup.playerTwoSexId
        : setup.playerOneSexId,
    partnerSexSlug: isSolo
      ? null
      : sexSlugById(
          content,
          player === 0 ? setup.playerTwoSexId : setup.playerOneSexId,
        ),
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
  let drawScene = session.scene;

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

  if (
    !candidates.length &&
    !session.pendingLevelId &&
    !["previa-solamente", "solo-previa"].includes(mode.slug)
  ) {
    candidates = allEligible;
  }

  if (!candidates.length && !isSolo) {
    const otherPlayer: 0 | 1 = drawPlayer === 0 ? 1 : 0;
    const otherEligible = eligibleFor(otherPlayer);
    const otherCandidates = targetLevels
      ? otherEligible.filter((card) => targetLevels.has(card.level))
      : otherEligible;

    if (
      otherCandidates.length ||
      (!session.pendingLevelId && otherEligible.length)
    ) {
      drawPlayer = otherPlayer;
      allEligible = otherEligible;
      candidates = otherCandidates.length ? otherCandidates : otherEligible;
    }
  }

  if (!candidates.length) {
    const currentLevelIndex = Math.max(
      0,
      selectedLevels.findIndex(
        (level) => level.id === session.currentLevelId,
      ),
    );
    const orderedRecoveryLevels = [
      ...selectedLevels.slice(currentLevelIndex),
      ...selectedLevels.slice(0, currentLevelIndex),
    ];
    const requestedLevel = session.pendingLevelId
      ? selectedLevels.find((level) => level.id === session.pendingLevelId)
      : null;
    const recoveryLevels = requestedLevel
      ? [
          requestedLevel,
          ...orderedRecoveryLevels.filter(
            (level) => level.id !== requestedLevel.id,
          ),
        ]
      : orderedRecoveryLevels;
    const recoveryPlayers: Array<0 | 1> = isSolo
      ? [drawPlayer]
      : [drawPlayer, drawPlayer === 0 ? 1 : 0];

    recovery:
    for (const level of recoveryLevels) {
      const alignedScene = alignSceneForManualLevel(
        session.scene,
        level.id,
        content,
        setup,
      );

      for (const player of recoveryPlayers) {
        const recovered = sceneCompatibleCards(
          rawEligibleFor(player),
          content,
          alignedScene,
        ).filter((card) => card.level === level.id);

        if (!recovered.length) continue;

        drawPlayer = player;
        drawScene = alignedScene;
        allEligible = recovered;
        candidates = recovered;
        break recovery;
      }
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
  const sceneWeighted = applySceneWeights(fresh, content, setup, {
    ...session,
    scene: drawScene,
  });

  return {
    player: drawPlayer,
    candidates: sceneWeighted,
    exhausted: sceneWeighted.length === 0,
    scene: drawScene,
    finishReason: sceneWeighted.length ? null : "no_compatible_card",
  };
}

export function rememberSelectedCard(
  _content: ContentBundle,
  _setup: GameSetup,
  card: Card,
): void {
  recordCardSeen(card);
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
  rememberCardInSession(card, session.id);

  return {
    ...session,
    currentPlayer: player,
    currentCardId: card.id,
    currentLevelId: card.level,
    pendingLevelId: null,
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
  random?: () => number,
): DrawResult {
  const pool = getDrawCandidatePool(content, setup, session);
  const drawRandom =
    random ??
    (() =>
      sessionRandom(
        `${session.id}:${session.resolvedCount}:local-selection`,
      ));
  const card = weightedPick(pool.candidates, drawRandom);

  if (!card) {
    return {
      session: { ...session, currentCardId: null },
      card: null,
      exhausted: true,
      finishReason: pool.finishReason ?? "no_compatible_card",
    };
  }

  rememberSelectedCard(content, setup, card);

  return {
    session: applyCardSelection(
      { ...session, scene: pool.scene },
      card,
      pool.player,
      {
        fallbackUsed: false,
        provider: "local",
        model: "local-browser",
        latencyMs: 0,
      },
    ),
    card,
    exhausted: false,
    finishReason: null,
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
  const transition =
    result === "completed" && resolvedCard
      ? tryAdvanceCompletedScene(session.scene, resolvedCard, content)
      : { scene: session.scene, applied: true, reasons: [] as string[] };
  const nextScene = session.pendingLevelId
      ? alignSceneForManualLevel(
        transition.scene,
        session.pendingLevelId,
        content,
        setup,
      )
    : transition.scene;

  return {
    ...session,
    scene: nextScene,
    currentCardId: null,
    currentLevelId: session.pendingLevelId ?? session.currentLevelId,
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
    gmErrorCode: transition.applied ? session.gmErrorCode : "SCENE_TRANSITION_REJECTED",
    gmErrorReason: transition.applied
      ? session.gmErrorReason
      : `La carta quedó obsoleta frente al estado actual: ${transition.reasons.join(", ")}`,
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
    currentPlayerSexSlug: sexSlugById(content, setup.playerOneSexId),
    partnerSexSlug: isSolo
      ? null
      : sexSlugById(content, setup.playerTwoSexId),
  });

  if (isSolo) return one.length;

  const two = eligibleCards(content, {
    ...common,
    currentPlayerSexId: setup.playerTwoSexId,
    partnerSexId: setup.playerOneSexId,
    currentPlayerSexSlug: sexSlugById(content, setup.playerTwoSexId),
    partnerSexSlug: sexSlugById(content, setup.playerOneSexId),
  });

  return new Set([...one, ...two].map((card) => card.id)).size;
}

export interface EligiblePreviewStats {
  total: number;
  sessionCapacity: number;
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
    currentPlayerSexSlug: sexSlugById(content, setup.playerOneSexId),
    partnerSexSlug: isSolo
      ? null
      : sexSlugById(content, setup.playerTwoSexId),
  });
  const two = isSolo
    ? []
    : eligibleCards(content, {
        ...common,
        currentPlayerSexId: setup.playerTwoSexId,
        partnerSexId: setup.playerOneSexId,
        currentPlayerSexSlug: sexSlugById(content, setup.playerTwoSexId),
        partnerSexSlug: sexSlugById(content, setup.playerOneSexId),
      });
  const groupByVisibleIdentity = (cards: Card[]) => {
    const grouped = new Map<string, Card[]>();
    for (const card of cards) {
      const identity = visibleCardFingerprint(card) || String(card.id);
      const group = grouped.get(identity) ?? [];
      group.push(card);
      grouped.set(identity, group);
    }
    return [...grouped.values()];
  };
  const allCards = [...one, ...two];
  const cardGroups = groupByVisibleIdentity(allCards);
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
    total: cardGroups.length,
    // The number of cards that can open a scene is not the capacity of the
    // session. A configuration may intentionally have one valid opener and
    // many continuations. Clamping maxCards to the opener count turns that
    // perfectly valid game into a one-card session.
    sessionCapacity: cardGroups.length,
    withSelectedInventory: cardGroups.filter((cards) =>
      cards.some(usesSelectedInventory),
    ).length,
    penetration: cardGroups.filter((cards) =>
      cards.some((card) => card.contains_penetration),
    ).length,
    toys: cardGroups.filter((cards) =>
      cards.some((card) => card.contains_toy),
    ).length,
  };
}
