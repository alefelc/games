import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('giro de una sola cara', () => {
  it('renderiza solo una cara a la vez', () => {
    const source = readFileSync(
      'src/screens/GameScreen.tsx',
      'utf8',
    );

    expect(source).toContain(
      "!visualRevealed ? (",
    );
    expect(source).toContain(
      "isFlipping ? 'flipping' : ''",
    );
    expect(source).not.toContain(
      "show-card-front",
    );
  });

  it('usa una animación sin ocultar las dos caras', () => {
    const css = readFileSync('src/styles.css', 'utf8');

    expect(css).toContain('card-single-face-flip');
    expect(css).not.toContain('hide-card-back');
    expect(css).not.toContain('show-card-front');
  });
});
