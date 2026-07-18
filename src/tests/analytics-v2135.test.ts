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
  delete window.__TE_ANIMAS_RUNTIME_CONFIG__;
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

  it("prioriza el ID runtime sobre un campo remoto viejo", async () => {
    window.__TE_ANIMAS_RUNTIME_CONFIG__ = {
      ga4MeasurementId: "G-RUNTIME123",
    };
    const { configureAnalytics } = await analyticsModule();

    expect(
      configureAnalytics({
        analytics_enabled: true,
        analytics_measurement_id: "G-REMOTE999",
      }),
    ).toBe(true);

    const script = document.getElementById(
      "te-animas-ga4",
    ) as HTMLScriptElement | null;
    expect(script?.src).toContain("gtag/js?id=G-RUNTIME123");
  });

  it("usa el ID runtime cuando el campo no existe", async () => {
    window.__TE_ANIMAS_RUNTIME_CONFIG__ = {
      ga4MeasurementId: "G-RUNTIME123",
    };
    const { configureAnalytics } = await analyticsModule();

    expect(
      configureAnalytics({
        analytics_enabled: true,
        analytics_measurement_id: "",
      }),
    ).toBe(true);

    const script = document.getElementById(
      "te-animas-ga4",
    ) as HTMLScriptElement | null;
    expect(script?.src).toContain("gtag/js?id=G-RUNTIME123");
  });

});
