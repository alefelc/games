import { useEffect, useMemo, useState } from "react";
import type { ContentBundle } from "../types";
import { TopBar } from "../components/TopBar";
import { Icon } from "../components/Icon";
import { useAuthStore } from "../auth/useAuthStore";
import type { SavedGamePreferences } from "../auth/types";
import { resolveDefaultCards, resolveMaximumCards } from "../lib/cardCount";
import { clearCoupleCodeFromLocation, readCoupleCodeFromLocation } from "../auth/couple-link";

export function ProfileScreen({
  content,
  onBack,
  onEditDefaults,
  onLoggedOut,
}: {
  content: ContentBundle;
  onBack: () => void;
  onEditDefaults: () => void;
  onLoggedOut: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const busy = useAuthStore((state) => state.busy);
  const error = useAuthStore((state) => state.error);
  const savePreferences = useAuthStore((state) => state.savePreferences);
  const updateAccount = useAuthStore((state) => state.updateAccount);
  const logout = useAuthStore((state) => state.logout);
  const couple = useAuthStore((state) => state.couple);
  const coupleInvite = useAuthStore((state) => state.coupleInvite);
  const coupleMatches = useAuthStore((state) => state.coupleMatches);
  const createCoupleInvite = useAuthStore((state) => state.createCoupleInvite);
  const linkCouple = useAuthStore((state) => state.linkCouple);
  const unlinkCouple = useAuthStore((state) => state.unlinkCouple);
  const refreshCoupleMatches = useAuthStore((state) => state.refreshCoupleMatches);
  const existing = profile?.preferences ?? null;
  const orderedLevels = useMemo(
    () => [...content.levels].sort((a, b) => a.intensity_order - b.intensity_order),
    [content.levels],
  );
  const defaultMode =
    content.modes.find((item) => item.id === content.settings.default_mode) ??
    content.modes[0];
  const intensityDefinition = content.filters?.find(
    (item) => item.key === "maxIntensity" || item.numeric_field === "intensity",
  );
  const intensityMinimum = Number(intensityDefinition?.min_value ?? orderedLevels[0]?.intensity_order ?? 1);
  const intensityMaximum = Number(
    intensityDefinition?.max_value ?? orderedLevels.at(-1)?.intensity_order ?? 7,
  );
  const savedLevelMaximum = Math.max(
    intensityMinimum,
    ...content.levels
      .filter((item) => existing?.levelSlugs.includes(item.slug))
      .map((item) => item.intensity_order),
  );
  const [accountFirstName, setAccountFirstName] = useState(user?.first_name ?? "");
  const [accountLastName, setAccountLastName] = useState(user?.last_name ?? "");
  const [playerOne, setPlayerOne] = useState(existing?.playerOne ?? user?.first_name ?? "");
  const [playerTwo, setPlayerTwo] = useState(existing?.playerTwo ?? "");
  const [playerOneSexSlug, setPlayerOneSexSlug] = useState(existing?.playerOneSexSlug ?? "");
  const [playerTwoSexSlug, setPlayerTwoSexSlug] = useState(existing?.playerTwoSexSlug ?? "");
  const [modeSlug, setModeSlug] = useState(existing?.modeSlug ?? defaultMode?.slug ?? "");
  const [maximumIntensity, setMaximumIntensity] = useState(() =>
    Math.min(
      intensityMaximum,
      Math.max(
        intensityMinimum,
        Number(
          existing?.filters.maxIntensity ??
            savedLevelMaximum ??
            content.settings.default_intensity_level ??
            intensityMinimum,
        ),
      ),
    ),
  );
  const [maxCards, setMaxCards] = useState(
    existing?.maxCards ?? resolveDefaultCards(content.settings),
  );
  const [gameMasterEnabled, setGameMasterEnabled] = useState(
    existing?.gameMasterEnabled ?? content.settings.game_master_default_on,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const initialCoupleCode = readCoupleCodeFromLocation();
  const [coupleCode, setCoupleCode] = useState(initialCoupleCode);

  useEffect(() => {
    if (!couple) return;
    void refreshCoupleMatches().catch(() => undefined);
  }, [couple?.id, refreshCoupleMatches]);

  const summary = useMemo(() => {
    if (!existing) return null;
    const mode = content.modes.find((item) => item.slug === existing.modeSlug)?.name;
    const levels = content.levels
      .filter((item) => existing.levelSlugs.includes(item.slug))
      .map((item) => item.name);
    return { mode, levels };
  }, [content, existing]);

  const saveAccountDetails = async () => {
    setNotice(null);
    try {
      await updateAccount({
        firstName: accountFirstName.trim(),
        lastName: accountLastName.trim(),
      });
      setNotice("Datos de la cuenta actualizados.");
    } catch {
      // El store muestra el error.
    }
  };

  const saveGameDefaults = async () => {
    setNotice(null);
    const base: SavedGamePreferences = existing ?? {
      version: 1,
      playerOne: "",
      playerTwo: "",
      playerOneSexSlug: null,
      playerTwoSexSlug: null,
      modeSlug: null,
      levelSlugs: [],
      deckSlugs: [],
      elementSlugs: [],
      toySlugs: [],
      filters: {},
      maxCards: resolveDefaultCards(content.settings),
      gameMasterEnabled: content.settings.game_master_default_on,
    };
    const selectedMode = content.modes.find((item) => item.slug === modeSlug);
    const isSolo = selectedMode?.slug === "solitario" || selectedMode?.turn_mode === "single";
    const modeChanged = Boolean(existing?.modeSlug && existing.modeSlug !== modeSlug);
    const levelSlugs = ["previa-solamente", "solo-previa"].includes(modeSlug)
      ? orderedLevels.filter((item) => item.slug === "previa").map((item) => item.slug)
      : orderedLevels
          .filter((item) => item.intensity_order <= maximumIntensity)
          .map((item) => item.slug);
    const compatibleDeckSlugs = content.decks
      .filter(
        (deck) =>
          deck.active &&
          (isSolo
            ? deck.minimum_players <= 1 && deck.maximum_players >= 1
            : deck.minimum_players <= 2 && deck.maximum_players >= 2),
      )
      .map((deck) => deck.slug);
    try {
      await savePreferences({
        ...base,
        playerOne: playerOne.trim(),
        playerTwo: playerTwo.trim(),
        playerOneSexSlug: playerOneSexSlug || null,
        playerTwoSexSlug: playerTwoSexSlug || null,
        modeSlug: modeSlug || null,
        levelSlugs,
        deckSlugs: modeChanged ? compatibleDeckSlugs : base.deckSlugs,
        filters: { ...base.filters, maxIntensity: maximumIntensity },
        maxCards: Math.max(5, Math.min(resolveMaximumCards(content.settings), maxCards)),
        gameMasterEnabled:
          content.settings.game_master_enabled && gameMasterEnabled,
      });
      setNotice("Preferencias de juego guardadas.");
    } catch {
      // El store muestra el error.
    }
  };

  const clearDefaults = async () => {
    if (!window.confirm("¿Borrar toda la configuración predeterminada guardada?")) return;
    try {
      await savePreferences(null);
      setNotice("Preferencias eliminadas.");
    } catch {
      // El store muestra el error.
    }
  };

  const generateCoupleInvite = async () => {
    setNotice(null);
    try {
      await createCoupleInvite();
      setNotice("Invitación privada creada. Compartila solo con tu pareja.");
    } catch {
      // El store muestra el error.
    }
  };

  const connectCouple = async () => {
    const code = coupleCode.trim();
    if (!code) return;
    setNotice(null);
    try {
      await linkCouple(code);
      setCoupleCode("");
      clearCoupleCodeFromLocation();
      setNotice("Las cuentas quedaron vinculadas de forma privada.");
    } catch {
      // El store muestra el error.
    }
  };

  const disconnectCouple = async () => {
    if (!window.confirm("¿Desvincular las cuentas? El historial compartido dejará de estar disponible.")) return;
    setNotice(null);
    try {
      await unlinkCouple();
      setNotice("Las cuentas fueron desvinculadas.");
    } catch {
      // El store muestra el error.
    }
  };

  const signOut = async () => {
    await logout();
    onLoggedOut();
  };

  return (
    <div className="app-page profile-page">
      <TopBar content={content} onBack={onBack} />
      <main className="profile-shell narrow-page">
        <section className="profile-header-card">
          <div className="profile-avatar">
            {(playerOne || user?.first_name || user?.email || "U").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="eyebrow">MI PERFIL</p>
            <h1>{playerOne || user?.first_name || "Tu cuenta"}</h1>
            <p>{user?.email}</p>
          </div>
        </section>

        <section className="profile-card">
          <h2>Datos de la cuenta</h2>
          <p>Estos datos identifican tu perfil. El email no se puede cambiar desde el juego.</p>
          <div className="auth-name-grid">
            <label>
              <span>Nombre</span>
              <input maxLength={80} value={accountFirstName} onChange={(event) => setAccountFirstName(event.target.value)} autoComplete="given-name" />
            </label>
            <label>
              <span>Apellido</span>
              <input maxLength={80} value={accountLastName} onChange={(event) => setAccountLastName(event.target.value)} autoComplete="family-name" />
            </label>
          </div>
          <button className="secondary-button wide" type="button" disabled={busy} onClick={() => void saveAccountDetails()}>
            Guardar datos de la cuenta
          </button>
        </section>

        <section className="profile-card">
          <h2>Personas que juegan</h2>
          <p>Estos datos se completarán automáticamente en cada partida.</p>
          <div className="auth-name-grid">
            <label>
              <span>Tu nombre</span>
              <input maxLength={24} value={playerOne} onChange={(event) => setPlayerOne(event.target.value)} placeholder="Vos" />
            </label>
            <label>
              <span>Nombre de tu pareja</span>
              <input maxLength={24} value={playerTwo} onChange={(event) => setPlayerTwo(event.target.value)} placeholder="Tu pareja" />
            </label>
            <label>
              <span>Tu sexo</span>
              <select value={playerOneSexSlug} onChange={(event) => setPlayerOneSexSlug(event.target.value)}>
                <option value="">Sin definir</option>
                {content.sexes.map((sex) => <option key={sex.id} value={sex.slug}>{sex.name}</option>)}
              </select>
            </label>
            <label>
              <span>Sexo de tu pareja</span>
              <select value={playerTwoSexSlug} onChange={(event) => setPlayerTwoSexSlug(event.target.value)}>
                <option value="">Sin definir</option>
                {content.sexes.map((sex) => <option key={sex.id} value={sex.slug}>{sex.name}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-section-heading">
            <div>
              <h2>Partida predeterminada</h2>
              <p>Estas opciones se cargarán cada vez que prepares una partida.</p>
            </div>
            <Icon name="settings" />
          </div>
          <div className="auth-name-grid">
            <label>
              <span>Modo de juego</span>
              <select value={modeSlug} onChange={(event) => setModeSlug(event.target.value)}>
                {content.modes.map((mode) => <option key={mode.id} value={mode.slug}>{mode.name}</option>)}
              </select>
            </label>
            <label>
              <span>Dirección adaptativa</span>
              <select
                value={gameMasterEnabled ? "on" : "off"}
                disabled={!content.settings.game_master_enabled}
                onChange={(event) => setGameMasterEnabled(event.target.value === "on")}
              >
                <option value="on">Activada</option>
                <option value="off">Desactivada</option>
              </select>
            </label>
          </div>
          <label className="profile-range-row">
            <span>Intensidad / nivel máximo</span>
            <small>Nivel {maximumIntensity} de {intensityMaximum}. La partida empezará más abajo y avanzará hasta este nivel.</small>
            <input
              type="range"
              min={intensityMinimum}
              max={intensityMaximum}
              step="1"
              value={maximumIntensity}
              onChange={(event) => setMaximumIntensity(Number(event.target.value))}
            />
          </label>
          <label className="profile-range-row">
            <span>Duración predeterminada</span>
            <small>{maxCards} cartas por partida.</small>
            <input
              type="range"
              min="5"
              max={resolveMaximumCards(content.settings)}
              step="5"
              value={maxCards}
              onChange={(event) => setMaxCards(Number(event.target.value))}
            />
          </label>
          <button className="primary-button wide" type="button" disabled={busy} onClick={() => void saveGameDefaults()}>
            {busy ? "Guardando…" : "Guardar preferencias"}
          </button>
        </section>

        <section className="profile-card couple-profile-card">
          <div className="profile-section-heading">
            <div>
              <h2>Pareja vinculada</h2>
              <p>La vinculación permite compartir preferencias e historial sin mostrar respuestas privadas.</p>
            </div>
            <Icon name="hearts" />
          </div>

          {couple ? (
            <>
              <div className="couple-linked-summary">
                <span className="couple-status-dot" />
                <div>
                  <b>
                    {couple.partner
                      ? [couple.partner.first_name, couple.partner.last_name].filter(Boolean).join(" ") || "Tu pareja"
                      : "Esperando información de tu pareja"}
                  </b>
                  <small>Vinculación privada activa</small>
                </div>
              </div>
              <div className="preference-summary couple-summary-grid">
                <div><span>Coincidencias reveladas</span><b>{coupleMatches.length}</b></div>
                <div><span>Privacidad</span><b>Rechazos ocultos</b></div>
              </div>
              <p className="couple-privacy-note">
                Cada respuesta se guarda por separado. Solo se revela una carta cuando ambas personas muestran interés o aceptan hablarla.
              </p>
              <button className="text-button danger-text" type="button" disabled={busy} onClick={() => void disconnectCouple()}>
                Desvincular pareja
              </button>
            </>
          ) : (
            <>
              <div className="couple-actions-grid">
                <div className="couple-action-box">
                  <b>Invitar a mi pareja</b>
                  <p>Creá un enlace de un solo uso que vence automáticamente.</p>
                  <button className="secondary-button wide" type="button" disabled={busy} onClick={() => void generateCoupleInvite()}>
                    Crear invitación privada
                  </button>
                </div>
                <div className="couple-action-box">
                  <b>Ingresar una invitación</b>
                  <p>Pegá el código recibido desde la cuenta de tu pareja.</p>
                  <input
                    value={coupleCode}
                    onChange={(event) => setCoupleCode(event.target.value)}
                    placeholder="Código privado"
                    autoComplete="off"
                  />
                  <button className="primary-button wide" type="button" disabled={busy || !coupleCode.trim()} onClick={() => void connectCouple()}>
                    Vincular cuentas
                  </button>
                </div>
              </div>
              {coupleInvite && (
                <div className="couple-invite-result">
                  <b>Enlace listo para compartir</b>
                  <input readOnly value={coupleInvite.link} aria-label="Enlace de invitación" />
                  <small>Vence el {new Date(coupleInvite.expires_at).toLocaleDateString("es-AR")} y el código deja de servir después de usarlo.</small>
                </div>
              )}
            </>
          )}
        </section>

        <section className="profile-card">
          <div className="profile-section-heading">
            <div>
              <h2>Configuración predeterminada</h2>
              <p>La próxima partida arrancará con estas preferencias.</p>
            </div>
            <Icon name="check" />
          </div>

          {existing ? (
            <div className="preference-summary">
              <div><span>Modo</span><b>{summary?.mode || "Predeterminado"}</b></div>
              <div><span>Niveles</span><b>{summary?.levels.join(", ") || "Predeterminados"}</b></div>
              <div><span>Intensidad máxima</span><b>{String(existing.filters.maxIntensity ?? "Predeterminada")}</b></div>
              <div><span>Cartas</span><b>{existing.maxCards}</b></div>
              <div><span>IA adaptativa</span><b>{existing.gameMasterEnabled ? "Activada" : "Desactivada"}</b></div>
              <div><span>Elementos</span><b>{existing.elementSlugs.length}</b></div>
              <div><span>Juguetes</span><b>{existing.toySlugs.length}</b></div>
            </div>
          ) : (
            <div className="empty-preferences">
              <Icon name="refresh" />
              <p>Todavía no guardaste una configuración.</p>
            </div>
          )}

          <button className="secondary-button wide" type="button" onClick={onEditDefaults}>
            Editar elementos, juguetes y límites
          </button>
          {existing && (
            <button className="text-button danger-text" type="button" disabled={busy} onClick={() => void clearDefaults()}>
              Borrar configuración guardada
            </button>
          )}
        </section>

        {(error || notice) && <div className={`auth-message ${error ? "error" : "success"}`}>{error || notice}</div>}

        <button className="logout-button" type="button" disabled={busy} onClick={() => void signOut()}>
          Cerrar sesión
        </button>
      </main>
    </div>
  );
}
