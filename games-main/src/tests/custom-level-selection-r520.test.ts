import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createDefaultSetup,
  createSession,
  getDrawCandidatePool,
  previewEligibleStats,
} from "../engine/session";
import type { ContentBundle } from "../types";

const content = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/bootstrap-content.json"), "utf8"),
) as ContentBundle;

const woman = content.sexes.find((sex) => sex.slug === "mujer")!;
const man = content.sexes.find((sex) => sex.slug === "hombre")!;

describe("selección independiente de niveles 5.2.0", () => {
  beforeEach(() => localStorage.clear());

  for (const level of content.levels) {
    it(`usa solamente ${level.name} cuando es el único nivel elegido`, () => {
      const setup = createDefaultSetup(content);
      setup.modeId =
        content.modes.find((mode) => mode.slug === "clasico")?.id ??
        setup.modeId;
      setup.playerOneSexId = woman.id;
      setup.playerTwoSexId = man.id;
      setup.levelIds = [level.id];
      setup.filters = { ...setup.filters, maxIntensity: 7 };

      expect(previewEligibleStats(content, setup).sessionCapacity).toBeGreaterThan(
        0,
      );

      const pool = getDrawCandidatePool(
        content,
        setup,
        createSession(content, setup),
      );

      expect(pool.candidates.length, level.slug).toBeGreaterThan(0);
      expect(
        pool.candidates.every((card) => card.level === level.id),
        level.slug,
      ).toBe(true);
    });
  }
});
