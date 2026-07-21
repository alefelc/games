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

  const response = await fetch(`${env.directusUrl}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new AuthApiError(
      normalizeErrorMessage(payload, "No se pudo completar la solicitud."),
      response.status,
      normalizeErrorCode(payload),
    );
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as DirectusEnvelope<T>).data;
  }

  return payload as T;
}

async function accountRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
        credentials: "omit",
        cache: "no-store",
      });
      const text = await response.text();
      let payload: unknown = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = text;
      }

      if (!response.ok) {
        const error = new AuthApiError(
          normalizeErrorMessage(payload, "No se pudo completar la operación de cuenta."),
          response.status,
          normalizeErrorCode(payload),
        );
        // Un 404 puede provenir de un servicio viejo; se prueba la ruta alternativa.
        if (response.status === 404) {
          lastError = error;
          continue;
        }
        throw error;
      }

      if (payload && typeof payload === "object" && "data" in payload) {
        return (payload as DirectusEnvelope<T>).data;
      }
      return payload as T;
    } catch (error) {
      if (error instanceof AuthApiError && error.status !== 404) throw error;
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
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
        credentials: "omit",
        cache: "no-store",
      });
      const text = await response.text();
      let payload: unknown = null;
      try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }

      if (!response.ok) {
        const error = new AuthApiError(
          normalizeErrorMessage(payload, "No se pudo completar el registro."),
          response.status,
          normalizeErrorCode(payload),
        );
        if (response.status === 404) {
          lastError = error;
          continue;
        }
        throw error;
      }

      if (payload && typeof payload === "object" && "data" in payload) {
        return (payload as DirectusEnvelope<T>).data;
      }
      return payload as T;
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
  refreshTimer = window.setTimeout(() => {
    void refreshSession()
      .then((result) => scheduleRefresh(result.expires, onFailure))
      .catch(() => {
        clearSession();
        onFailure?.();
      });
  }, delay);
}

export function clearSession() {
  accessToken = null;
  clearRefreshTimer();
}

export async function login(email: string, password: string, onSessionLost?: () => void) {
  const result = await directusRequest<LoginResult>("/auth/login", {
    method: "POST",
    authenticated: false,
    body: JSON.stringify({ email, password, mode: "cookie" }),
  });
  accessToken = result.access_token;
  scheduleRefresh(result.expires, onSessionLost);
  return result;
}

export async function refreshSession(onSessionLost?: () => void) {
  const result = await directusRequest<LoginResult>("/auth/refresh", {
    method: "POST",
    authenticated: false,
    body: JSON.stringify({ mode: "cookie" }),
  });
  accessToken = result.access_token;
  scheduleRefresh(result.expires, onSessionLost);
  return result;
}

export async function logout() {
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
  await publicAccountRequest<{ accepted: true }>("/v1/account/register", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
    }),
  });
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
  return accountRequest<AccountBundle>("/v1/account/me", { method: "GET" });
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
