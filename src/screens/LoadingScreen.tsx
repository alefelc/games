import { Icon } from '../components/Icon';

export function LoadingScreen({ message = 'Preparando el juego…' }: { message?: string }) {
  return (
    <main className="center-screen loading-screen">
      <div className="loading-mark"><Brand game={content.game} theme={content.theme} /></div>
      <div className="loading-ring" aria-hidden="true" />
      <p>{message}</p>
    </main>
  );
}
