import { Icon } from '../components/Icon';

export function LoadingScreen({ message = 'Preparando el juego…' }: { message?: string }) {
  return (
    <main className="center-screen loading-screen">
      <div className="loading-mark"><Icon name="flame" /></div>
      <div className="loading-ring" aria-hidden="true" />
      <h1>¿Te animás?</h1>
      <p>{message}</p>
    </main>
  );
}
