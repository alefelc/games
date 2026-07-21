import { create } from "zustand";
import {
  AuthApiError,
  acceptInvite as apiAcceptInvite,
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
import type { AuthStatus, AuthUser, SavedGamePreferences, UserProfileRecord } from "./types";

interface AuthStore {
  status: AuthStatus;
  user: AuthUser | null;
  profile: UserProfileRecord | null;
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
  return readAccount();
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  status: "initializing",
  user: null,
  profile: null,
  busy: false,
  error: null,

  async initialize() {
    if (get().status !== "initializing") return;
    try {
      await refreshSession(() =>
        set({ status: "anonymous", user: null, profile: null }),
      );
      const account = await loadAccount();
      set({ status: "authenticated", ...account, error: null });
    } catch {
      set({ status: "anonymous", user: null, profile: null, error: null });
    }
  },

  async login(email, password) {
    set({ busy: true, error: null });
    try {
      await apiLogin(email, password, () =>
        set({ status: "anonymous", user: null, profile: null }),
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
      set({ status: "anonymous", user: null, profile: null });
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

  clearError() {
    set({ error: null });
  },
}));
