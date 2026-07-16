interface RenderCardTemplateOptions {
  text: string;
  actorName: string;
  targetName: string;
  partnerName: string;
  playerOneName: string;
  playerTwoName: string;
}

export function personalizeCardText({
  text,
  actorName,
  targetName,
  partnerName,
  playerOneName,
  playerTwoName,
}: RenderCardTemplateOptions): string {
  const values: Record<string, string> = {
    actor: actorName,
    target: targetName,
    partner: partnerName,
    player1: playerOneName,
    player2: playerTwoName,
  };

  return text
    .replace(
      /\{\{(actor|target|partner|player1|player2)\}\}/g,
      (_, key: string) => values[key] || '',
    )
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim();
}
