import { describe, expect, it } from 'vitest';
import type { Card, ContentBundle, EligibilityContext } from '../types';
import { buildEligibilityIndexes, isCardEligible } from '../engine/eligibility';

const card: Card = {
  id: 'card-1', game: 'game', level: 'level-1', status: 'published', sort: 1, code: 'TEST', title: null,
  text: 'Carta de prueba', instructions: null, card_type: 'challenge', original_deck: null, duration_seconds: null,
  weight: 100, intensity: 1, minimum_players: 2, maximum_players: 2, performer: 'current_player', target: 'partner',
  allow_skip: true, requires_confirmation: false, safety_note: null, privacy_risk: 0, physical_risk: 0,
  gender_scope: 'neutral', language: 'es-AR', contains_oral: false, contains_penetration: false,
  contains_restraint: false, contains_food: false, contains_temperature: false, contains_public_place: false,
  contains_third_parties: false, contains_photo: false, contains_video: false, contains_nudity: false,
  contains_roleplay: false, contains_toy: false, contains_manual_stimulation: false, contains_explicit_language: false,
  requires_device: false, requires_private_space: false,
};

const emptyContent = {
  deckCards: [{ id: 'dc', deck: 'deck-1', card: 'card-1', sort: 1, enabled: true }],
  cardElements: [], cardToys: [],
} as unknown as ContentBundle;

const context: EligibilityContext = {
  selectedLevelIds: new Set(['level-1']), selectedDeckIds: new Set(['deck-1']), selectedElementIds: new Set(), selectedToyIds: new Set(),
  filters: {
    excludePhotoVideo: true, excludeThirdParties: true, excludePublicPlaces: true, excludeRestraint: false,
    excludePenetration: false, excludeOral: false, excludeNudity: false, excludeExplicitLanguage: false,
    excludeFood: false, excludeTemperature: false, excludeRoleplay: false, excludeManualStimulation: false,
    excludeToys: false, maxPrivacyRisk: 1, maxPhysicalRisk: 1,
  },
};

describe('eligibilidad de cartas', () => {
  it('acepta una carta compatible', () => {
    expect(isCardEligible(card, context, buildEligibilityIndexes(emptyContent))).toBe(true);
  });

  it('bloquea fotos cuando el filtro está activo', () => {
    expect(isCardEligible({ ...card, contains_photo: true }, context, buildEligibilityIndexes(emptyContent))).toBe(false);
  });

  it('exige elementos marcados como required', () => {
    const content = {
      ...emptyContent,
      cardElements: [{ id: 'ce', card: 'card-1', element: 'hielo', requirement: 'required', quantity: 1, preparation_note: null, sort: 1 }],
    } as unknown as ContentBundle;
    const indexes = buildEligibilityIndexes(content);
    expect(isCardEligible(card, context, indexes)).toBe(false);
    expect(isCardEligible(card, { ...context, selectedElementIds: new Set(['hielo']) }, indexes)).toBe(true);
  });
});
