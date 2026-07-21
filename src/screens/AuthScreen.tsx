import { useEffect, useState } from "react";
import type { ContentBundle } from "../types";
import { TopBar } from "../components/TopBar";
import { Icon } from "../components/Icon";
import { useAuthStore } from "../auth/useAuthStore";

export type AuthMode =
  | "login"
  | "register"
  | "forgot"
  | "accept-invite"
  | "reset";

function passwordError(password: string) {
  if (password.length < 10) return "Usá al menos 10 caracteres.";
  if (!/[A-ZÁÉÍÓÚÑ]/.test(password)) return "Agregá una mayúscula.";
  if (!/[a-záéíóúñ]/.test(password)) return "Agregá una minúscula.";
  if (!/\d/.test(password)) return "Agregá un número.";
  return null;
}

export function AuthScreen({
  content,
  initialMode = "login",
  token,
  onBack,
  onAuthenticated,
}: {
  content: ContentBundle;
  initialMode?: AuthMode;
  token?: string | null;
  onBack: () => void;
  onAuthenticated: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const busy = useAuthStore((state) => state.busy);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const acceptInvite = useAuthStore((state) => state.acceptInvite);
  const requestReset = useAuthStore((state) => state.requestReset);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const clearError = useAuthStore((state) => state.clearError);

  const resetUrl = new URL(
    "?auth=reset-password",
    window.location.origin + window.location.pathname,
  ).toString();

  useEffect(() => {
    setMode(initialMode);
    clearError();
  }, [initialMode, clearError]);

  const switchMode = (next: AuthMode) => {
    clearError();
    setNotice(null);
    setPassword("");
    setRepeatPassword("");
    setMode(next);
  };

  const validateNewPassword = () => {
    const issue = passwordError(password);
    if (issue) {
      setNotice(issue);
      return false;
    }
    if (password !== repeatPassword) {
      setNotice("Las contraseñas no coinciden.");
      return false;
    }
    return true;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setNotice(null);

    try {
      if (mode === "login") {
        await login(email.trim().toLowerCase(), password);
        onAuthenticated();
        return;
      }

      if (mode === "register") {
        await register({
          email: email.trim().toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
        setNotice(
          "Si el email puede registrarse, vas a recibir una invitación para crear la contraseña y activar la cuenta.",
        );
        return;
      }

      if (mode === "forgot") {
        await requestReset(email.trim().toLowerCase(), resetUrl);
        setNotice(
          "Si existe una cuenta activa con ese email, vas a recibir un enlace para cambiar la contraseña.",
        );
        return;
      }

      if (mode === "accept-invite") {
        if (!token) {
          setNotice("El enlace de activación no contiene un token válido.");
          return;
        }
        if (!validateNewPassword()) return;
        await acceptInvite(token, password);
        window.history.replaceState({}, "", window.location.pathname);
        setPassword("");
        setRepeatPassword("");
        setMode("login");
        setNotice("Cuenta activada. Ya podés ingresar con tu email y contraseña.");
        return;
      }

      if (mode === "reset") {
        if (!token) {
          setNotice("El enlace no contiene un token válido.");
          return;
        }
        if (!validateNewPassword()) return;
        await resetPassword(token, password);
        window.history.replaceState({}, "", window.location.pathname);
        setPassword("");
        setRepeatPassword("");
        setMode("login");
        setNotice("Contraseña actualizada. Ya podés ingresar.");
      }
    } catch {
      // El store expone el mensaje ya normalizado.
    }
  };

  const title = {
    login: "Ingresá a tu cuenta",
    register: "Creá tu cuenta",
    forgot: "Recuperá el acceso",
    "accept-invite": "Activá tu cuenta",
    reset: "Nueva contraseña",
  }[mode];

  const isPasswordSetup = mode === "accept-invite" || mode === "reset";

  return (
    <div className="app-page auth-page">
      <TopBar content={content} onBack={onBack} />
      <main className="auth-shell narrow-page">
        <section className="auth-card">
          <div className="auth-heading">
            <span className="auth-icon"><Icon name="lock" /></span>
            <p className="eyebrow">TU PARTIDA, TUS PREFERENCIAS</p>
            <h1>{title}</h1>
            <p>
              {mode === "register"
                ? "Ingresá tus datos. Te enviaremos un enlace para elegir la contraseña y activar la cuenta."
                : mode === "forgot"
                  ? "Te enviaremos un enlace seguro para recuperar tu cuenta."
                  : mode === "accept-invite"
                    ? "Elegí una contraseña para terminar la activación."
                    : mode === "reset"
                      ? "Elegí una contraseña nueva y difícil de adivinar."
                      : "Recuperá tus preferencias sin configurar todo de nuevo."}
            </p>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {mode === "register" && (
              <div className="auth-name-grid">
                <label>
                  <span>Nombre</span>
                  <input required autoComplete="given-name" maxLength={50} value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                </label>
                <label>
                  <span>Apellido</span>
                  <input required autoComplete="family-name" maxLength={50} value={lastName} onChange={(event) => setLastName(event.target.value)} />
                </label>
              </div>
            )}

            {(mode === "login" || mode === "register" || mode === "forgot") && (
              <label>
                <span>Email</span>
                <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vos@ejemplo.com" />
              </label>
            )}

            {(mode === "login" || isPasswordSetup) && (
              <label>
                <span>{isPasswordSetup ? "Nueva contraseña" : "Contraseña"}</span>
                <input type="password" required autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
            )}

            {isPasswordSetup && (
              <label>
                <span>Repetir contraseña</span>
                <input type="password" required autoComplete="new-password" value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} />
                <small>10 caracteres, una mayúscula, una minúscula y un número.</small>
              </label>
            )}

            {(error || notice) && (
              <div className={`auth-message ${error ? "error" : "success"}`} role="status">
                {error || notice}
              </div>
            )}

            <button className="primary-button wide" type="submit" disabled={busy}>
              {busy
                ? "Procesando…"
                : mode === "login"
                  ? "Ingresar"
                  : mode === "register"
                    ? "Enviar invitación"
                    : mode === "forgot"
                      ? "Enviar enlace"
                      : mode === "accept-invite"
                        ? "Activar cuenta"
                        : "Guardar contraseña"}
            </button>
          </form>

          <div className="auth-links">
            {mode === "login" && (
              <>
                <button type="button" className="text-button" onClick={() => switchMode("forgot")}>Olvidé mi contraseña</button>
                <button type="button" className="text-button" onClick={() => switchMode("register")}>Crear una cuenta</button>
              </>
            )}
            {(mode === "register" || mode === "forgot") && (
              <button type="button" className="text-button" onClick={() => switchMode("login")}>Ya tengo cuenta</button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
