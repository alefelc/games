import { env } from "../env";
import type { AuthUser, SavedGamePreferences, UserProfileRecord } from "./types";

interface DirectusEnvelope<T> {
  data: T;
}

interface LoginResult {
  access_token: string;
  expires: number;
}

interface AccountBundle {
  user: AuthUser;
  profile: UserProfileRecord | null;
  profile_available?: boolean;
}

export class AuthApiError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.code = code;
  }
}

let accessToken: string | null = null;
let refreshTimer: number | null = null;
let refreshInFlight: Promise<LoginResult> | null = null;
let sessionGeneration = 0;

export function getAccessToken() {
  return accessToken;
}

function clearRefreshTimer() {
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

function normalizeErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  if ("error" in payload && typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }
  const errors = (payload as { errors?: Array<{ message?: string; extensions?: { code?: string } }> }).errors;
  const message = errors?.[0]?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

function normalizeErrorCode(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  if ("code" in payload && typeof payload.code === "string") return payload.code;
  const errors = (payload as { errors?: Array<{ extensions?: { code?: string } }> }).errors;
  return errors?.[0]?.extensions?.code ?? null;
}

async function fetchAccountJson<T>(
  url: string,
  options: RequestInit,
  unavailableCode: string,
  timeoutMs = 12_000,
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let payload: unknown = null;
    try { payload = text ? JSON.parse(text) : null; } catch { /* Never show proxy HTML. */ }
    if (!response.ok) {
      throw new AuthApiError(
        normalizeErrorMessage(payload, response.status >= 500
          ? "El servicio de cuentas no está disponible. Intentá nuevamente en unos minutos."
          : "No se pudo completar la solicitud."),
        response.status,
        normalizeErrorCode(payload) ?? (response.status >= 500 ? unavailableCode : null),
      );
    }
    if (text && payload === null) {
      throw new AuthApiError("El servidor devolvió una respuesta inválida.", 502, unavailableCode);
    }
    return payload && typeof payload === "object" && "data" in payload
      ? (payload as DirectusEnvelope<T>).data
      : payload as T;
  } catch (error) {
    if (error instanceof AuthApiError) throw error;
    throw new AuthApiError(
      "No se pudo conectar con el servicio de cuentas. Revisá tu conexión o intentá más tarde.",
      503,
      unavailableCode,
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

async function directusRequest<T>(
  endpoint: string,
  options: RequestInit & { authenticated?: boolean } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.authenticated !== false && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetchAccountJson<T>(`${env.directusUrl}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
    cache: "no-store",
  }, "DIRECTUS_UNAVAILABLE");
}

async function accountRequest<T>(endpoint: string, options: RequestInit = {}, timeoutMs = 12_000): Promise<T> {
  if (!accessToken) {
    throw new AuthApiError("La sesión no está disponible.", 401, "ACCOUNT_UNAUTHORIZED");
  }

  let lastError: unknown = null;
  for (const baseUrl of env.gameMasterUrls) {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    headers.set("Authorization", `Bearer ${accessToken}`);
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    try {
      return await fetchAccountJson<T>(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
        credentials: "omit",
        cache: "no-store",
      }, "ACCOUNT_SERVICE_UNAVAILABLE", timeoutMs);
    } catch (error) {
      // GETs may safely try another route; do not replay a mutation after a 5xx.
      if (error instanceof AuthApiError && error.status !== 404 &&
        !(options.method === "GET" && error.status >= 500)) throw error;
      lastError = error;
    }
  }

  if (lastError instanceof AuthApiError) throw lastError;
  throw new AuthApiError(
    "No se pudo conectar con el servicio privado de perfiles.",
    503,
    "ACCOUNT_SERVICE_UNAVAILABLE",
  );
}


async function publicAccountRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let lastError: unknown = null;
  for (const baseUrl of env.gameMasterUrls) {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    try {
      return await fetchAccountJson<T>(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
        credentials: "omit",
        cache: "no-store",
      }, "ACCOUNT_SERVICE_UNAVAILABLE");
    } catch (error) {
      if (error instanceof AuthApiError && error.status !== 404) throw error;
      lastError = error;
    }
  }

  if (lastError instanceof AuthApiError) throw lastError;
  throw new AuthApiError(
    "No se pudo conectar con el servicio de cuentas.",
    503,
    "ACCOUNT_SERVICE_UNAVAILABLE",
  );
}

function scheduleRefresh(expiresMs: number, onFailure?: () => void) {
  clearRefreshTimer();
  // A persistent session timer is a browser concern. Creating it in Vitest keeps
  // the worker alive after every assertion and makes the release gate unreliable.
  if (import.meta.env.MODE === "test") return;
  const delay = Math.max(30_000, expiresMs - 60_000);
  const generation = sessionGeneration;
  refreshTimer = window.setTimeout(() => {
    void refreshSession(onFailure)
      .catch(() => {
        if (generation !== sessionGeneration) return;
        clearSession();
        onFailure?.();
      });
  }, delay);
}

export function clearSession() {
  sessionGeneration++;
  accessToken = null;
  refreshInFlight = null;
  clearRefreshTimer();
}

export async function login(email: string, password: string, onSessionLost?: () => void) {
  clearSession();
  const generation = sessionGeneration;
  const result = await directusRequest<LoginResult>("/auth/login", {
    method: "POST",
    authenticated: false,
    body: JSON.stringify({ email: email.trim().toLowerCase(), password, mode: "cookie" }),
  });
  assertLoginResult(result);
  if (generation !== sessionGeneration) throw new AuthApiError("El inicio de sesión fue cancelado.", 401, "ACCOUNT_UNAUTHORIZED");
  accessToken = result.access_token;
  scheduleRefresh(result.expires, onSessionLost);
  return result;
}

function assertLoginResult(result: LoginResult): void {
  if (!result || typeof result.access_token !== "string" || !result.access_token.trim() ||
    !Number.isFinite(result.expires) || result.expires <= 0) {
    throw new AuthApiError("La respuesta de autenticación no es válida.", 502, "DIRECTUS_UNAVAILABLE");
  }
}

export function refreshSession(onSessionLost?: () => void): Promise<LoginResult> {
  if (refreshInFlight) return refreshInFlight;
  const generation = sessionGeneration;
  const pending = directusRequest<LoginResult>("/auth/refresh", {
      method: "POST",
      authenticated: false,
      body: JSON.stringify({ mode: "cookie" }),
    }).then((result) => {
      assertLoginResult(result);
      if (generation !== sessionGeneration) throw new AuthApiError("La sesión fue cerrada.", 401, "ACCOUNT_UNAUTHORIZED");
      accessToken = result.access_token;
      scheduleRefresh(result.expires, onSessionLost);
      return result;
    }).finally(() => {
      if (refreshInFlight === pending) refreshInFlight = null;
    });
  refreshInFlight = pending;
  return pending;
}

export async function logout() {
  clearSession();
  try {
    await directusRequest<void>("/auth/logout", {
      method: "POST",
      authenticated: false,
      body: JSON.stringify({ mode: "cookie" }),
    });
  } finally {
    clearSession();
  }
}

export async function registerUser(input: {
  email: string;
  firstName: string;
  lastName: string;
}) {
  const result = await publicAccountRequest<{ accepted: true }>("/v1/account/register", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
    }),
  });
  if (result?.accepted !== true) {
    throw new AuthApiError("No se pudo confirmar el envío de la invitación.", 502, "ACCOUNT_SERVICE_UNAVAILABLE");
  }
}

export async function acceptInvite(token: string, password: string) {
  await directusRequest<void>("/users/invite/accept", {
    method: "POST",
    authenticated: false,
    body: JSON.stringify({ token, password }),
  });
}

export async function requestPasswordReset(email: string, resetUrl: string) {
  await directusRequest<void>("/auth/password/request", {
    method: "POST",
    authenticated: false,
    body: JSON.stringify({ email, reset_url: resetUrl }),
  });
}

export async function resetPassword(token: string, password: string) {
  await directusRequest<void>("/auth/password/reset", {
    method: "POST",
    authenticated: false,
    body: JSON.stringify({ token, password }),
  });
}

export async function readAccount() {
  return accountRequest<AccountBundle>("/v1/account/me", { method: "GET" }, 4_000);
}

export async function readCurrentUser() {
  const user = await directusRequest<AuthUser>(
    "/users/me?fields=id,email,first_name,last_name,status",
    { method: "GET" },
  );
  if (!user?.id || user.status !== "active") {
    throw new AuthApiError("Tu cuenta no está activa o no se pudo verificar.", 401, "ACCOUNT_UNAUTHORIZED");
  }
  return user;
}

export async function updateAccount(input: {
  firstName: string;
  lastName: string;
}) {
  return accountRequest<AuthUser>("/v1/account/me", {
    method: "PATCH",
    body: JSON.stringify({
      first_name: input.firstName.trim() || null,
      last_name: input.lastName.trim() || null,
    }),
  });
}

export async function readProfile() {
  return accountRequest<UserProfileRecord | null>("/v1/account/profile", {
    method: "GET",
  });
}

export async function saveProfile(preferences: SavedGamePreferences | null) {
  return accountRequest<UserProfileRecord>("/v1/account/profile", {
    method: "PUT",
    body: JSON.stringify({ preferences }),
  });
}

export async function readCouple() {
  return accountRequest<import("./types").CoupleProfile | null>("/v1/couples/me", { method: "GET" }, 4_000);
}

export async function createCoupleInvite(expiresInDays = 7) {
  return accountRequest<import("./types").CoupleInvite>("/v1/couples/invites", {
    method: "POST",
    body: JSON.stringify({ expires_in_days: expiresInDays }),
  });
}

export async function linkCouple(code: string) {
  return accountRequest<import("./types").CoupleProfile>("/v1/couples/link", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function unlinkCouple() {
  return accountRequest<{ unlinked: true; private_data_deleted: true }>("/v1/couples/me", { method: "DELETE" });
}

export async function saveCouplePreferences(
  preferences: unknown | null,
  expectedRevision: number,
) {
  return accountRequest<import("./types").CoupleProfile>("/v1/couples/preferences", {
    method: "PUT",
    body: JSON.stringify({ preferences, expected_revision: expectedRevision }),
  });
}

export async function readCoupleCardSignal(cardId: string) {
  return accountRequest<{ card_id: string; response: import("./types").CoupleCardResponse } | null>(
    `/v1/couples/cards/${encodeURIComponent(cardId)}`,
    { method: "GET" },
  );
}

export async function saveCoupleCardSignal(
  cardId: string,
  response: import("./types").CoupleCardResponse,
) {
  return accountRequest<{ card_id: string; response: import("./types").CoupleCardResponse }>(
    `/v1/couples/cards/${encodeURIComponent(cardId)}`,
    { method: "PUT", body: JSON.stringify({ response }) },
  );
}

export async function readCoupleMatches() {
  return accountRequest<import("./types").CoupleMatch[]>("/v1/couples/matches", { method: "GET" });
}

export async function appendCoupleHistory(sessionId: string, summary: unknown | null) {
  return accountRequest<unknown>("/v1/couples/history", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, summary }),
  });
}
