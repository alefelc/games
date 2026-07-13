import { Icon } from '../components/Icon';

export function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <main className="center-screen error-screen">
      <div className="error-icon"><Icon name="warning" /></div>
      <p className="eyebrow">NO SE PUDO INICIAR</p>
      <h1>Hay un problema con el contenido</h1>
      <p>{error}</p>
      <button className="primary-button" type="button" onClick={onRetry}>Reintentar</button>
      {/*<small>La aplicación no utiliza un token privado. Directus debe permitir lectura pública de las colecciones del juego.</small>*/}
    </main>
  );
}
