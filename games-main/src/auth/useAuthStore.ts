import { create } from "zustand";
import {
  AuthApiError,
  acceptInvite as apiAcceptInvite,
  createCoupleInvite as apiCreateCoupleInvite,
  linkCouple as apiLinkCouple,
  readCouple,
  readCoupleMatches,
  saveCouplePreferences as apiSaveCouplePreferences,
  unlinkCouple as apiUnlinkCouple,
  login as apiLogin,
  logout as apiLogout,
  readAccount,
  readCurrentUser,
  clearSession,
  refreshSession,
  registerUser,
  requestPasswordReset,
  resetPassword,
  saveProfile,
  updateAccount as apiUpdateAccount,
} from "./auth-api";
import type {
  AuthStatus,
  AuthUser,
  CoupleInvite,
  CoupleMatch,
  CoupleProfile,
  SavedGamePreferences,
  UserProfileRecord,
} from "./types";

interface AuthStore {
  status: AuthStatus;
  user: AuthUser | null;
  profile: UserProfileRecord | null;
  couple: CoupleProfile | null;
  coupleInvite: CoupleInvite | null;
  coupleMatches: CoupleMatch[];
  busy: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (input: {
    email: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  acceptInvite: (token: string, password: string) => Promise<void>;
  requestReset: (email: string, resetUrl: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  savePreferences: (preferences: SavedGamePreferences | null) => Promise<void>;
  updateAccount: (input: { firstName: string; lastName: string }) => Promise<void>;
  createCoupleInvite: () => Promise<CoupleInvite>;
  linkCouple: (code: string) => Promise<void>;
  unlinkCouple: () => Promise<void>;
  saveCouplePreferences: (preferences: unknown | null) => Promise<void>;
  refreshCoupleMatches: () => Promise<void>;
  clearError: () => void;
}

function friendlyError(error: unknown) {
  if (!(error instanceof AuthApiError)) {
    return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
  }

  if (error.code === "INVALID_OTP") return "La cuenta requiere un código de autenticación de dos pasos.";
  if (error.status >= 500) return error.message;
  if (error.status === 401 && error.code === "ACCOUNT_UNAUTHORIZED") return "Tu cuenta no está activa o la sesión venció. Volvé a ingresar.";
  if (error.status === 401) return "Email o contraseña incorrectos.";
  if (error.status === 429) return "Demasiados intentos. Esperá unos minutos y probá otra vez.";
  if (error.code === "INVALID_PAYLOAD") return "Revisá los datos ingresados.";
  if (error.code === "FORBIDDEN") return "Esta acción todavía no está habilitada en el servidor.";
  return error.message;
}

const profileCachePrefix = "pecadoclub-profile-preferences:";

function readCachedProfile(userId: string): UserProfileRecord | null {
  try {
    const raw = localStorage.getItem(`${profileCachePrefix}${userId}`);
    if (!raw) return null;
    const preferences = JSON.parse(raw) as SavedGamePreferences | null;
    return {
      id: `local:${userId}`,
      user: userId,
      preferences,
    };
  } catch {
    return null;
  }
}

function cacheProfile(userId: string, profile: UserProfileRecord | null) {
  try {
    if (profile?.preferences) {
      localStorage.setItem(
        `${profileCachePrefix}${userId}`,
        JSON.stringify(profile.preferences),
      );
    } else if (profile) {
      localStorage.removeItem(`${profileCachePrefix}${userId}`);
    }
  } catch {
    // El almacenamiento local es solo una recuperación; el servidor sigue
    // siendo la fuente principal de preferencias.
  }
}

async function loadAccount() {
  // Única fuente de identidad: Directus, usando el token del propio usuario.
  // Perfiles y parejas son opcionales incluso ante 502/504, timeout o fallos de red.
  const user = await readCurrentUser();
  const [account, couple] = await Promise.all([
    readAccount().catch(() => null),
    readCouple().catch(() => null),
  ]);
  let profile = readCachedProfile(user.id);
  if (account?.user?.id === user.id && account.profile?.user === user.id) {
    profile = account.profile;
    cacheProfile(user.id, profile);
  } else if (account?.user?.id === user.id && account.profile === null && account.profile_available === true) {
    // Lectura exitosa sin preferencias: no resucitar una copia borrada en otro equipo.
    profile = null;
    cacheProfile(user.id, { id: `local:${user.id}`, user: user.id, preferences: null });
  }
  return { user, profile, couple };
}

let initialization: Promise<void> | null = null;
let authRequestRevision = 0;

export const useAuthStore = create<AuthStore>((set, get) => ({
  status: "initializing",
  user: null,
  profile: null,
  couple: null,
  coupleInvite: null,
  coupleMatches: [],
  busy: false,
  error: null,

  async initialize() {
    if (get().status !== "initializing") return;
    // React StrictMode monta el efecto dos veces. Un único refresh evita
    // rotaciones de cookie simultáneas que cancelaban sesiones válidas.
    if (initialization) return initialization;
    const revision = ++authRequestRevision;
    initialization = (async () => {
      try {
        await refreshSession(() =>
          set({ status: "anonymous", user: null, profile: null, couple: null, coupleInvite: null, coupleMatches: [] }),
        );
        const account = await loadAccount();
        if (revision !== authRequestRevision) return;
        set({ status: "authenticated", ...account, error: null });
      } catch {
        if (revision !== authRequestRevision) return;
        clearSession();
        set({ status: "anonymous", user: null, profile: null, couple: null, coupleInvite: null, coupleMatches: [], error: null });
      }
    })().finally(() => { initialization = null; });
    return initialization;
  },

  async login(email, password) {
    const revision = ++authRequestRevision;
    set({ busy: true, error: null });
    try {
      await apiLogin(email, password, () =>
        set({ status: "anonymous", user: null, profile: null, couple: null, coupleInvite: null, coupleMatches: [] }),
      );
      const account = await loadAccount();
      if (revision !== authRequestRevision) return;
      set({ status: "authenticated", ...account });
    } catch (error) {
      if (revision !== authRequestRevision) return;
      clearSession();
      set({ status: "anonymous", user: null, profile: null, couple: null, coupleInvite: null, coupleMatches: [], error: friendlyError(error) });
      throw error;
    } finally {
      if (revision === authRequestRevision) set({ busy: false });
    }
  },

  async logout() {
    authRequestRevision++;
    set({ busy: true, error: null });
    try {
      await apiLogout();
    } finally {
      set({ status: "anonymous", user: null, profile: null, couple: null, coupleInvite: null, coupleMatches: [], busy: false });
    }
  },

  async register(input) {
    set({ busy: true, error: null });
    try {
      await registerUser(input);
    } catch (error) {
      set({ error: friendlyError(error) });
      throw error;
    } finally {
      set({ busy: false });
    }
  },

  async acceptInvite(token, password) {
    set({ busy: true, error: null });
    try {
      await apiAcceptInvite(token, password);
    } catch (error) {
      set({ error: friendlyError(error) });
      throw error;
    } finally {
      set({ busy: false });
    }
  },

  async requestReset(email, resetUrl) {
    set({ busy: true, error: null });
    try {
      await requestPasswordReset(email, resetUrl);
    } catch (error) {
      // Directus puede responder 403 tanto para cuentas inexistentes como inactivas.
      // Se trata como éxito para no revelar qué emails están registrados.
      if (!(error instanceof AuthApiError) || ![403, 404].includes(error.status)) {
        set({ error: friendlyError(error) });
        throw error;
      }
    } finally {
      set({ busy: false });
    }
  },

  async resetPassword(token, password) {
    set({ busy: true, error: null });
    try {
      await resetPassword(token, password);
    } catch (error) {
      set({ error: friendlyError(error) });
      throw error;
    } finally {
      set({ busy: false });
    }
  },

  async savePreferences(preferences) {
    const { user } = get();
    if (!user) throw new Error("Tenés que iniciar sesión.");
    set({ busy: true, error: null });
    try {
      const saved = await saveProfile(preferences);
      cacheProfile(user.id, saved);
      set({ profile: saved });
    } catch (error) {
      set({ error: friendlyError(error) });
      throw error;
    } finally {
      set({ busy: false });
    }
  },

  async updateAccount(input) {
    if (!get().user) throw new Error("Tenés que iniciar sesión.");
    set({ busy: true, error: null });
    try {
      const user = await apiUpdateAccount(input);
      set({ user });
    } catch (error) {
      set({ error: friendlyError(error) });
      throw error;
    } finally {
      set({ busy: false });
    }
  },

  async createCoupleInvite() {
    if (!get().user) throw new Error("Tenés que iniciar sesión.");
    set({ busy: true, error: null });
    try {
      const coupleInvite = await apiCreateCoupleInvite();
      set({ coupleInvite });
      return coupleInvite;
    } catch (error) {
      set({ error: friendlyError(error) });
      throw error;
    } finally {
      set({ busy: false });
    }
  },

  async linkCouple(code) {
    if (!get().user) throw new Error("Tenés que iniciar sesión.");
    set({ busy: true, error: null });
    try {
      const couple = await apiLinkCouple(code);
      set({ couple, coupleInvite: null });
    } catch (error) {
      set({ error: friendlyError(error) });
      throw error;
    } finally {
      set({ busy: false });
    }
  },

  async unlinkCouple() {
    if (!get().user) throw new Error("Tenés que iniciar sesión.");
    set({ busy: true, error: null });
    try {
      await apiUnlinkCouple();
      set({ couple: null, coupleInvite: null, coupleMatches: [] });
    } catch (error) {
      set({ error: friendlyError(error) });
      throw error;
    } finally {
      set({ busy: false });
    }
  },

  async saveCouplePreferences(preferences) {
    if (!get().couple) throw new Error("No hay una pareja vinculada.");
    set({ busy: true, error: null });
    try {
      const current = get().couple;
      if (!current) throw new Error("No hay una pareja vinculada.");
      const couple = await apiSaveCouplePreferences(preferences, current.preferences_revision);
      set({ couple });
    } catch (error) {
      set({ error: friendlyError(error) });
      throw error;
    } finally {
      set({ busy: false });
    }
  },

  async refreshCoupleMatches() {
    if (!get().couple) {
      set({ coupleMatches: [] });
      return;
    }
    try {
      set({ coupleMatches: await readCoupleMatches() });
    } catch (error) {
      set({ error: friendlyError(error) });
      throw error;
    }
  },

  clearError() {
    set({ error: null });
  },
}));
