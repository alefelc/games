interface GamePaceMessageInput {
  hostMessage?: string | null;
  cardText?: string | null;
  phase?: string | null;
  strategy?: string | null;
}

const STRATEGY_MESSAGES: Record<string, string> = {
  continue_scene: "Ritmo sostenido: la escena puede seguir avanzando.",
  escalate: "La intensidad empieza a subir.",
  slow_down: "Una pausa breve antes de volver a subir.",
  balance_players: "Es momento de cambiar el protagonismo.",
  intimate_question: "Más conexión, menos apuro.",
  humor_break: "Un respiro para aflojar la tensión y volver al juego.",
  change_style: "Cambio de dinámica para mantener la sorpresa.",
  prepare_climax: "La partida se acerca a su punto más intenso.",
  close_session: "La partida entra en su tramo final.",
};

const PHASE_MESSAGES: Record<string, string> = {
  warmup: "Inicio suave: la tensión empieza a crecer.",
  build: "La intensidad empieza a subir.",
  intimate: "Más conexión, menos apuro.",
  intense: "Ritmo alto: conviene sostener la escena.",
  recovery: "Una pausa breve antes de volver a subir.",
  peak: "La partida llegó a su punto más intenso.",
  closing: "La partida se acerca al cierre.",
};

function normalizeForComparison(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\{\{[^}]+\}\}/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function meaningfulWords(value: string) {
  return new Set(
    normalizeForComparison(value)
      .split(" ")
      .filter((word) => word.length > 2),
  );
}

export function messagesAreEquivalent(
  hostMessage: string,
  cardText: string,
): boolean {
  const host = normalizeForComparison(hostMessage);
  const card = normalizeForComparison(cardText);

  if (!host || !card) return false;
  if (host === card) return true;

  const shortest = host.length <= card.length ? host : card;
  const longest = host.length > card.length ? host : card;

  if (shortest.length >= 24 && longest.includes(shortest)) {
    return true;
  }

  const hostWords = meaningfulWords(hostMessage);
  const cardWords = meaningfulWords(cardText);

  if (hostWords.size < 4 || cardWords.size < 4) return false;

  let shared = 0;
  hostWords.forEach((word) => {
    if (cardWords.has(word)) shared += 1;
  });

  const overlapOverShorter = shared / Math.min(hostWords.size, cardWords.size);
  const overlapOverUnion =
    shared / new Set([...hostWords, ...cardWords]).size;

  return overlapOverShorter >= 0.82 && overlapOverUnion >= 0.64;
}

function fallbackMessage(phase?: string | null, strategy?: string | null) {
  if (strategy && STRATEGY_MESSAGES[strategy]) {
    return STRATEGY_MESSAGES[strategy];
  }

  if (phase && PHASE_MESSAGES[phase]) {
    return PHASE_MESSAGES[phase];
  }

  return "La partida sigue adaptándose al momento.";
}

export function resolveGamePaceMessage({
  hostMessage,
  cardText,
  phase,
  strategy,
}: GamePaceMessageInput): string {
  const cleanHostMessage = hostMessage?.trim() ?? "";
  const cleanCardText = cardText?.trim() ?? "";

  if (
    !cleanHostMessage ||
    (cleanCardText && messagesAreEquivalent(cleanHostMessage, cleanCardText))
  ) {
    return fallbackMessage(phase, strategy);
  }

  return cleanHostMessage;
}
