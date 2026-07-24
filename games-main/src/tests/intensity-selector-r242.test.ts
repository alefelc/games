import { describe, expect, it } from "vitest";
import { intensityDescription, isIntensityMarkerActive } from "../lib/intensitySelector";
import type { AppSettings } from "../types";

describe("selector visual de intensidad r24.2", () => {
  it("marca el nivel elegido y todos los inferiores", () => {
    expect(Array.from({ length: 7 }, (_, index) => index + 1).filter((value) =>
      isIntensityMarkerActive(value, 5),
    )).toEqual([1, 2, 3, 4, 5]);
  });

  it("usa el texto editable del nivel exacto", () => {
    const settings = {
      setup_intensity_level_1_text: "uno",
      setup_intensity_level_2_text: "dos",
      setup_intensity_level_3_text: "tres",
      setup_intensity_level_4_text: "cuatro",
      setup_intensity_level_5_text: "cinco",
      setup_intensity_level_6_text: "seis",
      setup_intensity_level_7_text: "siete",
    } as AppSettings;

    expect(intensityDescription(settings, 6)).toBe("seis");
  });
});
