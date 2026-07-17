import { create } from "zustand";
import type {
  ContentBundle,
  ContentSource,
  GameMasterEvent,
  GameMasterReaction,
  GameSetup,
  Id,
  SessionState,
} from "../types";
import {
  createDefaultSetup,
  createSession,
  drawNextCard,
  resolveCurrentCard,
  type DrawResult,
} from "../engine/session";
import { drawAdaptiveCard } from "../engine/game-master";

export type AppStage = "age" | "home" | "setup" | "game" | "paused" | "summary";

interface GameStore {
  stage: AppStage;
  content: ContentBundle | null;
  contentSource: ContentSource | null;
  contentWarning: string | null;
  setup: GameSetup | null;
  session: SessionState | null;
  gameMasterBusy: boolean;
  setContent: (
    content: ContentBundle,
    source: ContentSource,
    warning: string | null,
  ) => void;
  acceptAge: () => void;
  goHome: () => void;
  openSetup: () => void;
  updateSetup: (patch: Partial<GameSetup>) => void;
  updateFilters: (patch: Partial<GameSetup["filters"]>) => void;
  startGame: () => Promise<void>;
  revealCard: () => void;
  reactToCard: (reaction: GameMasterReaction) => void;
  resolveCard: (result: "completed" | "skipped") => Promise<void>;
  pause: () => void;
  resume: () => void;
  finish: () => void;
  setCurrentLevel: (levelId: Id) => void;
  restart: () => void;
}

function normalizeSetup(
  content: ContentBundle,
  setup: GameSetup | null,
): GameSetup {
  const defaults = createDefaultSetup(content);
  if (!setup) return defaults;

  return {
    ...defaults,
    ...setup,
    playerOne: setup.playerOne === "Vos" ? "" : setup.playerOne,
    playerTwo: setup.playerTwo === "Tu pareja" ? "" : setup.playerTwo,
    playerOneSexId: setup.playerOneSexId ?? null,
    playerTwoSexId: setup.playerTwoSexId ?? null,
    gameMasterEnabled:
      content.settings.game_master_enabled &&
      (setup.gameMasterEnabled ?? defaults.gameMasterEnabled),
    filters: {
      ...defaults.filters,
      ...setup.filters,
    },
  };
}

function eventFromCurrentCard(
  content: ContentBundle,
  session: SessionState,
  result: "completed" | "skipped",
): GameMasterEvent | null {
  const card = content.cards.find((item) => item.id === session.currentCardId);

  if (!card) return null;

  return {
    id: crypto.randomUUID(),
    cardId: card.id,
    result,
    reaction: session.gmReaction,
    playerIndex: session.currentPlayer,
    intensity: card.intensity,
    continuityGroup: card.gm_continuity_group,
    sceneRole: card.gm_scene_role,
    createdAt: new Date().toISOString(),
  };
}

function recoverWithLocalDraw(
  content: ContentBundle,
  setup: GameSetup,
  session: SessionState,
): DrawResult {
  try {
    return drawNextCard(content, setup, session);
  } catch (error) {
    console.error("También falló la selección local de emergencia.", error);
    return {
      session: {
        ...session,
        currentCardId: null,
        gmFallbackUsed: true,
        gmProvider: "frontend_fallback",
        gmModel: "local-browser-emergency",
        gmLatencyMs: null,
        gmErrorCode: "LOCAL_DRAW_FAILED",
        gmErrorReason: error instanceof Error ? error.message : String(error),
        gmEndpoint: null,
        gmRequestId: null,
        gmApiVersion: null,
        gmHostMessage:
          "No se pudo preparar otra carta con esta configuración.",
      },
      card: null,
      exhausted: true,
    };
  }
}

const ageAccepted = () =>
  localStorage.getItem("pecadoclub-age-accepted") === "true";

