import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureAnalytics,
  isValidAnalyticsMeasurementId,
  trackAnalyticsEvent,
  trackAnalyticsScreen,
} from "../lib/analytics";

describe("Google Analytics 4", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    window.dataLayer = [];
    window.gtag = undefined;
    delete window["ga-disable-G-ABC12345"];
  });

  it("no carga GA4 cuando Analytics está desactivado", () => {
    expect(
      configureAnalytics({
        analytics_enabled: false,
        analytics_measurement_id: "G-ABC12345",
      }),
    ).toBe(false);

    expect(document.querySelector("#te-animas-ga4")).toBeNull();
  });

  it("no carga GA4 sin un ID válido configurado en el panel", () => {
    expect(
      configureAnalytics({
        analytics_enabled: true,
        analytics_measurement_id: "",
      }),
    ).toBe(false);

    expect(document.querySelector("#te-animas-ga4")).toBeNull();
  });

  it("rechaza identificadores que no sean GA4", () => {
    expect(
      configureAnalytics({
        analytics_enabled: true,
        analytics_measurement_id: "UA-123456-1",
      }),
    ).toBe(false);

    expect(document.querySelector("#te-animas-ga4")).toBeNull();
  });

  it("carga el ID configurado en el panel", () => {
    expect(
      configureAnalytics({
        analytics_enabled: true,
        analytics_measurement_id: "g-abc12345",
      }),
    ).toBe(true);

    const script = document.querySelector<HTMLScriptElement>("#te-animas-ga4");
    expect(script?.src).toContain("gtag/js?id=G-ABC12345");
    expect(script?.dataset.measurementId).toBe("G-ABC12345");
  });

  it("envía eventos y evita repetir la misma pantalla", () => {
    configureAnalytics({
      analytics_enabled: true,
      analytics_measurement_id: "G-ABC12345",
    });

    const spy = vi.spyOn(window, "gtag");
    trackAnalyticsEvent("game_started", { mode: "clasico" });
    trackAnalyticsScreen("setup");
    trackAnalyticsScreen("setup");

    expect(spy).toHaveBeenCalledWith("event", "game_started", { mode: "clasico" });
    expect(
      spy.mock.calls.filter(
        ([kind, name, params]) =>
          kind === "event" &&
          name === "screen_view" &&
          (params as Record<string, unknown>)?.screen_name === "setup",
      ),
    ).toHaveLength(1);
  });

  it("valida IDs GA4", () => {
    expect(isValidAnalyticsMeasurementId("G-8CMSB2VYC8")).toBe(true);
    expect(isValidAnalyticsMeasurementId("UA-123456-1")).toBe(false);
    expect(isValidAnalyticsMeasurementId("")).toBe(false);
  });
});
