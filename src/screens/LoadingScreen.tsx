import { Icon } from '../components/Icon';

export function LoadingScreen({
  message = 'Preparando el juego…',
}: {
  message?: string;
}) {
  return (
    <main className="center-screen loading-screen loading-screen-modern">
      <div className="loading-ambient" aria-hidden="true" />

      <div className="hero-emblem hero-emblem-animated loading-emblem">
        <Icon name="flame" className="hero-flame" />
      </div>

      <p className="eyebrow loading-eyebrow">
        CUANDO SE JUEGA, SE ENCIENDE
      </p>

      <div className="brand-wordmark loading-wordmark">
        <Icon name="flame" />
        <span>¿Te animás?</span>
      </div>

      <p className="loading-copy">{message}</p>

      <div className="loading-pulse" aria-label="Cargando">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
