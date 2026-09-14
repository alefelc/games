import type { Card, ContentBundle, GameSetup, Id, SessionState } from "../types";

function sessionCardIds(session: SessionState): Set<Id> {
  return new Set([
    ...session.completedCardIds,
    ...session.skippedCardIds,
    ...(session.currentCardId ? [session.currentCardId] : []),
  ]);
}

export function penetrationCardsSeen(
  session: SessionState,
  content: ContentBundle,
): number {
  const ids = sessionCardIds(session);
  return content.cards.filter(
    (card) => ids.has(card.id) && card.contains_penetration,
  ).length;
}

function highIntensityCardsSeen(
  session: SessionState,
  content: ContentBundle,
): number {
  const ids = sessionCardIds(session);
  const highLevels = new Set(
    content.levels
      .filter(
        (level) =>
          level.intensity_order >= 5 &&
          level.intensity_order <= 6 &&
          level.slug !== "cierre",
      )
      .map((level) => level.id),
  );
  return content.cards.filter(
    (card) => ids.has(card.id) && highLevels.has(card.level),
  ).length;
}

export function choosePracticePool(
  candidates: Card[],
  content: ContentBundle,
  _setup: GameSetup,
  session: SessionState,
): Card[] {
  const penetration = candidates.filter((card) => card.contains_penetration);
  if (!penetration.length) return candidates;

  const highSeen = highIntensityCardsSeen(session, content);
  const penetrationSeen = penetrationCardsSeen(session, content);
  const expected = Math.min(2, Math.floor((highSeen + 1) / 3));

  // In Acción/Clímax, no permitimos que una partida larga ignore por completo
  // una práctica disponible que la persona no excluyó.
  if (expected > penetrationSeen) return penetration;

  return candidates.map((card) =>
    card.contains_penetration
      ? { ...card, weight: Math.max(1, Number(card.weight ?? 1)) * 1.8 }
      : card,
  );
}
