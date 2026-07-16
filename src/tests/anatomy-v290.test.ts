import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('compatibilidad anatómica v2.9.0', () => {
  it('lee y envía los campos anatómicos', () => {
    const content = readFileSync(
      'src/api/content-api.ts',
      'utf8',
    );
    const request = readFileSync(
      'src/api/game-master.ts',
      'utf8',
    );

    expect(content).toContain('anatomy_focus');
    expect(content).toContain('penetration_method');
    expect(request).toContain('current_player_sex');
    expect(request).toContain('selected_toy_slugs');
  });

  it('respeta quién realiza y quién recibe', () => {
    const eligibility = readFileSync(
      'src/engine/eligibility.ts',
      'utf8',
    );
    const screen = readFileSync(
      'src/screens/GameScreen.tsx',
      'utf8',
    );

    expect(eligibility).toContain(
      "role === 'partner'",
    );
    expect(eligibility).toContain(
      "role === 'both'",
    );
    expect(screen).toContain(
      "card?.performer === 'partner'",
    );
  });
});
