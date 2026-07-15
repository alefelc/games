import type { ContentBundle } from '../types';
import { Icon } from '../components/Icon';

export function PauseScreen({ content, onResume, onFinish }: { content: ContentBundle; onResume: () => void; onFinish: () => void }) {
  return (
    <main className="center-screen pause-screen">
      <div className="pause-mark"><Icon name="pause" /></div>
      <p className="eyebrow">{content.settings.stop_word}</p>
      <h1>La partida está pausada</h1>
      <p>No se continúa hasta que ambos quieran. No hace falta justificar la pausa ni negociar en este momento.</p>
      <div className="pause-actions">
        <button className="primary-button wide" type="button" onClick={onResume}>Ambos queremos continuar</button>
        <button className="secondary-button wide" type="button" onClick={onFinish}>Terminar la partida</button>
      </div>
    </main>
  );
}
