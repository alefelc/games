import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("compilación v2.8.2", () => {
  it("incorpora la dirección del Game Master durante el build", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");

    expect(dockerfile).toContain(
      "ARG VITE_GAME_MASTER_URL=https://gm.teanimas.com",
    );
    expect(dockerfile).toContain(
      "VITE_GAME_MASTER_URL=${VITE_GAME_MASTER_URL}",
    );
  });
});
