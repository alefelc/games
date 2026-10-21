import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../env", () => ({ env: {
  directusUrl: "https://directus.test",
  gameMasterUrls: ["https://gm.test", "/api/game-master"],
} }));

const user = { id: "user-a", email: "ale@example.test", first_name: "Ale", last_name: null, status: "active" };
const ok = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200 });
const failure = (status: number) => new Response("<html>Service is not reachable</html>", { status });
const session = () => ok({ access_token: "test-access", expires: 900_000 });

async function api() { return import("../auth/auth-api"); }
async function store() { return (await import("../auth/useAuthStore")).useAuthStore; }

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
});

afterEach(async () => {
  (await api()).clearSession();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mockOutage(outage: number | "network") {
  const mocked = vi.fn(async (url: string) => {
    if (url.endsWith("/auth/login") || url.endsWith("/auth/refresh")) return session();
    if (url.includes("/users/me?")) return ok(user);
    if (outage === "network") throw new TypeError("Failed to fetch");
    return failure(outage);
  });
  vi.stubGlobal("fetch", mocked);
  return mocked;
}

describe("cuentas ante caída del Game Master", () => {
  it.each([500, 502, 503, 504, "network"] as const)("permite un login válido con fallo opcional %s", async (outage) => {
    mockOutage(outage);
    const auth = await store();
    await auth.getState().login("ale@example.test", "correct-password");
    expect(auth.getState()).toMatchObject({ status: "authenticated", user, profile: null, couple: null, busy: false, error: null });
    expect((await api()).getAccessToken()).toBe("test-access");
  });

  it("restaura sesión una sola vez aunque StrictMode inicialice dos veces", async () => {
    const mocked = mockOutage(502);
    const auth = await store();
    await Promise.all([auth.getState().initialize(), auth.getState().initialize()]);
    expect(auth.getState().status).toBe("authenticated");
    expect(mocked.mock.calls.filter(([url]) => url.endsWith("/auth/refresh"))).toHaveLength(1);
    expect(mocked.mock.calls.filter(([url]) => url.includes("/users/me?"))).toHaveLength(1);
  });

  it("rechaza contraseña inválida y no consulta servicios opcionales", async () => {
    const mocked = vi.fn(async () => new Response(JSON.stringify({ errors: [{ message: "Invalid credentials", extensions: { code: "INVALID_CREDENTIALS" } }] }), { status: 401 }));
    vi.stubGlobal("fetch", mocked);
    const auth = await store();
    await expect(auth.getState().login("ale@example.test", "wrong")).rejects.toMatchObject({ status: 401 });
    expect(auth.getState()).toMatchObject({ status: "anonymous", user: null, error: "Email o contraseña incorrectos." });
    expect(mocked).toHaveBeenCalledTimes(1);
    expect((await api()).getAccessToken()).toBeNull();
  });

  it.each([null, { id: "user-a" }, { ...user, status: "suspended" }])("no autentica identidad incompleta o inactiva: %s", async (identity) => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/auth/login") ? session() : ok(identity)));
    const auth = await store();
    await expect(auth.getState().login("ale@example.test", "password")).rejects.toMatchObject({ status: 401 });
    expect(auth.getState().status).toBe("anonymous");
    expect((await api()).getAccessToken()).toBeNull();
  });

  it("conserva el respaldo de preferencias solo para su usuario durante una caída", async () => {
    const preferences = { version: 1, playerOne: "Ale", playerOneSexSlug: "hombre", maxCards: 20 };
    localStorage.setItem("pecadoclub-profile-preferences:user-a", JSON.stringify(preferences));
    localStorage.setItem("pecadoclub-profile-preferences:user-b", JSON.stringify({ playerOne: "Otra cuenta" }));
    mockOutage(502);
    const auth = await store();
    await auth.getState().login("ale@example.test", "password");
    expect(auth.getState().profile?.preferences).toEqual(preferences);
    expect(auth.getState().profile?.user).toBe("user-a");
  });

  it("no toma el perfil de una identidad distinta", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("/auth/login")) return session();
      if (url.includes("/users/me?")) return ok(user);
      if (url.endsWith("/v1/account/me")) return ok({ user: { ...user, id: "user-b" }, profile: { user: "user-b", preferences: { playerOne: "Otra" } } });
      return ok(null);
    }));
    const auth = await store();
    await auth.getState().login("ale@example.test", "password");
    expect(auth.getState().user?.id).toBe("user-a");
    expect(auth.getState().profile).toBeNull();
  });

  it("no resucita preferencias eliminadas cuando el servidor confirma perfil vacío", async () => {
    localStorage.setItem("pecadoclub-profile-preferences:user-a", JSON.stringify({ playerOne: "Viejo" }));
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("/auth/login")) return session();
      if (url.includes("/users/me?")) return ok(user);
      if (url.endsWith("/v1/account/me")) return ok({ user, profile: null, profile_available: true });
      return ok(null);
    }));
    const auth = await store();
    await auth.getState().login("ale@example.test", "password");
    expect(auth.getState().profile).toBeNull();
    expect(localStorage.getItem("pecadoclub-profile-preferences:user-a")).toBeNull();
  });

  it("informa registro no disponible sin fingir que envió el correo ni repetir el POST", async () => {
    const mocked = vi.fn(async () => failure(502));
    vi.stubGlobal("fetch", mocked);
    const auth = await store();
    await expect(auth.getState().register({ email: "new@example.test", firstName: "New", lastName: "User" })).rejects.toMatchObject({ status: 502, code: "ACCOUNT_SERVICE_UNAVAILABLE" });
    expect(auth.getState().error).toContain("no está disponible");
    expect(mocked).toHaveBeenCalledTimes(1);
  });

  it("usa la ruta alternativa de registro solo cuando la primera no implementa el endpoint", async () => {
    const mocked = vi.fn().mockResolvedValueOnce(failure(404)).mockResolvedValueOnce(new Response(JSON.stringify({ data: { accepted: true } }), { status: 202 }));
    vi.stubGlobal("fetch", mocked);
    await (await api()).registerUser({ email: "new@example.test", firstName: "New", lastName: "User" });
    expect(mocked).toHaveBeenCalledTimes(2);
    expect(mocked.mock.calls[1][0]).toBe("/api/game-master/v1/account/register");
  });

  it("limita el tiempo de un backend colgado y mantiene el login", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith("/auth/login")) return Promise.resolve(session());
      if (url.includes("/users/me?")) return Promise.resolve(ok(user));
      return new Promise((_resolve, reject) => options.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true }));
    }));
    const auth = await store();
    const pending = auth.getState().login("ale@example.test", "password");
    await vi.advanceTimersByTimeAsync(8_100);
    await pending;
    expect(auth.getState().status).toBe("authenticated");
  });

  it("cerrar sesión durante una carga lenta no vuelve a autenticar al terminar", async () => {
    let resolveAccount!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("/auth/login")) return session();
      if (url.includes("/users/me?")) return ok(user);
      if (url.endsWith("/v1/account/me")) return new Promise<Response>((resolve) => { resolveAccount = resolve; });
      return ok(null);
    }));
    const auth = await store();
    const pending = auth.getState().login("ale@example.test", "password");
    await vi.waitFor(() => expect(resolveAccount).toBeTypeOf("function"));
    await auth.getState().logout();
    resolveAccount(ok({ user, profile: null }));
    await pending;
    expect(auth.getState().status).toBe("anonymous");
  });
});
