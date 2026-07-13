import type { ContentBundle, GameSetup, SessionState } from '../types';
import { Brand } from '../components/Brand';
import { Icon } from '../components/Icon';

function duration(startedAt: string, endedAt: string | null) {
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const minutes = Math.max(1, Math.round((end - new Date(startedAt).getTime()) / 60000));
  return `${minutes} min`;
}

export function SummaryScreen({
  content,
  setup,
  session,
  onRestart,
  onHome,
}: {
  content: ContentBundle;
  setup: GameSetup;
  session: SessionState | null;
  onRestart: () => void;
  onHome: () => void;
}) {
  return (
    <main className="center-screen summary-screen">
      <div className="summary-brand"><Brand game={content.game} theme={content.theme} /></div>
      <p className="eyebrow">PARTIDA FINALIZADA</p>
      <h1>Lo importante no era completar todo</h1>
      <p>Era elegir juntos, respetar límites y disfrutar sin presión.</p>

      {session && (
        <div className="summary-stats">
          <div><b>{session.completedCardIds.length}</b><span>cumplidas</span></div>
          <div><b>{session.skippedCardIds.length}</b><span>saltadas</span></div>
          <div><b>{duration(session.startedAt, session.endedAt)}</b><span>duración</span></div>
        </div>
      )}

      <div className="summary-note"><Icon name="lock" /><span>Este resumen desaparecerá al iniciar otra partida.</span></div>
      <div className="summary-actions">
        <button className="primary-button wide" type="button" onClick={onRestart}>Configurar otra partida <Icon name="refresh" /></button>
        <button className="text-button" type="button" onClick={onHome}>Volver al inicio</button>
      </div>
      <small>{setup.playerOne || 'Vos'} y {setup.playerTwo || 'tu pareja'} · versión {content.release.version}</small>
    </main>
  );
}
