import { useState } from 'react';
import type { ContentBundle, ContentSource } from '../types';
import { Brand } from '../components/Brand';
import { Icon } from '../components/Icon';
import { TopBar } from '../components/TopBar';

export function HomeScreen({
  content,
  source,
  warning,
  onStart,
  onRefresh,
  refreshing,
}: {
  content: ContentBundle;
  source: ContentSource | null;
  warning: string | null;
  onStart: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [showRules, setShowRules] = useState(false);
  const publishedLevels = content.levels.length;
  const sourceLabel = source === 'network' ? 'Directus' : source === 'cache' ? 'Copia local' : 'Contenido inicial';

  if (showRules) {
    return (
      <div className="app-page">
        <TopBar content={content} onBack={() => setShowRules(false)} />
        <main className="narrow-page rules-page">
          <p className="eyebrow">REGLAS CLARAS, CERO PRESIÓN</p>
          <h1>Cómo se juega</h1>
          <div className="rule-grid">
            <article><span>01</span><h2>Preparen el momento</h2><p>Privacidad, comodidad y tiempo sin interrupciones.</p></article>
            <article><span>02</span><h2>Configuren límites</h2><p>Elijan niveles, prácticas, elementos y juguetes disponibles.</p></article>
            <article><span>03</span><h2>Alternen turnos</h2><p>Revelen una carta y decidan libremente si la cumplen.</p></article>
            <article><span>04</span><h2>Saltar no requiere explicación</h2><p>Ninguna carta es una obligación ni un compromiso previo.</p></article>
          </div>
          <div className="safety-panel"><Icon name="warning" /><div><b>{content.settings.stop_word} detiene todo</b><p>{content.settings.safety_text}</p></div></div>
          <button className="primary-button wide" type="button" onClick={() => setShowRules(false)}>Entendido</button>
        </main>
      </div>
    );
  }

  return (
    <div className="app-page home-page">
      <TopBar
        content={content}
        actions={
          <button className="icon-button" type="button" onClick={onRefresh} disabled={refreshing} aria-label="Actualizar contenido">
            <Icon name="refresh" className={refreshing ? 'spin' : ''} />
          </button>
        }
      />
      <main className="hero">
        <p className="eyebrow">{content.game.tagline || 'CUANDO SE JUEGA, SE ENCIENDE'}</p>
        <p className="hero-copy">{content.settings.intro_text}</p>

        <button className="start-button" type="button" onClick={onStart}>
          <span><b>Empezar a jugar</b></span>
          <Icon name="arrow" />
        </button>

        <div className="home-stats" aria-label="Contenido disponible">
          <div><b>{content.cards.length}</b><span>cartas</span></div>
          <div><b>{publishedLevels}</b><span>niveles</span></div>
          <div><b>{content.modes.length}</b><span>modos</span></div>
        </div>

        <button className="text-button" type="button" onClick={() => setShowRules(true)}>Cómo se juega</button>

        <div className="privacy-note"><Icon name="lock" /><span>{content.game.privacy_notice || 'La actividad de la partida queda en este dispositivo.'}</span></div>
      </main>
    </div>
  );
}
