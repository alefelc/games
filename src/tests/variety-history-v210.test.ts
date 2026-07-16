import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('variedad persistente e intensidad v2.10.0', () => {
  it('recuerda cartas, prácticas y anatomías entre partidas', () => {
    const history = readFileSync(
      'src/engine/card-history.ts',
      'utf8',
    );
    const request = readFileSync(
      'src/api/game-master.ts',
      'utf8',
    );

    expect(history).toContain('continuityGroup');
    expect(history).toContain('anatomyFocus');
    expect(request).toContain('recently_seen_groups');
    expect(request).toContain('recently_seen_anatomy');
  });

  it('sube varios niveles y conserva la reacción en el modo local', () => {
    const session = readFileSync(
      'src/engine/session.ts',
      'utf8',
    );
    const director = readFileSync(
      'src/engine/game-master.ts',
      'utf8',
    );

    expect(session).toContain(
      'Math.min(4, 2 + recentRequests)',
    );
    expect(director).toContain(
      "resolvedEvent?.reaction === 'too_soft'",
    );
    expect(director).not.toContain(
      'const local = drawNextCard(content, setup, session)',
    );
  });
});
