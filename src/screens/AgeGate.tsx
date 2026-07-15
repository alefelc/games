import { useState } from 'react';
import type { ContentBundle } from '../types';
import { Brand } from '../components/Brand';
import { Icon } from '../components/Icon';

export function AgeGate({ content, onAccept }: { content: ContentBundle; onAccept: () => void }) {
  const [adult, setAdult] = useState(false);
  const [consent, setConsent] = useState(false);
  const minimumAge = content.game.minimum_age || 18;

  return (
    <main className="center-screen age-screen">
      <Brand game={content.game} theme={content.theme} />
      <p className="eyebrow">ACCESO PARA PERSONAS ADULTAS</p>
      <h1>Antes de entrar</h1>
      <p className="lead">Este juego contiene lenguaje y propuestas sexuales explícitas. No está diseñado para menores.</p>

      <div className="consent-box">
        <label className="check-row">
          <input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} />
          <span><b>Tengo {minimumAge} años o más</b><small>Confirmo que puedo acceder legalmente a contenido para adultos.</small></span>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span><b>Entiendo la regla central</b><small>Cualquier carta puede saltarse. “{content.settings.stop_word}” detiene todo inmediatamente.</small></span>
        </label>
      </div>

      <button className="primary-button wide" type="button" disabled={!adult || !consent} onClick={onAccept}>
        Entrar al juego <Icon name="arrow" />
      </button>
      <div className="privacy-inline"><Icon name="lock" /><span>No se guardan respuestas, fotos ni videos fuera de este dispositivo.</span></div>
    </main>
  );
}
