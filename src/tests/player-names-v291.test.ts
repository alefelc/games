import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { personalizeCardText } from '../utils/personalize-card-text';

describe('nombres dentro de las cartas v2.9.1', () => {
  it('integra quien actúa y quien recibe', () => {
    expect(
      personalizeCardText({
        text:
          'Tenés 10 segundos para calentarme sin tocarme.',
        actorName: 'Ale',
        targetName: 'Sofía',
        hasExplicitTarget: true,
      }),
    ).toContain('Ale');

    expect(
      personalizeCardText({
        text:
          'Tenés 10 segundos para calentarme sin tocarme.',
        actorName: 'Ale',
        targetName: 'Sofía',
        hasExplicitTarget: true,
      }),
    ).toContain('Sofía');
  });

  it('personaliza preguntas sobre la pareja', () => {
    expect(
      personalizeCardText({
        text:
          '¿Qué parte de mi cuerpo te calienta más?',
        actorName: 'Ale',
        targetName: 'Sofía',
      }),
    ).toBe(
      'Ale, ¿Qué parte del cuerpo de Sofía te calienta más?',
    );
  });

  it('usa una dirección clara cuando el texto no nombra al objetivo', () => {
    expect(
      personalizeCardText({
        text:
          'Chupale la pija durante un minuto.',
        actorName: 'Ale',
        targetName: 'Bruno',
        hasExplicitTarget: true,
      }),
    ).toBe(
      'Ale → Bruno: chupale la pija durante un minuto.',
    );
  });

  it('elimina el encabezado separado del nombre', () => {
    const screen = readFileSync(
      'src/screens/GameScreen.tsx',
      'utf8',
    );

    expect(screen).not.toContain(
      'className="card-player-name"',
    );
    expect(screen).toContain(
      '{personalizedCardText}',
    );
  });
});
