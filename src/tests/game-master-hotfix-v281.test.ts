import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Game Master hotfix v2.8.1', () => {
  it('no queda activado por defecto', () => {
    const session = readFileSync(
      'src/engine/session.ts',
      'utf8',
    );

    expect(session).toContain(
      'gameMasterEnabled: false',
    );
  });

  it('comprueba disponibilidad antes de usarlo', () => {
    const api = readFileSync(
      'src/api/game-master.ts',
      'utf8',
    );

    expect(api).toContain(
      'checkGameMasterAvailability',
    );
    expect(api).toContain('2_200');
    expect(api).toContain('4_500');
  });

  it('mantiene el sorteo normal cuando está apagado', () => {
    const store = readFileSync(
      'src/store/useGameStore.ts',
      'utf8',
    );

    expect(store).toContain(
      'if (!setup.gameMasterEnabled)',
    );
    expect(store).toContain('drawNextCard');
  });

  it('evita una pantalla completamente vacía', () => {
    const main = readFileSync('src/main.tsx', 'utf8');

    expect(main).toContain('AppErrorBoundary');
  });
});
