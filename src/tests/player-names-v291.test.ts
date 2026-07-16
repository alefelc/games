import { describe, expect, it } from 'vitest';
import { personalizeCardText } from '../utils/personalize-card-text';

describe('plantillas nominales', () => {
  it('reemplaza nombres dentro del texto', () => {
    expect(personalizeCardText({ text: 'Hacé acabar a {{target}}.', actorName: 'Ale', targetName: 'Ann', partnerName: 'Ann', playerOneName: 'Ale', playerTwoName: 'Ann' })).toBe('Hacé acabar a Ann.');
  });
});
