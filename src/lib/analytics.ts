import type { AppSettings } from "../types";

const SCRIPT_ID = "te-animas-ga4";
const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/i;
const EMBEDDED_MEASUREMENT_ID = "G-8CMSB2VYC8";

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

let activeMeasurementId: string | null = null;
let lastScreenName: string | null = null;
let appOpenTracked = false;

function normalizeMeasurementId(value: unknown): string | null {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  return MEASUREMENT_ID_PATTERN.test(normalized) ? normalized : null;
}

function ensureGtag(): NonNullable<Window["gtag"]> {
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };

  return window.gtag;
}

function loadGoogleTag(measurementId: string): void {
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

  if (existing?.dataset.measurementId === measurementId) return;
  existing?.remove();

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    measurementId,
  )}`;
  script.dataset.measurementId = measurementId;
  document.head.appendChild(script);
}

function disableMeasurementId(measurementId: string | null): void {
  if (!measurementId || typeof window === "undefined") return;
  window[`ga-disable-${measurementId}`] = true;
}

export function configureAnalytics(
  settings: Pick<AppSettings, "analytics_enabled" | "analytics_measurement_id">,
): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const buildMeasurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID;
  const measurementId =
    normalizeMeasurementId(settings.analytics_measurement_id) ??
    normalizeMeasurementId(buildMeasurementId) ??
    normalizeMeasurementId(EMBEDDED_MEASUREMENT_ID);

  if (!settings.analytics_enabled || !measurementId) {
    disableMeasurementId(activeMeasurementId ?? measurementId);
    activeMeasurementId = null;
    lastScreenName = null;
    return false;
  }

  if (
    activeMeasurementId === measurementId &&
    document.getElementById(SCRIPT_ID)?.getAttribute("data-measurement-id") ===
      measurementId
  ) {
    return true;
  }

  if (activeMeasurementId && activeMeasurementId !== measurementId) {
    disableMeasurementId(activeMeasurementId);
  }

  activeMeasurementId = measurementId;
  window[`ga-disable-${measurementId}`] = false;

  const gtag = ensureGtag();
  loadGoogleTag(measurementId);

  gtag("js", new Date());
  gtag("config", measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    anonymize_ip: true,
    cookie_flags: "SameSite=None;Secure",
  });

  if (!appOpenTracked) {
    appOpenTracked = true;
    trackAnalyticsEvent("app_open");
  }

  return true;
}

export function trackAnalyticsEvent(
  name: string,
  parameters: Record<string, string | number | boolean | undefined> = {},
): void {
  if (!activeMeasurementId || typeof window === "undefined" || !window.gtag) {
    return;
  }

  const sanitized = Object.fromEntries(
    Object.entries(parameters).filter(([, value]) => value !== undefined),
  );

  window.gtag("event", name, sanitized);
}

export function trackAnalyticsScreen(screenName: string): void {
  if (!activeMeasurementId || screenName === lastScreenName) return;

  lastScreenName = screenName;
  trackAnalyticsEvent("screen_view", {
    screen_name: screenName,
    app_name: "Te Animas",
  });
}

export function isValidAnalyticsMeasurementId(value: unknown): boolean {
  return normalizeMeasurementId(value) !== null;
}
