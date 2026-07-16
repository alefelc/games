import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Game Master v2.8.1', () => {
  it('muestra reacciones y estado de la IA', () => {
    const screen = readFileSync(
      'src/screens/GameScreen.tsx',
      'utf8',
    );

    expect(screen).toContain('¿Qué querés ahora?');
    expect(screen).toContain('Guía la próxima carta');
    expect(screen).toContain("session.gmProvider === 'openai'");
  });

  it('guarda el proveedor real de la decisión', () => {
    const engine = readFileSync(
      'src/engine/game-master.ts',
      'utf8',
    );

    expect(engine).toContain('provider: decision.provider');
    expect(engine).toContain("gmProvider: 'frontend_fallback'");
  });
});
