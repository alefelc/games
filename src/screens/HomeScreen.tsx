import { useState } from "react";
import type { ContentBundle } from "../types";
import { Brand } from "../components/Brand";
import { Icon } from "../components/Icon";
import { TopBar } from "../components/TopBar";

export function HomeScreen({
  content,
  onStart,
  onRefresh,
  refreshing,
  onAccount,
  accountLabel,
  authenticated,
}: {
  content: ContentBundle;
  onStart: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  onAccount: () => void;
  accountLabel: string;
  authenticated: boolean;
}) {
  const [showRules, setShowRules] = useState(false);
  const publishedLevels = content.levels.length;

  if (showRules) {
    return (
      <div className="app-page">
        <TopBar content={content} onBack={() => setShowRules(false)} />
        <main className="narrow-page rules-page">
          <p className="eyebrow">REGLAS CLARAS, CERO PRESIÓN</p>
          <h1>Cómo se juega</h1>
          <div className="rule-grid">
            <article>
              <span>01</span>
              <h2>Preparen el momento</h2>
              <p>Privacidad, comodidad y tiempo sin interrupciones.</p>
            </article>
            <article>
              <span>02</span>
              <h2>Configuren límites</h2>
              <p>
                Elijan niveles, prácticas, elementos y juguetes disponibles.
              </p>
            </article>
            <article>
              <span>03</span>
              <h2>Revelá cada carta</h2>
              <p>
                Seguí la propuesta o saltala libremente. En pareja, el turno
                cambia automáticamente.
              </p>
            </article>
            <article>
              <span>04</span>
              <h2>Saltar no requiere explicación</h2>
              <p>Ninguna carta es una obligación ni un compromiso previo.</p>
            </article>
          </div>
          <div className="safety-panel">
            <Icon name="warning" />
            <div>
              <b>{content.settings.stop_word} detiene todo</b>
              <p>{content.settings.safety_text}</p>
            </div>
          </div>
          <button
            className="primary-button wide"
            type="button"
            onClick={() => setShowRules(false)}
          >
            Entendido
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="app-page home-page">
      <TopBar
        content={content}
        actions={
          <>
            <button
              className={`account-button ${authenticated ? "authenticated" : ""}`}
              type="button"
              onClick={onAccount}
              aria-label={authenticated ? "Abrir mi perfil" : "Ingresar o crear cuenta"}
            >
              <Icon name={authenticated ? "check" : "lock"} />
              <span>{accountLabel}</span>
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Actualizar contenido"
            >
              <Icon name="refresh" className={refreshing ? "spin" : ""} />
            </button>
          </>
        }
      />
      <main className="hero">
        <div className="hero-emblem hero-emblem-animated">
          <Icon name="flame" className="hero-flame" />
        </div>
        <p className="eyebrow">
          {content.game.tagline || "CUANDO SE JUEGA, SE ENCIENDE"}
        </p>
        <Brand game={content.game} theme={content.theme} />
        <p className="hero-copy">{content.settings.intro_text}</p>

        <button className="start-button" type="button" onClick={onStart}>
          <span>
            <small>PARTIDA PERSONALIZADA</small>
            <b>Empezar a jugar</b>
          </span>
          <Icon name="arrow" />
        </button>

        {!authenticated && (
          <button className="account-promo" type="button" onClick={onAccount}>
            <Icon name="lock" />
            <span><b>Guardá tus preferencias</b><small>Creá una cuenta y evitá configurar cada partida.</small></span>
            <Icon name="arrow" />
          </button>
        )}

        <div className="home-stats" aria-label="Contenido disponible">
          <div>
            <b>{content.cards.length}</b>
            <span>cartas</span>
          </div>
          <div>
            <b>{publishedLevels}</b>
            <span>niveles</span>
          </div>
          <div>
            <b>{content.modes.length}</b>
            <span>modos</span>
          </div>
        </div>

        <button
          className="text-button"
          type="button"
          onClick={() => setShowRules(true)}
        >
          Cómo se juega
        </button>

        <div className="privacy-note">
          <Icon name="lock" />
          <span>
            {content.game.privacy_notice ||
              "Las partidas quedan en este dispositivo; al iniciar sesión solo se sincronizan tus preferencias guardadas."}
          </span>
        </div>
      </main>
    </div>
  );
}
