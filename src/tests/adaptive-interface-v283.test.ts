import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('interfaz adaptativa v2.8.3', () => {
  it('ubica el estado técnico dentro del menú de ajustes', () => {
    const game = readFileSync(
      'src/screens/GameScreen.tsx',
      'utf8',
    );

    const cardStage = game.indexOf('className="card-stage"');
    const status = game.indexOf('className={`adaptive-status');

    expect(status).toBeGreaterThan(0);
    expect(status).toBeLessThan(cardStage);
    expect(game).not.toContain('game-master-status');
  });

  it('no muestra la expresión eliminada en las pantallas', () => {
    const files = [
      'src/App.tsx',
      'src/screens/GameScreen.tsx',
      'src/screens/SetupScreen.tsx',
      'src/screens/LoadingScreen.tsx',
    ];

    const source = files
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    expect(source).not.toMatch(/Game Master/i);
  });

  it('reemplaza el spinner antiguo por la carga actual', () => {
    const loading = readFileSync(
      'src/screens/LoadingScreen.tsx',
      'utf8',
    );

    expect(loading).toContain('loading-wordmark');
    expect(loading).toContain('hero-emblem-animated');
    expect(loading).not.toContain('loading-ring');
  });
});
