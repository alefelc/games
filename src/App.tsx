import { useCallback, useEffect, useRef, useState } from "react";
import { loadContent } from "./api/content-loader";
import { useGameStore } from "./store/useGameStore";
import { applyTheme } from "./theme/applyTheme";
import { LoadingScreen } from "./screens/LoadingScreen";
import { ErrorScreen } from "./screens/ErrorScreen";
import { AgeGate } from "./screens/AgeGate";
import { HomeScreen } from "./screens/HomeScreen";
import { SetupScreen } from "./screens/SetupScreen";
import { GameScreen } from "./screens/GameScreen";
import { PauseScreen } from "./screens/PauseScreen";
import { SummaryScreen } from "./screens/SummaryScreen";

export default function App() {
  /*
   * No hay que suscribirse al store completo con useGameStore().
   * Zustand entrega un nuevo objeto cada vez que cambia cualquier estado. Si ese objeto
   * se usa como dependencia de refresh(), el efecto de carga vuelve a ejecutarse después
   * de setContent() y genera un bucle infinito: loading → contenido → loading.
   *
   * Los selectores de abajo mantienen estables las acciones y solo vuelven a renderizar
   * cuando cambia el fragmento de estado que la pantalla realmente utiliza.
   */
  const stage = useGameStore((state) => state.stage);
  const content = useGameStore((state) => state.content);
  const setup = useGameStore((state) => state.setup);
  const session = useGameStore((state) => state.session);
  const gameMasterBusy = useGameStore((state) => state.gameMasterBusy);

  const setContent = useGameStore((state) => state.setContent);
  const acceptAge = useGameStore((state) => state.acceptAge);
  const goHome = useGameStore((state) => state.goHome);
  const openSetup = useGameStore((state) => state.openSetup);
  const updateSetup = useGameStore((state) => state.updateSetup);
  const updateFilters = useGameStore((state) => state.updateFilters);
  const startGame = useGameStore((state) => state.startGame);
  const revealCard = useGameStore((state) => state.revealCard);
  const resolveCard = useGameStore((state) => state.resolveCard);
  const reactToCard = useGameStore((state) => state.reactToCard);
  const pause = useGameStore((state) => state.pause);
  const resume = useGameStore((state) => state.resume);
  const finish = useGameStore((state) => state.finish);
  const setCurrentLevel = useGameStore((state) => state.setCurrentLevel);
  const restart = useGameStore((state) => state.restart);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const refresh = useCallback(
    async (force = false, signal?: AbortSignal) => {
      const requestId = ++requestSequence.current;

      if (force) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const result = await loadContent({ force, signal });

        // Evita que una respuesta anterior pise una solicitud más reciente.
        if (requestId !== requestSequence.current || signal?.aborted) return;

        setContent(result.bundle, result.source, result.warning);
        applyTheme(result.bundle.theme, result.bundle.game);
      } catch (cause) {
        if (signal?.aborted || requestId !== requestSequence.current) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Error desconocido al cargar el contenido.",
        );
      } finally {
        if (requestId === requestSequence.current && !signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [setContent],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refresh(false, controller.signal);

    return () => {
      controller.abort();
    };
  }, [refresh]);

  useEffect(() => {
    if (stage !== "game" || !content?.settings.allow_screen_wake_lock) return;
    if (!("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) await sentinel?.release();
      } catch {
        // El navegador puede rechazar Wake Lock por ahorro de energía o falta de interacción.
      }
    };

    void acquire();

    return () => {
      cancelled = true;
      void sentinel?.release().catch(() => undefined);
    };
  }, [stage, content?.settings.allow_screen_wake_lock]);

  if (loading || !content) {
    if (error) return <ErrorScreen onRetry={() => void refresh(true)} />;
    return <LoadingScreen />;
  }

  if (content.settings.maintenance_mode) {
    return (
      <ErrorScreen
        message="El juego está temporalmente pausado."
        onRetry={() => void refresh(true)}
      />
    );
  }

  switch (stage) {
    case "age":
      return <AgeGate content={content} onAccept={acceptAge} />;

    case "home":
      return (
        <HomeScreen
          content={content}
          onStart={openSetup}
          onRefresh={() => void refresh(true)}
          refreshing={refreshing}
        />
      );

    case "setup":
      return setup ? (
        <SetupScreen
          content={content}
          setup={setup}
          onBack={goHome}
          onStart={() => void startGame()}
          updateSetup={updateSetup}
          updateFilters={updateFilters}
        />
      ) : (
        <LoadingScreen content={content} />
      );

    case "game":
      if (setup && session && gameMasterBusy && !session.currentCardId) {
        return (
          <LoadingScreen
            content={content}
            message={
              setup.gameMasterEnabled
                ? "Preparando una partida a tu medida…"
                : "Preparando la primera carta…"
            }
          />
        );
      }

      return setup && session ? (
        <GameScreen
          content={content}
          setup={setup}
          session={session}
          onReveal={revealCard}
          onResolve={(result) => void resolveCard(result)}
          onReact={reactToCard}
          gameMasterBusy={gameMasterBusy}
          onPause={pause}
          onSetLevel={setCurrentLevel}
        />
      ) : (
        <LoadingScreen content={content} />
      );

    case "paused":
      return setup ? (
        <PauseScreen
          content={content}
          setup={setup}
          onResume={resume}
          onFinish={finish}
        />
      ) : (
        <LoadingScreen content={content} />
      );

    case "summary":
      return setup ? (
        <SummaryScreen
          content={content}
          setup={setup}
          session={session}
          onRestart={restart}
          onHome={goHome}
        />
      ) : (
        <LoadingScreen content={content} />
      );

    default:
      return <LoadingScreen />;
  }
}
