import { create } from 'zustand';
import type { ContentBundle, ContentSource, GameSetup, Id, SessionState } from '../types';
import { createDefaultSetup, createSession, drawNextCard, resolveCurrentCard } from '../engine/session';

export type AppStage = 'age' | 'home' | 'setup' | 'game' | 'paused' | 'summary';

interface GameStore {
  stage: AppStage;
  content: ContentBundle | null;
  contentSource: ContentSource | null;
  contentWarning: string | null;
  setup: GameSetup | null;
  session: SessionState | null;
  setContent: (content: ContentBundle, source: ContentSource, warning: string | null) => void;
  acceptAge: () => void;
  goHome: () => void;
  openSetup: () => void;
  updateSetup: (patch: Partial<GameSetup>) => void;
  updateFilters: (patch: Partial<GameSetup['filters']>) => void;
  startGame: () => void;
  revealCard: () => void;
  resolveCard: (result: 'completed' | 'skipped') => void;
  pause: () => void;
  resume: () => void;
  finish: () => void;
  setCurrentLevel: (levelId: Id) => void;
  restart: () => void;
}

const ageAccepted = () => localStorage.getItem('pecadoclub-age-accepted') === 'true';

export const useGameStore = create<GameStore>((set, get) => ({
  stage: ageAccepted() ? 'home' : 'age',
  content: null,
  contentSource: null,
  contentWarning: null,
  setup: null,
  session: null,

  setContent(content, source, warning) {
    set((state) => ({
      content,
      contentSource: source,
      contentWarning: warning,
      setup: state.setup ?? createDefaultSetup(content),
    }));
  },

  acceptAge() {
    localStorage.setItem('pecadoclub-age-accepted', 'true');
    set({ stage: 'home' });
  },

  goHome() {
    set({ stage: 'home', session: null });
  },

  openSetup() {
    const { content, setup } = get();
    if (!content) return;
    set({ stage: 'setup', setup: setup ?? createDefaultSetup(content), session: null });
  },

  updateSetup(patch) {
    const setup = get().setup;
    if (!setup) return;
    set({ setup: { ...setup, ...patch } });
  },

  updateFilters(patch) {
    const setup = get().setup;
    if (!setup) return;
    set({ setup: { ...setup, filters: { ...setup.filters, ...patch } } });
  },

  startGame() {
    const { content, setup } = get();
    if (!content || !setup) return;
    let session = createSession(content, setup);
    const draw = drawNextCard(content, setup, session);
    session = draw.session;
    set({ stage: draw.exhausted ? 'summary' : 'game', session });
  },

  revealCard() {
    const session = get().session;
    if (!session) return;
    set({ session: { ...session, revealed: true } });
  },

  resolveCard(result) {
    const { content, setup, session } = get();
    if (!content || !setup || !session) return;
    const resolved = resolveCurrentCard(content, setup, session, result);
    const draw = drawNextCard(content, setup, resolved);
    set({ stage: draw.exhausted ? 'summary' : 'game', session: draw.session });
  },

  pause() {
    if (get().stage === 'game') set({ stage: 'paused' });
  },

  resume() {
    if (get().stage === 'paused') set({ stage: 'game' });
  },

  finish() {
    const session = get().session;
    set({
      stage: 'summary',
      session: session ? { ...session, endedAt: new Date().toISOString() } : session,
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
      stage: 'setup',
      session: null,
      setup: content ? createDefaultSetup(content) : null,
    });
  },
}));
