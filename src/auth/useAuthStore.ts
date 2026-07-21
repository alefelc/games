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

  if (error.status === 401 && error.code === "ACCOUNT_UNAUTHORIZED") return "Tu sesión venció. Volvé a ingresar.";
  if (error.status === 401) return "Email o contraseña incorrectos.";
  if (error.status === 429) return "Demasiados intentos. Esperá unos minutos y probá otra vez.";
  if (error.code === "INVALID_PAYLOAD") return "Revisá los datos ingresados.";
  if (error.code === "FORBIDDEN") return "Esta acción todavía no está habilitada en el servidor.";
  return error.message;
}

async function loadAccount() {
  const account = await readAccount();
  let couple: CoupleProfile | null = null;
  try {
    couple = await readCouple();
  } catch (error) {
    if (!(error instanceof AuthApiError) || ![404, 503].includes(error.status)) throw error;
  }
  return { ...account, couple };
}

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
    try {
      await refreshSession(() =>
        set({ status: "anonymous", user: null, profile: null, couple: null, coupleInvite: null, coupleMatches: [] }),
      );
      const account = await loadAccount();
      set({ status: "authenticated", ...account, error: null });
    } catch {
      set({ status: "anonymous", user: null, profile: null, couple: null, coupleInvite: null, coupleMatches: [], error: null });
    }
  },

  async login(email, password) {
    set({ busy: true, error: null });
    try {
      await apiLogin(email, password, () =>
        set({ status: "anonymous", user: null, profile: null, couple: null, coupleInvite: null, coupleMatches: [] }),
      );
      const account = await loadAccount();
      set({ status: "authenticated", ...account });
    } catch (error) {
      set({ error: friendlyError(error) });
      throw error;
    } finally {
      set({ busy: false });
    }
  },

  async logout() {
    set({ busy: true, error: null });
    try {
      await apiLogout();
      set({ status: "anonymous", user: null, profile: null, couple: null, coupleInvite: null, coupleMatches: [] });
    } finally {
      set({ busy: false });
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
      const couple = await apiSaveCouplePreferences(preferences);
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
