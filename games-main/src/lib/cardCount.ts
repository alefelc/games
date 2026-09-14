import type { AppSettings } from "../types";

export function resolveMaximumCards(
  settings: Pick<AppSettings, "maximum_cards_per_session">,
): number {
  return Math.max(1, Number(settings.maximum_cards_per_session) || 20);
}

export function resolveDefaultCards(
  settings: Pick<
    AppSettings,
    "maximum_cards_per_session" | "default_cards_per_session"
  >,
): number {
  const maximum = resolveMaximumCards(settings);
  const preferred = Math.max(
    1,
    Number(settings.default_cards_per_session) || 20,
  );
  return Math.min(preferred, maximum);
}
