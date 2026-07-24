import type { AppSettings } from "../types";

export function isIntensityMarkerActive(value: number, selected: number): boolean {
  return value <= selected;
}

export function intensityDescription(
  settings: AppSettings,
  selected: number,
): string {
  const descriptions: Record<number, string> = {
    1: settings.setup_intensity_level_1_text,
    2: settings.setup_intensity_level_2_text,
    3: settings.setup_intensity_level_3_text,
    4: settings.setup_intensity_level_4_text,
    5: settings.setup_intensity_level_5_text,
    6: settings.setup_intensity_level_6_text,
    7: settings.setup_intensity_level_7_text,
  };

  return descriptions[selected] ?? descriptions[7];
}
