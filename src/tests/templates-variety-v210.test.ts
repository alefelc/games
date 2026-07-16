import { describe, expect, it } from 'vitest';
import { personalizeCardText } from '../utils/personalize-card-text';

it('reemplaza variables sin prefijos automáticos', () => {
  expect(personalizeCardText({
    text: '{{target}} elige cómo quiere acabar y vos te dedicás a lograrlo.',
    actorName: 'Ale', targetName: 'Ann', partnerName: 'Ann',
    playerOneName: 'Ale', playerTwoName: 'Ann',
  })).toBe('Ann elige cómo quiere acabar y vos te dedicás a lograrlo.');
});

it('integra ambos nombres una sola vez', () => {
  const value = personalizeCardText({
    text: 'Primero {{player1}} masajea a {{player2}}; después cambian.',
    actorName: 'Ale', targetName: 'Ann', partnerName: 'Ann',
    playerOneName: 'Ale', playerTwoName: 'Ann',
  });
  expect(value).toBe('Primero Ale masajea a Ann; después cambian.');
  expect(value).not.toContain('Ale y Ann se dedica');
});
