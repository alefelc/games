import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isSoloResourceCompatible } from "../lib/soloResource";

const packageRoot = basename(process.cwd()) === "games-main"
  ? process.cwd()
  : resolve(process.cwd(), "games-main");

describe("recursos del modo solitario r24.3", () => {
  it("muestra recursos con alcance all antes y después de elegir sexo", () => {
    const resource = { solo_compatible: true, solo_gender_scope: "all" };
    expect(isSoloResourceCompatible(resource, null)).toBe(true);
    expect(isSoloResourceCompatible(resource, "hombre")).toBe(true);
    expect(isSoloResourceCompatible(resource, "mujer")).toBe(true);
  });

  it("mantiene compatibilidad con neutral y alcances específicos", () => {
    expect(
      isSoloResourceCompatible(
        { solo_compatible: true, solo_gender_scope: "neutral" },
        null,
      ),
    ).toBe(true);
    expect(
      isSoloResourceCompatible(
        { solo_compatible: true, solo_gender_scope: "male" },
        "hombre",
      ),
    ).toBe(true);
    expect(
      isSoloResourceCompatible(
        { solo_compatible: true, solo_gender_scope: "female" },
        "hombre",
      ),
    ).toBe(false);
  });

  it("mantiene visibles los recursos reales del catálogo solitario", () => {
    const bundle = JSON.parse(
      readFileSync(resolve(packageRoot, "public/bootstrap-content.json"), "utf8"),
    ) as {
      elements: Array<{
        visible_in_setup: boolean;
        solo_compatible: boolean;
        solo_gender_scope: string;
      }>;
      toys: Array<{
        visible_in_setup: boolean;
        solo_compatible: boolean;
        solo_gender_scope: string;
      }>;
    };

    const visibleElements = bundle.elements.filter(
      (item) =>
        item.visible_in_setup && isSoloResourceCompatible(item, "hombre"),
    );
    const visibleToys = bundle.toys.filter(
      (item) => item.visible_in_setup && isSoloResourceCompatible(item, "mujer"),
    );

    expect(visibleElements).toHaveLength(17);
    expect(visibleToys).toHaveLength(26);
  });

  it("oculta únicamente recursos marcados como incompatibles", () => {
    expect(
      isSoloResourceCompatible(
        { solo_compatible: false, solo_gender_scope: "all" },
        "mujer",
      ),
    ).toBe(false);
  });
});
