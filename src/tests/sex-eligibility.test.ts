import { describe, expect, it } from 'vitest';
import { isCardEligible } from '../engine/eligibility';
import type { Card, EligibilityContext } from '../types';

const MAN = 'man';
const WOMAN = 'woman';

const baseCard = {
  id: 'card',
  status: 'published',
  level: 'level',
  minimum_players: 2,
  maximum_players: 2,
  performer: 'current_player',
  target: 'partner',
  performer_sex: null,
  target_sex: null,
} as Card;

const indexes = {
  decksByCard: new Map([['card', ['deck']]]),
  elementsByCard: new Map(),
  toysByCard: new Map(),
};

const context = {
  selectedLevelIds: new Set(['level']),
  selectedDeckIds: new Set(['deck']),
  selectedElementIds: new Set(),
  selectedToyIds: new Set(),
  filters: {
    excludePhotoVideo: false,
    excludeThirdParties: false,
    excludePublicPlaces: false,
    excludeRestraint: false,
    excludePenetration: false,
    excludeOral: false,
    excludeNudity: false,
    excludeExplicitLanguage: false,
    excludeFood: false,
    excludeTemperature: false,
    excludeRoleplay: false,
    excludeManualStimulation: false,
    excludeToys: false,
    maxPrivacyRisk: 3,
    maxPhysicalRisk: 3,
  },
  currentPlayerSexId: MAN,
  partnerSexId: WOMAN,
} as EligibilityContext;

describe('sexo de jugadores', () => {
  it('acepta una carta ordenada hombre → mujer', () => {
    expect(
      isCardEligible(
        {
          ...baseCard,
          performer_sex: MAN,
          target_sex: WOMAN,
        },
        context,
        indexes,
      ),
    ).toBe(true);
  });

  it('rechaza una carta ordenada cuando los sexos no coinciden', () => {
    expect(
      isCardEligible(
        {
          ...baseCard,
          performer_sex: WOMAN,
          target_sex: MAN,
        },
        context,
        indexes,
      ),
    ).toBe(false);
  });

  it('acepta una carta mutua sin importar quién tenga el turno', () => {
    expect(
      isCardEligible(
        {
          ...baseCard,
          performer: 'both',
          target: 'both',
          performer_sex: WOMAN,
          target_sex: MAN,
        },
        context,
        indexes,
      ),
    ).toBe(true);
  });
});
