import { Icon } from '../components/Icon';

export function ErrorScreen({
  message = 'No pudimos preparar el juego.',
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <main className="center-screen error-screen">
      <div className="error-icon"><Icon name="warning" /></div>
      <p className="eyebrow">NO SE PUDO INICIAR</p>
      <h1>Algo salió mal</h1>
      <p>{message}</p>
      <button className="primary-button" type="button" onClick={onRetry}>
        Volver a intentar
      </button>
    </main>
  );
}
