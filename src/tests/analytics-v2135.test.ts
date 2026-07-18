// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

async function analyticsModule() {
  vi.resetModules();
  return import("../lib/analytics");
}

beforeEach(() => {
  document.head.innerHTML = "";
  window.dataLayer = [];
  delete window.gtag;
});

describe("Google Analytics 4", () => {
  it("no carga GA4 si está desactivado", async () => {
    const { configureAnalytics } = await analyticsModule();

    expect(
      configureAnalytics({
        analytics_enabled: false,
        analytics_measurement_id: "G-ABC12345",
      }),
    ).toBe(false);
    expect(document.getElementById("te-animas-ga4")).toBeNull();
  });

  it("rechaza identificadores inválidos", async () => {
    const { configureAnalytics, isValidAnalyticsMeasurementId } =
      await analyticsModule();

    expect(isValidAnalyticsMeasurementId("UA-123456-1")).toBe(false);
    expect(
      configureAnalytics({
        analytics_enabled: true,
        analytics_measurement_id: "UA-123456-1",
      }),
    ).toBe(false);
  });

  it("carga GA4 y encola eventos anónimos", async () => {
    const { configureAnalytics, trackAnalyticsEvent } =
      await analyticsModule();

    expect(
      configureAnalytics({
        analytics_enabled: true,
        analytics_measurement_id: "g-abc12345",
      }),
    ).toBe(true);

    const script = document.getElementById(
      "te-animas-ga4",
    ) as HTMLScriptElement | null;
    expect(script?.src).toContain("gtag/js?id=G-ABC12345");

    trackAnalyticsEvent("game_started", {
      player_count: 2,
      adaptive_enabled: true,
    });

    expect(window.dataLayer).toEqual(
      expect.arrayContaining([
        [
          "event",
          "game_started",
          { player_count: 2, adaptive_enabled: true },
        ],
      ]),
    );
  });
});
