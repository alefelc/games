import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type {
  ContentBundle,
  GameMasterReaction,
  GameSetup,
  Id,
  SessionState,
} from "../types";
import { Brand } from "../components/Brand";
import { Icon } from "../components/Icon";
import { personalizeCardText } from "../utils/personalize-card-text";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function readAnimationDuration(): number {
  const fallback = 320;

  try {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue("--pc-animation")
      .trim();

    if (value.endsWith("ms")) {
      return Number.parseFloat(value) || fallback;
    }

    if (value.endsWith("s")) {
      return (Number.parseFloat(value) || fallback / 1000) * 1000;
    }
  } catch {
    // Se usa la duración predeterminada.
  }

  return fallback;
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
  onReact,
  gameMasterBusy,
  onPause,
  onSetLevel,
}: {
  content: ContentBundle;
  setup: GameSetup;
  session: SessionState;
  onReveal: () => void;
  onResolve: (result: "completed" | "skipped") => void;
  onReact: (reaction: GameMasterReaction) => void;
  gameMasterBusy: boolean;
  onPause: () => void;
  onSetLevel: (levelId: Id) => void;
}) {
  const card =
    content.cards.find((item) => item.id === session.currentCardId) ?? null;

  const level = content.levels.find((item) => item.id === card?.level) ?? null;

  const mode =
    content.modes.find((item) => item.id === setup.modeId) ?? content.modes[0];

  const isSolo = mode?.slug === "solitario" || mode?.turn_mode === "single";
  const playerOneName = setup.playerOne || "Vos";
  const playerTwoName = isSolo ? playerOneName : setup.playerTwo || "Tu pareja";

  const playerOneSex =
    content.sexes.find((sex) => sex.id === setup.playerOneSexId)?.slug ?? null;

  const playerTwoSex = isSolo
    ? playerOneSex
    : (content.sexes.find((sex) => sex.id === setup.playerTwoSexId)?.slug ??
      null);

  const currentPlayerName = isSolo
    ? playerOneName
    : session.currentPlayer === 0
      ? playerOneName
      : playerTwoName;

  const partnerName = isSolo
    ? playerOneName
    : session.currentPlayer === 0
      ? playerTwoName
      : playerOneName;

  const currentPlayerSex = isSolo
    ? playerOneSex
    : session.currentPlayer === 0
      ? playerOneSex
      : playerTwoSex;

  const partnerSex = isSolo
    ? playerOneSex
    : session.currentPlayer === 0
      ? playerTwoSex
      : playerOneSex;

  const sexForRole = (
    role: string | undefined,
    explicitSexId: Id | null | undefined,
  ) => {
    const explicit =
      content.sexes.find((sex) => sex.id === explicitSexId)?.slug ?? null;

    if (explicit) return explicit;
    if (role === "current_player" || role === "self") return currentPlayerSex;
    if (role === "partner") return partnerSex;

    if (role === "both" && currentPlayerSex === partnerSex) {
      return currentPlayerSex;
    }

    return null;
  };

  const actorName =
    card?.performer === "self"
      ? currentPlayerName
      : card?.performer === "partner"
        ? partnerName
        : card?.performer === "both"
          ? `${currentPlayerName} y ${partnerName}`
          : currentPlayerName;

  const targetName =
    card?.target === "self"
      ? currentPlayerName
      : card?.target === "current_player"
        ? currentPlayerName
        : card?.target === "partner"
          ? partnerName
          : card?.target === "both"
            ? `${currentPlayerName} y ${partnerName}`
            : partnerName;

  const actorSex = sexForRole(card?.performer, card?.performer_sex);

  const targetSex = sexForRole(card?.target, card?.target_sex);

  const renderText = (text: string) =>
    personalizeCardText({
      text,
      actorName,
      targetName,
      partnerName,
      playerOneName,
      playerTwoName,
      currentPlayerName,
      playerName: playerOneName,
      actorSex,
      targetSex,
      partnerSex,
      playerOneSex,
      playerTwoSex,
      currentPlayerSex,
      playerSex: playerOneSex,
    });

  const personalizedCardText = card ? renderText(card.text) : "";

  const personalizedHostMessage = session.gmHostMessage
    ? renderText(session.gmHostMessage)
    : null;

  const gameMasterStatus =
    session.gmProvider === "openai"
      ? {
          label: "IA activa",
          detail: "La partida se adapta en tiempo real",
          tone: "online",
        }
      : session.gmProvider === "adaptive_fallback"
        ? {
            label: "Adaptación local",
            detail: "La conexión funciona, pero la IA no respondió",
            tone: "fallback",
          }
        : session.gmProvider === "frontend_fallback"
          ? {
              label: "Modo local",
              detail: "La partida continúa sin conexión adaptativa",
              tone: "offline",
            }
          : {
              label: "Dirección adaptativa activa",
              detail: "Preparando la siguiente decisión",
              tone: "pending",
            };

  const [timerRunning, setTimerRunning] = useState(false);
  const [remaining, setRemaining] = useState(card?.duration_seconds ?? 0);
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [visualRevealed, setVisualRevealed] = useState(session.revealed);
  const [isFlipping, setIsFlipping] = useState(false);
  const flipTimers = useRef<number[]>([]);

  useEffect(() => {
    flipTimers.current.forEach((timer) => window.clearTimeout(timer));
    flipTimers.current = [];

    setRemaining(card?.duration_seconds ?? 0);
    setTimerRunning(false);
    setVisualRevealed(session.revealed);
    setIsFlipping(false);

    return () => {
      flipTimers.current.forEach((timer) => window.clearTimeout(timer));
      flipTimers.current = [];
    };
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
            typeof navigator.vibrate === "function"
          ) {
            navigator.vibrate([100, 80, 180]);
          }

          return 0;
        }

        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning, remaining, content.settings.allow_vibration]);

  const requirements = useMemo(() => {
    if (!card) return [];

    const elements = content.cardElements
      .filter((row) => row.card === card.id)
      .map(
        (row) => content.elements.find((item) => item.id === row.element)?.name,
      )
      .filter(Boolean) as string[];

    const toys = content.cardToys
      .filter((row) => row.card === card.id)
      .map((row) => content.toys.find((item) => item.id === row.toy)?.name)
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
    if (!card || session.revealed || isFlipping) return;

    const duration = readAnimationDuration();
    const midpoint = Math.max(80, Math.round(duration / 2));

    setIsFlipping(true);

    flipTimers.current.push(
      window.setTimeout(() => {
        setVisualRevealed(true);
        onReveal();
      }, midpoint),
    );

    flipTimers.current.push(
      window.setTimeout(() => {
        setIsFlipping(false);
        flipTimers.current = [];
      }, duration + 40),
    );

    if (
      content.theme.enable_vibration &&
      content.settings.allow_vibration &&
      typeof navigator.vibrate === "function"
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
    mode.slug === "clasico" && mode.allow_manual_level_change;

  const showSettingsButton = canChangeLevel || setup.gameMasterEnabled;

  const responseTime =
    session.gmLatencyMs === null
      ? null
      : session.gmLatencyMs >= 1000
        ? `${(session.gmLatencyMs / 1000).toFixed(1)} s`
        : `${session.gmLatencyMs} ms`;

  const levelStyle = {
    "--level-color": level.color,
  } as CSSProperties;

  return (
    <div className="game-shell">
      <header className="game-header">
        <Brand game={content.game} theme={content.theme} compact />

        <div className="game-header-actions">
          {showSettingsButton && (
            <button
              className="icon-button"
              type="button"
              onClick={() => setShowLevelPicker((value) => !value)}
              aria-label="Ajustes de partida"
              aria-expanded={showLevelPicker}
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

      {showLevelPicker && showSettingsButton && (
        <div className="level-picker game-settings-menu">
          <div className="settings-menu-heading">
            <div>
              <b>Ajustes de partida</b>
              <span>Información y controles</span>
            </div>

            <button
              className="settings-menu-close"
              type="button"
              onClick={() => setShowLevelPicker(false)}
              aria-label="Cerrar ajustes"
            >
              <Icon name="close" />
            </button>
          </div>

          {setup.gameMasterEnabled && (
            <section className="settings-menu-section">
              <span className="settings-menu-label">Estado adaptativo</span>

              <div
                className={`adaptive-status ${gameMasterStatus.tone}`}
                aria-live="polite"
              >
                <span className="adaptive-status-dot" />

                <div className="adaptive-status-copy">
                  <b>{gameMasterStatus.label}</b>
                  <small>{gameMasterStatus.detail}</small>
                </div>
              </div>

              {(session.gmModel || responseTime) && (
                <dl className="adaptive-technical-data">
                  {session.gmModel && (
                    <>
                      <dt>Modelo</dt>
                      <dd>{session.gmModel}</dd>
                    </>
                  )}

                  {responseTime && (
                    <>
                      <dt>Respuesta</dt>
                      <dd>{responseTime}</dd>
                    </>
                  )}
                </dl>
              )}
            </section>
          )}

          {canChangeLevel && (
            <section className="settings-menu-section">
              <span className="settings-menu-label">
                Intensidad de la próxima carta
              </span>

              <div className="settings-level-list">
                {content.levels
                  .filter((item) => setup.levelIds.includes(item.id))
                  .map((item) => (
                    <button
                      key={item.id}
                      className={
                        session.currentLevelId === item.id ? "active" : ""
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
            </section>
          )}
        </div>
      )}

      <main className="game-main">
        <div className="game-meta">
          <div>
            <span className="level-pill" style={levelStyle}>
              {level.name}
            </span>
          </div>

          <div className="counter">
            <b>{session.resolvedCount + 1}</b>
            <span>/ {setup.maxCards}</span>
          </div>
        </div>

        <div className="progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>

        {setup.gameMasterEnabled && personalizedHostMessage && (
          <div className="game-master-message">
            <span>Ritmo de la partida</span>
            <p>{personalizedHostMessage}</p>
          </div>
        )}

        <button
          className="card-stage"
          type="button"
          onClick={reveal}
          aria-label={session.revealed ? "Carta revelada" : "Revelar carta"}
        >
          <article
            className={`playing-card ${
              isFlipping ? "flipping" : ""
            } ${visualRevealed ? "revealed" : ""}`}
            style={levelStyle}
          >
            {!visualRevealed ? (
              <div className="card-face card-back">
                <div className="card-logo">
                  <Brand game={content.game} theme={content.theme} />
                  <small>Tocá para revelar</small>
                </div>
              </div>
            ) : (
              <div className="card-face card-front">
                <p className="card-text">{personalizedCardText}</p>

                {card.instructions && (
                  <p className="card-instructions">{card.instructions}</p>
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
                  <img
                    src={`${import.meta.env.BASE_URL}te-animas-symbol.svg`}
                    alt=""
                    aria-hidden="true"
                    className="card-ornament-logo"
                    style={{
                      width: "clamp(1.65rem, 5vw, 2.15rem)",
                      height: "clamp(1.65rem, 5vw, 2.15rem)",
                      display: "block",
                      objectFit: "contain",
                      flexShrink: 0,
                    }}
                  />
                  <span />
                </div>
              </div>
            )}
          </article>
        </button>

        {session.revealed &&
          setup.gameMasterEnabled &&
          content.settings.game_master_show_reactions !== false && (
            <section className="game-master-feedback">
              <div className="game-master-feedback-heading">
                <b>¿Qué querés ahora?</b>
                <span>Guía la próxima carta</span>
              </div>

              <div
                className="game-master-reactions"
                aria-label="Cómo querés continuar"
              >
                {(
                  [
                    ["too_soft", "flameUp", "Más intenso", "intense"],
                    ["too_much", "moon", "Bajar", "soften"],
                    ["repeat_style", "hearts", "Más de esto", "continue"],
                    ["change_style", "dice", "Cambiar", "change"],
                  ] as const
                ).map(([reaction, icon, label, tone]) => (
                  <button
                    key={reaction}
                    type="button"
                    className={[
                      "reaction-button",
                      `reaction-${tone}`,
                      session.gmReaction === reaction ? "selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => onReact(reaction)}
                    disabled={gameMasterBusy}
                    aria-pressed={session.gmReaction === reaction}
                  >
                    <span className="reaction-icon">
                      <Icon name={icon} />
                    </span>
                    <span className="reaction-label">{label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

        {session.revealed &&
        card.duration_seconds &&
        content.settings.show_timer ? (
          <div className={`timer-panel ${remaining === 0 ? "finished" : ""}`}>
            <div>
              <b>{formatTime(remaining)}</b>
              <span>
                {remaining === 0 ? "Tiempo cumplido" : "Temporizador sugerido"}
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
                ? "Reiniciar"
                : timerRunning
                  ? "Pausar"
                  : "Iniciar"}
            </button>
          </div>
        ) : null}

        {session.revealed ? (
          <>
            {gameMasterBusy && (
              <div className="game-master-thinking">
                <span />
                Preparando la próxima carta…
              </div>
            )}

            <div className="game-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => onResolve("skipped")}
                disabled={gameMasterBusy}
              >
                Saltar
              </button>

              <button
                className="primary-button"
                type="button"
                onClick={() => onResolve("completed")}
                disabled={gameMasterBusy}
              >
                Cumplido
                <Icon name="check" />
              </button>
            </div>
          </>
        ) : (
          <p className="reveal-hint">
            La carta está oculta. Tocala cuando ambos estén listos.
          </p>
        )}

        <button className="stop-button" type="button" onClick={onPause}>
          <b>{content.settings.stop_word}</b>
          <span>Pausar sin explicar</span>
        </button>
      </main>
    </div>
  );
}
