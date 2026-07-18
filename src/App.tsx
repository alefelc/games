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
import { configureAnalytics, trackAnalyticsScreen } from "./lib/analytics";
import { useAuthStore } from "./auth/useAuthStore";
import { AuthScreen, type AuthMode } from "./screens/AuthScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { serializeSetupPreferences } from "./auth/profile-preferences";

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
  const initialAuth = new URLSearchParams(window.location.search);
  const initialAuthAction = initialAuth.get("auth");
  const [accountView, setAccountView] = useState<"none" | "auth" | "profile">(
    initialAuthAction ? "auth" : "none",
  );
  const [authMode, setAuthMode] = useState<AuthMode>(
    initialAuthAction === "accept-invite"
      ? "accept-invite"
      : initialAuthAction === "reset-password"
        ? "reset"
        : "login",
  );
  const authToken = initialAuth.get("token");
  const authStatus = useAuthStore((state) => state.status);
  const authUser = useAuthStore((state) => state.user);
  const authProfile = useAuthStore((state) => state.profile);
  const initializeAuth = useAuthStore((state) => state.initialize);
  const savePreferences = useAuthStore((state) => state.savePreferences);
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
    void initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(false, controller.signal);

    return () => {
      controller.abort();
    };
  }, [refresh]);

  useEffect(() => {
    if (!content) return;
    configureAnalytics(content.settings);
  }, [
    content?.settings.analytics_enabled,
    content?.settings.analytics_measurement_id,
  ]);

  useEffect(() => {
    if (!content) return;
    trackAnalyticsScreen(stage);
  }, [stage, content]);

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

  const closeAccountView = () => {
    setAccountView("none");
    if (new URLSearchParams(window.location.search).has("auth")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  if (accountView === "auth") {
    return (
      <AuthScreen
        content={content}
        initialMode={authMode}
        token={authToken}
        onBack={closeAccountView}
        onAuthenticated={() => {
          window.history.replaceState({}, "", window.location.pathname);
          setAccountView("profile");
        }}
      />
    );
  }

  if (accountView === "profile" && authStatus === "authenticated" && authUser) {
    return (
      <ProfileScreen
        content={content}
        onBack={closeAccountView}
        onEditDefaults={() => {
          setAccountView("none");
          openSetup(authProfile?.preferences);
        }}
        onLoggedOut={closeAccountView}
      />
    );
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
          onStart={() => openSetup(authProfile?.preferences)}
          accountLabel={authStatus === "authenticated" ? authProfile?.preferences?.playerOne || authUser?.first_name || "Mi perfil" : "Ingresar"}
          authenticated={authStatus === "authenticated"}
          onAccount={() => {
            setAuthMode("login");
            setAccountView(authStatus === "authenticated" ? "profile" : "auth");
          }}
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
          authenticated={authStatus === "authenticated"}
          onSaveDefaults={
            authStatus === "authenticated"
              ? async () => {
                  await savePreferences(serializeSetupPreferences(content, setup));
                }
              : undefined
          }
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
