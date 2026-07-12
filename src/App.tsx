import { useCallback, useEffect, useState } from 'react';
import { loadContent } from './api/content-loader';
import { useGameStore } from './store/useGameStore';
import { applyTheme } from './theme/applyTheme';
import { LoadingScreen } from './screens/LoadingScreen';
import { ErrorScreen } from './screens/ErrorScreen';
import { AgeGate } from './screens/AgeGate';
import { HomeScreen } from './screens/HomeScreen';
import { SetupScreen } from './screens/SetupScreen';
import { GameScreen } from './screens/GameScreen';
import { PauseScreen } from './screens/PauseScreen';
import { SummaryScreen } from './screens/SummaryScreen';

export default function App() {
  const store = useGameStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await loadContent({ force });
      store.setContent(result.bundle, result.source, result.warning);
      applyTheme(result.bundle.theme, result.bundle.game);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error desconocido al cargar el contenido.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [store]);

  useEffect(() => { void refresh(false); }, [refresh]);

  useEffect(() => {
    if (store.stage !== 'game' || !store.content?.settings.allow_screen_wake_lock) return;
    if (!('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen');
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
  }, [store.stage, store.content?.settings.allow_screen_wake_lock]);

  if (loading || !store.content) {
    if (error) return <ErrorScreen error={error} onRetry={() => void refresh(true)} />;
    return <LoadingScreen />;
  }

  const content = store.content;
  if (content.settings.maintenance_mode) {
    return <ErrorScreen error="El juego está temporalmente en mantenimiento desde el panel de administración." onRetry={() => void refresh(true)} />;
  }

  switch (store.stage) {
    case 'age':
      return <AgeGate content={content} onAccept={store.acceptAge} />;
    case 'home':
      return (
        <HomeScreen
          content={content}
          source={store.contentSource}
          warning={store.contentWarning}
          onStart={store.openSetup}
          onRefresh={() => void refresh(true)}
          refreshing={refreshing}
        />
      );
    case 'setup':
      return store.setup ? (
        <SetupScreen
          content={content}
          setup={store.setup}
          onBack={store.goHome}
          onStart={store.startGame}
          updateSetup={store.updateSetup}
          updateFilters={store.updateFilters}
        />
      ) : <LoadingScreen />;
    case 'game':
      return store.setup && store.session ? (
        <GameScreen
          content={content}
          setup={store.setup}
          session={store.session}
          onReveal={store.revealCard}
          onResolve={store.resolveCard}
          onPause={store.pause}
          onSetLevel={store.setCurrentLevel}
        />
      ) : <LoadingScreen />;
    case 'paused':
      return <PauseScreen content={content} onResume={store.resume} onFinish={store.finish} />;
    case 'summary':
      return store.setup ? (
        <SummaryScreen
          content={content}
          setup={store.setup}
          session={store.session}
          onRestart={store.restart}
          onHome={store.goHome}
        />
      ) : <LoadingScreen />;
    default:
      return <LoadingScreen />;
  }
}