export const useGameStore = create<GameStore>((set, get) => ({
  stage: ageAccepted() ? "home" : "age",
  content: null,
  contentSource: null,
  contentWarning: null,
  setup: null,
  session: null,
  gameMasterBusy: false,

  setContent(content, source, warning) {
    set((state) => ({
      content,
      contentSource: source,
      contentWarning: warning,
      setup: normalizeSetup(content, state.setup),
    }));
  },

  acceptAge() {
    localStorage.setItem("pecadoclub-age-accepted", "true");
    set({ stage: "home" });
  },

  goHome() {
    set({ stage: "home", session: null, gameMasterBusy: false });
  },

  openSetup() {
    const { content, setup } = get();
    if (!content) return;

    set({
      stage: "setup",
      setup: normalizeSetup(content, setup),
      session: null,
      gameMasterBusy: false,
    });
  },

  updateSetup(patch) {
    const setup = get().setup;
    if (!setup) return;
    set({ setup: { ...setup, ...patch } });
  },

  updateFilters(patch) {
    const setup = get().setup;
    if (!setup) return;

    set({
      setup: {
        ...setup,
        filters: { ...setup.filters, ...patch } as GameSetup["filters"],
      },
    });
  },

  async startGame() {
    const { content, setup, gameMasterBusy } = get();
    if (!content || !setup || gameMasterBusy) return;

    const session = createSession(content, setup);
    set({
      stage: "game",
      session,
      gameMasterBusy: true,
    });

    try {
      const draw = await drawAdaptiveCard(content, setup, session, null);

      if (get().session?.id !== session.id) return;

      set({
        stage: draw.exhausted ? "summary" : "game",
        session: draw.session,
      });
    } catch (error) {
      console.error(
        "Falló la preparación adaptativa inicial. Se usa recuperación local.",
        error,
      );

      if (get().session?.id !== session.id) return;

      const draw = recoverWithLocalDraw(content, setup, session);
      set({
        stage: draw.exhausted ? "summary" : "game",
        session: draw.session,
      });
    } finally {
      if (get().session?.id === session.id) {
        set({ gameMasterBusy: false });
      }
    }
  },

  revealCard() {
    const session = get().session;
    if (!session) return;
    set({ session: { ...session, revealed: true } });
  },

  reactToCard(reaction) {
    const session = get().session;
    if (!session || !session.revealed) return;

    set({
      session: {
        ...session,
        gmReaction: session.gmReaction === reaction ? "none" : reaction,
      },
    });
  },

  async resolveCard(result) {
    const { content, setup, session, gameMasterBusy } = get();

    if (!content || !setup || !session || gameMasterBusy) return;

    const resolvedEvent = eventFromCurrentCard(content, session, result);

    let resolved = resolveCurrentCard(content, setup, session, result);

    if (resolvedEvent) {
      resolved = {
        ...resolved,
        gmEvents: [...resolved.gmEvents, resolvedEvent].slice(-20),
      };
    }

    set({
      session: resolved,
      gameMasterBusy: true,
    });

    try {
      const draw = await drawAdaptiveCard(
        content,
        setup,
        resolved,
        resolvedEvent,
      );

      if (get().session?.id !== resolved.id) return;

      set({
        stage: draw.exhausted ? "summary" : "game",
        session: draw.session,
      });
    } catch (error) {
      console.error(
        "Falló la siguiente selección adaptativa. Se usa recuperación local.",
        error,
      );

      if (get().session?.id !== resolved.id) return;

      const draw = recoverWithLocalDraw(content, setup, resolved);
      set({
        stage: draw.exhausted ? "summary" : "game",
        session: draw.session,
      });
    } finally {
      if (get().session?.id === resolved.id) {
        set({ gameMasterBusy: false });
      }
    }
  },

  pause() {
    if (get().stage === "game") set({ stage: "paused" });
  },

  resume() {
    if (get().stage === "paused") set({ stage: "game" });
  },

  finish() {
    const session = get().session;
    set({
      stage: "summary",
      session: session
        ? { ...session, endedAt: new Date().toISOString() }
        : session,
      gameMasterBusy: false,
    });
  },

  setCurrentLevel(levelId) {
    const session = get().session;
    if (!session) return;
    set({ session: { ...session, currentLevelId: levelId } });
  },

  restart() {
    const { content } = get();
    set({
      stage: "setup",
      session: null,
      setup: content ? createDefaultSetup(content) : null,
      gameMasterBusy: false,
    });
  },
}));
