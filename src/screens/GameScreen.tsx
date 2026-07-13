import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ContentBundle, GameSetup, Id, SessionState } from '../types';
import { Brand } from '../components/Brand';
import { Icon } from '../components/Icon';

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    // Algunos navegadores iOS no implementan Fullscreen API para páginas normales.
  }
}

export function GameScreen({
  content,
  setup,
  session,
  onReveal,
  onResolve,
  onPause,
  onSetLevel,
}: {
  content: ContentBundle;
  setup: GameSetup;
  session: SessionState;
  onReveal: () => void;
  onResolve: (result: 'completed' | 'skipped') => void;
  onPause: () => void;
  onSetLevel: (levelId: Id) => void;
}) {
  const card =
    content.cards.find((item) => item.id === session.currentCardId) ?? null;

  const level =
    content.levels.find((item) => item.id === card?.level) ?? null;

  const mode =
    content.modes.find((item) => item.id === setup.modeId) ??
    content.modes[0];

  const player =
    session.currentPlayer === 0
      ? setup.playerOne || 'Vos'
      : setup.playerTwo || 'Tu pareja';

  const [timerRunning, setTimerRunning] = useState(false);
  const [remaining, setRemaining] = useState(card?.duration_seconds ?? 0);
  const [showLevelPicker, setShowLevelPicker] = useState(false);

  useEffect(() => {
    setRemaining(card?.duration_seconds ?? 0);
    setTimerRunning(false);
  }, [card?.id, card?.duration_seconds]);

  useEffect(() => {
    if (!timerRunning || remaining <= 0) return;

    const interval = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(interval);
          setTimerRunning(false);

          if (
            content.settings.allow_vibration &&
            typeof navigator.vibrate === 'function'
          ) {
            navigator.vibrate([100, 80, 180]);
          }

          return 0;
        }

        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [
    timerRunning,
    remaining,
    content.settings.allow_vibration,
  ]);

  const requirements = useMemo(() => {
    if (!card) return [];

    const elements = content.cardElements
      .filter((row) => row.card === card.id)
      .map(
        (row) =>
          content.elements.find((item) => item.id === row.element)?.name,
      )
      .filter(Boolean) as string[];

    const toys = content.cardToys
      .filter((row) => row.card === card.id)
      .map(
        (row) =>
          content.toys.find((item) => item.id === row.toy)?.name,
      )
      .filter(Boolean) as string[];

    return [...elements, ...toys];
  }, [
    card,
    content.cardElements,
    content.cardToys,
    content.elements,
    content.toys,
  ]);

  const reveal = () => {
    if (!card || session.revealed) return;

    onReveal();

    if (
      content.theme.enable_vibration &&
      content.settings.allow_vibration &&
      typeof navigator.vibrate === 'function'
    ) {
      navigator.vibrate(35);
    }
  };

  if (!card || !level || !mode) return null;

  const progress = Math.min(
    100,
    (session.resolvedCount / setup.maxCards) * 100,
  );

  const canChangeLevel =
    mode.slug === 'clasico' &&
    mode.allow_manual_level_change;

  const levelStyle = {
    '--level-color': level.color,
  } as CSSProperties;

  return (
    <div className="game-shell">
      <header className="game-header">
        <Brand
          game={content.game}
          theme={content.theme}
          compact
        />

        <div className="game-header-actions">
          {canChangeLevel && (
            <button
              className="icon-button"
              type="button"
              onClick={() =>
                setShowLevelPicker((value) => !value)
              }
              aria-label="Cambiar nivel"
            >
              <Icon name="settings" />
            </button>
          )}

          {content.settings.allow_fullscreen && (
            <button
              className="icon-button"
              type="button"
              onClick={toggleFullscreen}
              aria-label="Pantalla completa"
            >
              <Icon name="fullscreen" />
            </button>
          )}
        </div>
      </header>

      {showLevelPicker && canChangeLevel && (
        <div className="level-picker">
          <span>Próxima carta:</span>

          {content.levels
            .filter((item) => setup.levelIds.includes(item.id))
            .map((item) => (
              <button
                key={item.id}
                className={
                  session.currentLevelId === item.id ? 'active' : ''
                }
                type="button"
                onClick={() => {
                  onSetLevel(item.id);
                  setShowLevelPicker(false);
                }}
              >
                {item.name}
              </button>
            ))}
        </div>
      )}

      <main className="game-main">
        <div className="game-meta">
          <div>
            <span
              className="level-pill"
              style={levelStyle}
            >
              {level.name}
            </span>

            <p>
              Turno de <b>{player}</b>
            </p>
          </div>

          <div className="counter">
            <b>{session.resolvedCount + 1}</b>
            <span>/ {setup.maxCards}</span>
          </div>
        </div>

        <div className="progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>

        <button
          className="card-stage"
          type="button"
          onClick={reveal}
          aria-label={
            session.revealed
              ? 'Carta revelada'
              : 'Revelar carta'
          }
        >
          <article
            className={`playing-card ${
              session.revealed ? 'revealed' : ''
            }`}
            style={levelStyle}
          >
            <div className="card-face card-back">
              <div className="card-logo">
                <Brand
                  game={content.game}
                  theme={content.theme}
                />
                <small>Tocá para revelar</small>
              </div>
            </div>

            <div className="card-face card-front">
              <p className="card-text">{card.text}</p>

              {card.instructions && (
                <p className="card-instructions">
                  {card.instructions}
                </p>
              )}

              {requirements.length > 0 && (
                <div className="requirement-chips">
                  {requirements.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              )}

              {card.safety_note && (
                <div className="card-safety">
                  <Icon name="info" />
                  {card.safety_note}
                </div>
              )}

              <div className="card-ornament">
                <span />
                <Icon name="flame" />
                <span />
              </div>
            </div>
          </article>
        </button>

        {session.revealed &&
        card.duration_seconds &&
        content.settings.show_timer ? (
          <div
            className={`timer-panel ${
              remaining === 0 ? 'finished' : ''
            }`}
          >
            <div>
              <b>{formatTime(remaining)}</b>
              <span>
                {remaining === 0
                  ? 'Tiempo cumplido'
                  : 'Temporizador sugerido'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (remaining === 0) {
                  setRemaining(card.duration_seconds ?? 0);
                }

                setTimerRunning((value) => !value);
              }}
            >
              {remaining === 0
                ? 'Reiniciar'
                : timerRunning
                  ? 'Pausar'
                  : 'Iniciar'}
            </button>
          </div>
        ) : null}

        {session.revealed ? (
          <div className="game-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => onResolve('skipped')}
            >
              Saltar
            </button>

            <button
              className="primary-button"
              type="button"
              onClick={() => onResolve('completed')}
            >
              Cumplido
              <Icon name="check" />
            </button>
          </div>
        ) : (
          <p className="reveal-hint">
            La carta está oculta. Tocala cuando ambos estén listos.
          </p>
        )}

        <button
          className="stop-button"
          type="button"
          onClick={onPause}
        >
          <b>{content.settings.stop_word}</b>
          <span>Pausar sin explicar</span>
        </button>
      </main>
    </div>
  );
}
