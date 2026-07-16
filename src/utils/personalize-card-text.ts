type SexSlug = string | null | undefined;

interface RenderCardTemplateOptions {
  text: string;
  actorName: string;
  targetName: string;
  partnerName: string;
  playerOneName: string;
  playerTwoName: string;
  currentPlayerName?: string;
  actorSex?: SexSlug;
  targetSex?: SexSlug;
  partnerSex?: SexSlug;
  playerOneSex?: SexSlug;
  playerTwoSex?: SexSlug;
  currentPlayerSex?: SexSlug;
}

function normalizedSex(value: SexSlug): 'hombre' | 'mujer' | null {
  const sex = value?.trim().toLocaleLowerCase('es');

  if (sex === 'hombre' || sex === 'masculino' || sex === 'male') {
    return 'hombre';
  }

  if (sex === 'mujer' || sex === 'femenino' || sex === 'female') {
    return 'mujer';
  }

  return null;
}

function objectPronoun(sex: SexSlug): string {
  const normalized = normalizedSex(sex);

  if (normalized === 'hombre') return 'lo';
  if (normalized === 'mujer') return 'la';

  return 'le';
}

function subjectPronoun(sex: SexSlug): string {
  const normalized = normalizedSex(sex);

  if (normalized === 'hombre') return 'él';
  if (normalized === 'mujer') return 'ella';

  return 'esa persona';
}

function possessivePronoun(sex: SexSlug): string {
  const normalized = normalizedSex(sex);

  if (normalized === 'hombre') return 'suyo';
  if (normalized === 'mujer') return 'suya';

  return 'de esa persona';
}

function resolveTargetAlternatives(
  value: string,
  targetSex: SexSlug,
): string {
  const pronoun = objectPronoun(targetSex);
  const female = normalizedSex(targetSex) === 'mujer';

  return value
    .replace(
      /\b([\p{L}]+)lo\s+o\s+\1la\b/giu,
      (_, stem: string) => `${stem}${pronoun}`,
    )
    .replace(
      /\b([\p{L}]+)la\s+o\s+\1lo\b/giu,
      (_, stem: string) => `${stem}${pronoun}`,
    )
    .replace(/\blo\s+o\s+la\b/giu, pronoun)
    .replace(/\bla\s+o\s+lo\b/giu, pronoun)
    .replace(
      /\bdesnudo\s+o\s+desnuda\b/giu,
      female ? 'desnuda' : 'desnudo',
    )
    .replace(
      /\binclinado\s+o\s+inclinada\b/giu,
      female ? 'inclinada' : 'inclinado',
    )
    .replace(
      /\bjuguetón\/a\b/giu,
      female ? 'juguetona' : 'juguetón',
    );
}

function cleanRenderedText(value: string): string {
  return value
    .replace(/\{\{[^{}]+\}\}/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/([¿¡])\s+/g, '$1')
    .trim();
}

export function personalizeCardText({
  text,
  actorName,
  targetName,
  partnerName,
  playerOneName,
  playerTwoName,
  currentPlayerName,
  actorSex,
  targetSex,
  partnerSex,
  playerOneSex,
  playerTwoSex,
  currentPlayerSex,
}: RenderCardTemplateOptions): string {
  const currentName = currentPlayerName || actorName;

  const values: Record<string, string> = {
    actor: actorName,
    target: targetName,
    partner: partnerName,
    pareja: partnerName,
    player1: playerOneName,
    player2: playerTwoName,
    current_player: currentName,
    currentplayer: currentName,
    current: currentName,

    actor_object: objectPronoun(actorSex),
    target_object: objectPronoun(targetSex),
    partner_object: objectPronoun(partnerSex),
    player1_object: objectPronoun(playerOneSex),
    player2_object: objectPronoun(playerTwoSex),
    current_player_object: objectPronoun(currentPlayerSex),

    actor_subject: subjectPronoun(actorSex),
    target_subject: subjectPronoun(targetSex),
    partner_subject: subjectPronoun(partnerSex),
    player1_subject: subjectPronoun(playerOneSex),
    player2_subject: subjectPronoun(playerTwoSex),

    actor_possessive: possessivePronoun(actorSex),
    target_possessive: possessivePronoun(targetSex),
  };

  const rendered = text.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_, rawKey: string) => {
      const key = rawKey.toLocaleLowerCase('es');
      return values[key] ?? '';
    },
  );

  return cleanRenderedText(
    resolveTargetAlternatives(
      rendered,
      targetSex,
    ),
  );
}
