import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("catálogo dinámico v2.7.0", () => {
  const api = readFileSync("src/api/content-api.ts", "utf8");

  const loader = readFileSync("src/api/content-loader.ts", "utf8");

  it("lee en vivo todas las colecciones del juego", () => {
    for (const collection of [
      "pc_levels",
      "pc_decks",
      "pc_game_modes",
      "pc_elements",
      "pc_toys",
      "pc_tags",
      "pc_sexes",
      "pc_cards",
      "pc_decks_cards",
      "pc_cards_elements",
      "pc_cards_toys",
      "pc_cards_tags",
      "pc_releases",
    ]) {
      expect(api).toContain(collection);
    }
  });

  it("no omite la actualización por un hash anterior", () => {
    expect(loader).toContain("fetchCurrentContent");
    expect(loader).not.toContain(
      "metadata.content_hash === cached.contentHash",
    );
  });


  it("no descarga el bundle JSON gigante desde Directus", () => {
    expect(loader).toContain("includeBundle: false");
    expect(loader).not.toContain("parseBundle(record.bundle)");
  });

  it("reserva el bootstrap pesado para el fallback real", () => {
    const networkPath = loader.slice(
      loader.indexOf("async function fetchCurrentContent"),
      loader.indexOf("async function readBootstrap"),
    );
    expect(networkPath).not.toContain("readBootstrap()");
    expect(loader).toContain("if (env.allowBootstrapFallback)");
    expect(loader).toContain("const bundle = await readBootstrap()");
  });

  it("no depende de una lista fija de sexos", () => {
    expect(loader).toContain("sexes: catalog.sexes");
  });
});
