import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import bootstrap from "../../public/bootstrap-content.json";
import type { ContentBundle } from "../types";

const content = bootstrap as unknown as ContentBundle;

describe("v2.6.0", () => {
  it("incluye los textos editables de los cuatro pasos", () => {
    expect(content.settings.setup_step_1_title).toBeTruthy();
    expect(content.settings.setup_step_2_subtitle).toBeTruthy();
    expect(content.settings.setup_step_3_title).toBeTruthy();
    expect(content.settings.setup_step_4_subtitle).toBeTruthy();
  });

  it("no muestra referencias técnicas en las pantallas", () => {
    const files = [
      "src/screens/HomeScreen.tsx",
      "src/screens/AgeGate.tsx",
      "src/screens/ErrorScreen.tsx",
      "src/screens/SetupScreen.tsx",
      "src/screens/SummaryScreen.tsx",
    ];

    const text = files
      .map((file) => readFileSync(file, "utf8"))
      .join("\n")
      .toLowerCase();

    expect(text).not.toContain("directus");
    expect(text).not.toContain("servidor");
    expect(text).not.toContain("· versión");
  });
});
