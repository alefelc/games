import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyCardSelection,
  createDefaultSetup,
  createSession,
  getDrawCandidatePool,
  previewEligibleStats,
  resolveCurrentCard,
} from "../engine/session";
import type { ContentBundle, GameSetup } from "../types";

const content = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/bootstrap-content.json"), "utf8"),
) as ContentBundle;

const pairings = [
  ["hombre", "hombre"],
  ["hombre", "mujer"],
  ["mujer", "hombre"],
  ["mujer", "mujer"],
] as const;

function setupFor(
  modeSlug: string,
  firstSexSlug: string,
  secondSexSlug: string,
  levelCeiling: number,
): GameSetup {
  const setup = createDefaultSetup(content);
  const mode = content.modes.find((item) => item.slug === modeSlug)!;
  const isSolo = mode.slug === "solitario" || mode.turn_mode === "single";

  setup.modeId = mode.id;
  setup.playerOneSexId =
    content.sexes.find((item) => item.slug === firstSexSlug)?.id ?? null;
  setup.playerTwoSexId = isSolo
    ? null
    : (content.sexes.find((item) => item.slug === secondSexSlug)?.id ?? null);
  setup.levelIds = content.levels
    .filter((level) =>
      ["previa-solamente", "solo-previa"].includes(mode.slug)
        ? level.slug === "previa"
        : level.intensity_order <= levelCeiling,
    )
    .map((level) => level.id);
  setup.deckIds = content.decks
    .filter(
      (deck) =>
        deck.active &&
        Number(deck.minimum_players ?? 2) <= (isSolo ? 1 : 2) &&
        Number(deck.maximum_players ?? 2) >= (isSolo ? 1 : 2),
    )
    .map((deck) => deck.id);
  setup.filters = {
    ...setup.filters,
    maxIntensity: levelCeiling,
  };
  setup.maxCards = Math.min(
    20,
    previewEligibleStats(content, setup).sessionCapacity,
  );
  setup.gameMasterEnabled = false;
  return setup;
}

describe("continuidad exhaustiva después de la primera carta", () => {
  it("cada apertura seleccionable permite pedir una segunda carta", () => {
    for (const mode of content.modes) {
      for (const [firstSex, secondSex] of pairings) {
        if (
          (mode.slug === "solitario" || mode.turn_mode === "single") &&
          firstSex !== secondSex
        ) {
          continue;
        }

        for (const level of content.levels) {
          localStorage.clear();
          const setup = setupFor(
            mode.slug,
            firstSex,
            secondSex,
            level.intensity_order,
          );
          if (setup.maxCards < 2) continue;

          const initialSession = createSession(content, setup);
          const initialPool = getDrawCandidatePool(
            content,
            setup,
            initialSession,
          );
          const configuration = `${mode.slug}/${firstSex}/${secondSex}/nivel-${level.intensity_order}`;

          expect(
            initialPool.candidates.length,
            `${configuration}: debe existir una primera carta`,
          ).toBeGreaterThan(0);

          for (const firstCard of initialPool.candidates) {
            for (const result of ["completed", "skipped"] as const) {
              const selected = applyCardSelection(
                initialSession,
                firstCard,
                initialPool.player,
              );
              const resolved = resolveCurrentCard(
                content,
                setup,
                selected,
                result,
                () => 0,
              );
              const secondPool = getDrawCandidatePool(content, setup, resolved);

              expect(
                secondPool.candidates.length,
                `${configuration}/${firstCard.code}/${result}: no puede finalizar después de la primera carta`,
              ).toBeGreaterThan(0);
              expect(secondPool.exhausted).toBe(false);
              expect(secondPool.finishReason).toBeNull();
            }
          }
        }
      }
    }
  }, 60_000);
});
