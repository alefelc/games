import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const types = readFileSync('src/types.ts', 'utf8');
const store = readFileSync('src/store/useGameStore.ts', 'utf8');
const setup = readFileSync('src/screens/SetupScreen.tsx', 'utf8');
const game = readFileSync('src/screens/GameScreen.tsx', 'utf8');
const api = readFileSync('src/api/game-master.ts', 'utf8');

describe('Game Master v2.8.0', () => {
  it('mantiene los límites fuera del modelo', () => {
    expect(store).toContain('drawAdaptiveCard');
    expect(api).toContain('candidates: candidates');
    expect(types).toContain('gameMasterEnabled');
  });

  it('permite activar el Game Master y reaccionar', () => {
    expect(setup).toContain('Dirección adaptativa');
    expect(game).toContain('Más intenso');
    expect(game).toContain('Bajar');
    expect(game).toContain('Más de esto');
    expect(game).toContain('Cambiar');
    expect(game).not.toContain('Me gustó');
  });
});
