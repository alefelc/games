import { useEffect, useMemo, useState } from "react";
import type { ContentBundle, GameSetup, Id, SafetyFilters } from "../types";
import { Icon } from "../components/Icon";
import { DynamicLimits } from "../components/DynamicLimits";
import { TopBar } from "../components/TopBar";
import { previewEligibleStats } from "../engine/session";
import { checkGameMasterAvailability } from "../api/game-master";
import { intensityDescription, isIntensityMarkerActive } from "../lib/intensitySelector";
import { isSoloResourceCompatible } from "../lib/soloResource";

function toggleId(values: Id[], id: Id): Id[] {
  return values.includes(id)
    ? values.filter((value) => value !== id)
    : [...values, id];
}

function ChoiceToggle({
  checked,
  title,
  description,
  onChange,
}: {
  checked: boolean;
  title: string;
  description?: string | null;
  onChange: () => void;
}) {
  return (
    <button
      className={`choice-toggle ${checked ? "selected" : ""}`}
      type="button"
      onClick={onChange}
      aria-pressed={checked}
    >
      <span className="choice-check">{checked && <Icon name="check" />}</span>
      <span>
        <b>{title}</b>
        {description && <small>{description}</small>}
      </span>
    </button>
  );
}

export function SetupScreen({
  content,
  setup,
  onBack,
  onStart,
  updateSetup,
  updateFilters,
  authenticated,
  hasSavedDefaults = false,
  onSaveDefaults,
}: {
  content: ContentBundle;
  setup: GameSetup;
  onBack: () => void;
  onStart: () => void;
  updateSetup: (patch: Partial<GameSetup>) => void;
  updateFilters: (patch: Partial<SafetyFilters>) => void;
  authenticated: boolean;
  hasSavedDefaults?: boolean;
  onSaveDefaults?: () => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [setupPath, setSetupPath] = useState<"quick" | "custom">("quick");
  const [setupNotice, setSetupNotice] = useState<string | null>(null);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [defaultsNotice, setDefaultsNotice] = useState<string | null>(null);
  const stepContent = [
    {
      label: content.settings.setup_step_1_label,
      title: content.settings.setup_step_1_title,
      subtitle: content.settings.setup_step_1_subtitle,
    },
    {
      label: content.settings.setup_step_2_label,
      title: content.settings.setup_step_2_title,
      subtitle: content.settings.setup_step_2_subtitle,
    },
    {
      label: content.settings.setup_step_3_label,
      title: content.settings.setup_step_3_title,
      subtitle: content.settings.setup_step_3_subtitle,
    },
    {
      label: content.settings.setup_step_4_label,
      title: content.settings.setup_step_4_title,
      subtitle: content.settings.setup_step_4_subtitle,
    },
  ];

  const steps = stepContent.map((item) => item.label);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const selectedMode = content.modes.find((mode) => mode.id === setup.modeId);
  const isSolo =
    selectedMode?.slug === "solitario" || selectedMode?.turn_mode === "single";
  const playerOneSexSlug =
    content.sexes.find((sex) => sex.id === setup.playerOneSexId)?.slug ?? null;

  const matchesSoloResource = (resource: {
    solo_compatible: boolean;
    solo_gender_scope: string;
  }) => !isSolo || isSoloResourceCompatible(resource, playerOneSexSlug);

  const availableDecks = content.decks.filter(
    (deck) =>
      deck.active &&
      (isSolo
        ? deck.minimum_players <= 1 && deck.maximum_players >= 1
        : deck.minimum_players <= 2 && deck.maximum_players >= 2),
  );
  const elementCoverage = useMemo(
    () =>
      new Map(
        content.elements.map((item) => [
          item.id,
          new Set(
            content.cardElements
              .filter((row) => row.element === item.id)
              .map((row) => row.card),
          ).size,
        ]),
      ),
    [content.cardElements, content.elements],
  );
  const toyCoverage = useMemo(
    () =>
      new Map(
        content.toys.map((item) => [
          item.id,
          new Set(
            content.cardToys
              .filter((row) => row.toy === item.id)
              .map((row) => row.card),
          ).size,
        ]),
      ),
    [content.cardToys, content.toys],
  );
  const availableElements = content.elements
    .filter(
      (item) =>
        item.visible_in_setup &&
        matchesSoloResource(item) &&
        (elementCoverage.get(item.id) ?? 0) > 0,
    )
    .sort((a, b) => a.selection_priority - b.selection_priority);
  const availableToys = content.toys
    .filter(
      (item) =>
        item.visible_in_setup &&
        matchesSoloResource(item) &&
        (toyCoverage.get(item.id) ?? 0) > 0,
    )
    .sort((a, b) => a.selection_priority - b.selection_priority);
  const availableFilterDefinitions = useMemo(
    () =>
      content.filters
        .filter((definition) => {
          if (!definition.visible) return false;
          if (definition.filter_kind === "boolean_exclusion") {
            return content.cards.some((card) =>
              definition.card_fields.some((field) =>
                Boolean((card as unknown as Record<string, unknown>)[field]),
              ),
            );
          }
          if (definition.filter_kind === "max_number" && definition.numeric_field) {
            const minimum = Number(definition.min_value ?? 0);
            return content.cards.some(
              (card) =>
                Number(
                  (card as unknown as Record<string, unknown>)[
                    definition.numeric_field as string
                  ] ?? 0,
                ) > minimum,
            );
          }
          return false;
        })
        .map((definition) => {
          if (definition.filter_kind !== "boolean_exclusion") return definition;
          const affected = content.cards.filter((card) =>
            definition.card_fields.some((field) =>
              Boolean((card as unknown as Record<string, unknown>)[field]),
            ),
          ).length;
          return {
            ...definition,
            description: [
              definition.description,
              `${affected} ${affected === 1 ? "carta afectada" : "cartas afectadas"}`,
            ]
              .filter(Boolean)
              .join(" · "),
          };
        }),
    [content.cards, content.filters],
  );
  const intensityDefinition = availableFilterDefinitions.find(
    (definition) =>
      definition.key === "maxIntensity" ||
      definition.numeric_field === "intensity",
  );
  const limitFilterDefinitions = availableFilterDefinitions.filter(
    (definition) => definition !== intensityDefinition,
  );
  const intensityMinimum = Number(intensityDefinition?.min_value ?? 1);
  const intensityMaximum = Number(intensityDefinition?.max_value ?? 7);
  const selectedMaximumIntensity = Math.min(
    intensityMaximum,
    Math.max(
      intensityMinimum,
      Number(
        setup.filters.maxIntensity ??
          content.settings.default_intensity_level ??
          intensityDefinition?.default_number ??
          intensityMinimum,
      ),
    ),
  );
  const orderedLevels = useMemo(
    () => [...content.levels].sort((a, b) => a.intensity_order - b.intensity_order),
    [content.levels],
  );
  const isPreviaOnlyMode = ["previa-solamente", "solo-previa"].includes(selectedMode?.slug ?? "");
  const selectedProgressionCeiling = Math.max(
    1,
    ...orderedLevels
      .filter((level) => setup.levelIds.includes(level.id))
      .map((level) => level.intensity_order),
  );
  const selectMaximumIntensity = (value: number) => {
    const maximum = Math.min(intensityMaximum, Math.max(intensityMinimum, Math.round(value)));
    updateFilters({ maxIntensity: maximum });
  };
  const selectProgressionCeiling = (value: number) => {
    const ceiling = Math.max(1, Math.round(value));
    const includedLevels = orderedLevels
      .filter((level) => level.intensity_order <= ceiling)
      .map((level) => level.id);
    updateSetup({
      levelIds: includedLevels.length ? includedLevels : setup.levelIds,
      intenseConsent: true,
    });
  };

  useEffect(() => {
    if (setupPath !== "quick") return;
    const expected = isPreviaOnlyMode
      ? orderedLevels.filter((level) => level.slug === "previa").map((level) => level.id)
      : orderedLevels.map((level) => level.id);
    if (!expected.length || expected.join("|") === setup.levelIds.join("|")) return;
    updateSetup({ levelIds: expected, intenseConsent: true });
  }, [isPreviaOnlyMode, orderedLevels, setup.levelIds, setupPath, updateSetup]);

  const eligibleStats = useMemo(
    () => previewEligibleStats(content, setup),
    [content, setup],
  );
  const eligibleCount = eligibleStats.total;
  const [gameMasterStatus, setGameMasterStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");
  const [gameMasterReason, setGameMasterReason] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void checkGameMasterAvailability().then((result) => {
      if (!active) return;
      setGameMasterStatus(result.status);
      setGameMasterReason(result.status === "offline" ? result.reason : null);
    });
    return () => {
      active = false;
    };
  }, []);

  const gameMasterAvailable = gameMasterStatus === "online";
  const peopleConfigured = Boolean(
    setup.playerOneSexId && (isSolo || setup.playerTwoSexId),
  );
  const canStart = Boolean(
    peopleConfigured &&
      setup.modeId &&
      setup.levelIds.length &&
      eligibleCount > 0,
  );

  const selectMode = (modeId: Id) => {
    const mode = content.modes.find((item) => item.id === modeId);
    const solo = mode?.slug === "solitario" || mode?.turn_mode === "single";
    const deckIds = content.decks
      .filter(
        (deck) =>
          deck.active &&
          (solo
            ? deck.minimum_players <= 1 && deck.maximum_players >= 1
            : deck.minimum_players <= 2 && deck.maximum_players >= 2),
      )
      .map((deck) => deck.id);

    if (["previa-solamente", "solo-previa"].includes(mode?.slug ?? "")) {
      const previa = content.levels.find((level) => level.slug === "previa");
      updateSetup({
        modeId,
        deckIds,
        levelIds: previa ? [previa.id] : setup.levelIds,
        intenseConsent: true,
      });
      return;
    }

    const restoreFullProgression = ["previa-solamente", "solo-previa"].includes(selectedMode?.slug ?? "");
    updateSetup({
      modeId,
      deckIds,
      levelIds: restoreFullProgression ? orderedLevels.map((level) => level.id) : setup.levelIds,
      playerTwo: solo ? "" : setup.playerTwo,
      playerTwoSexId: solo ? null : setup.playerTwoSexId,
      elementIds: solo
        ? setup.elementIds.filter((id) =>
            content.elements.some(
              (item) =>
                item.id === id &&
                isSoloResourceCompatible(item, playerOneSexSlug),
            ),
          )
        : setup.elementIds,
      toyIds: solo
        ? setup.toyIds.filter((id) =>
            content.toys.some(
              (toy) =>
                toy.id === id &&
                isSoloResourceCompatible(toy, playerOneSexSlug),
            ),
          )
        : setup.toyIds,
    });
  };

  const prepareSurprise = () => {
    const ceiling = Math.max(intensityMinimum, selectedMaximumIntensity);
    const floor = Math.min(ceiling, Math.max(intensityMinimum, 2));
    const surpriseIntensity = floor + Math.floor(Math.random() * (ceiling - floor + 1));
    const chooseSome = <T extends { id: Id }>(values: T[], maximum: number) =>
      [...values]
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(values.length, Math.floor(Math.random() * (maximum + 1))))
        .map((item) => item.id);
    selectMaximumIntensity(surpriseIntensity);
    updateSetup({
      elementIds: chooseSome(availableElements, 2),
      toyIds: chooseSome(availableToys, 1),
      maxCards: [10, 15, 20][Math.floor(Math.random() * 3)] ?? 15,
      gameMasterEnabled: content.settings.game_master_enabled,
    });
    setSetupPath("quick");
    setSetupNotice("Preparamos una combinación sorpresa dentro de tus límites. Podés revisarla antes de empezar.");
  };

  return (
    <div className="app-page setup-page">
      <TopBar
        content={content}
        onBack={step === 0 ? onBack : () => setStep((value) => value - 1)}
      />
      <main className="setup-main">
        {setupPath === "custom" && (
          <div className="setup-progress">
            {steps.map((label, index) => (
              <div key={label} className={index <= step ? "active" : ""}>
                <span>{index + 1}</span>
                <small>{label}</small>
              </div>
            ))}
          </div>
        )}

        {step === 0 && (
          <section className="setup-section">
            <p className="eyebrow">PASO 1 DE 4</p>
            <h1>{stepContent[0].title}</h1>
            <p className="section-copy">{stepContent[0].subtitle}</p>

            <h2 className="subheading">Cómo querés preparar la partida</h2>
            <div className="setup-path-grid">
              <button className={`setup-path-card ${setupPath === "quick" ? "selected" : ""}`} type="button" onClick={() => { setSetupPath("quick"); setSetupNotice(null); }}>
                <Icon name="flame" />
                <span><b>Partida rápida</b><small>Personas, intensidad y duración. Nada más.</small></span>
              </button>
              <button className={`setup-path-card ${setupPath === "custom" ? "selected" : ""}`} type="button" onClick={() => { setSetupPath("custom"); setSetupNotice(null); }}>
                <Icon name="settings" />
                <span><b>Personalizada</b><small>Incluye inventario, límites y filtros.</small></span>
              </button>
              <button className="setup-path-card" type="button" onClick={prepareSurprise}>
                <Icon name="dice" />
                <span><b>Sorprendernos</b><small>Combina opciones dentro del máximo elegido.</small></span>
              </button>
              {authenticated && hasSavedDefaults && (
                <button className="setup-path-card" type="button" onClick={() => { setSetupPath("quick"); setSetupNotice("Cargamos tu configuración habitual. Revisala y empezá cuando quieras."); }}>
                  <Icon name="check" />
                  <span><b>Usar mi configuración</b><small>Arranca con las preferencias de tu perfil.</small></span>
                </button>
              )}
            </div>
            {setupNotice && <p className="setup-path-notice">{setupNotice}</p>}

            <h2 className="subheading">Modo de juego</h2>
            <div className="mode-grid">
              {content.modes.map((mode) => (
                <button
                  key={mode.id}
                  className={`mode-card ${setup.modeId === mode.id ? "selected" : ""}`}
                  type="button"
                  onClick={() => selectMode(mode.id)}
                >
                  <span className="radio-dot" />
                  <div>
                    <b>{mode.name}</b>
                    <p>{mode.description}</p>
                  </div>
                </button>
              ))}
            </div>

            <h2 className="subheading">
              {isSolo ? "Tu perfil" : "Personas que juegan"}
            </h2>
            <div className={`player-grid ${isSolo ? "single-player" : ""}`}>
              <div className="player-field">
                <label htmlFor="player-one-name">
                  {isSolo ? "Tu nombre" : "Persona 1"}
                </label>
                <input
                  id="player-one-name"
                  maxLength={24}
                  value={setup.playerOne}
                  onFocus={() => {
                    if (setup.playerOne === "Vos") {
                      updateSetup({ playerOne: "" });
                    }
                  }}
                  onChange={(event) =>
                    updateSetup({ playerOne: event.target.value })
                  }
                  placeholder="Vos"
                  autoComplete="off"
                />
                <div
                  className="sex-selector"
                  role="group"
                  aria-label={isSolo ? "Tu sexo" : "Sexo de la persona 1"}
                >
                  {content.sexes.map((sex) => (
                    <button
                      key={sex.id}
                      type="button"
                      className={
                        setup.playerOneSexId === sex.id ? "selected" : ""
                      }
                      onClick={() => {
                        const slug = sex.slug;
                        updateSetup({
                          playerOneSexId: sex.id,
                          elementIds: isSolo
                            ? setup.elementIds.filter((id) =>
                                content.elements.some(
                                  (item) =>
                                    item.id === id &&
                                    isSoloResourceCompatible(item, slug),
                                ),
                              )
                            : setup.elementIds,
                          toyIds: isSolo
                            ? setup.toyIds.filter((id) =>
                                content.toys.some(
                                  (toy) =>
                                    toy.id === id &&
                                    isSoloResourceCompatible(toy, slug),
                                ),
                              )
                            : setup.toyIds,
                        });
                      }}
                      aria-pressed={setup.playerOneSexId === sex.id}
                    >
                      {sex.name}
                    </button>
                  ))}
                </div>
              </div>

              {!isSolo && (
                <div className="player-field">
                  <label htmlFor="player-two-name">Persona 2</label>
                  <input
                    id="player-two-name"
                    maxLength={24}
                    value={setup.playerTwo}
                    onFocus={() => {
                      if (setup.playerTwo === "Tu pareja") {
                        updateSetup({ playerTwo: "" });
                      }
                    }}
                    onChange={(event) =>
                      updateSetup({ playerTwo: event.target.value })
                    }
                    placeholder="Tu pareja"
                    autoComplete="off"
                  />
                  <div
                    className="sex-selector"
                    role="group"
                    aria-label="Sexo de la persona 2"
                  >
                    {content.sexes.map((sex) => (
                      <button
                        key={sex.id}
                        type="button"
                        className={
                          setup.playerTwoSexId === sex.id ? "selected" : ""
                        }
                        onClick={() => updateSetup({ playerTwoSexId: sex.id })}
                        aria-pressed={setup.playerTwoSexId === sex.id}
                      >
                        {sex.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!peopleConfigured && (
              <p className="setup-warning">
                {isSolo
                  ? "Elegí tu sexo para preparar cartas compatibles."
                  : "Elegí el sexo de las dos personas para continuar."}
              </p>
            )}

            {content.settings.game_master_enabled && (
              <div className="game-master-setup">
                <div className="game-master-availability">
                  <span
                    className={
                      gameMasterStatus === "checking"
                        ? "checking"
                        : gameMasterAvailable
                          ? setup.gameMasterEnabled
                            ? "online"
                            : "disabled"
                          : "offline"
                    }
                  />
                  <b>
                    {gameMasterStatus === "checking"
                      ? "Comprobando conexión"
                      : gameMasterAvailable
                        ? setup.gameMasterEnabled
                          ? "IA conectada y activada"
                          : "IA disponible, modo local elegido"
                        : "IA no disponible"}
                  </b>
                </div>

                <ChoiceToggle
                  checked={setup.gameMasterEnabled}
                  title="Dirección adaptativa"
                  description={
                    gameMasterAvailable
                      ? content.settings.game_master_description
                      : setup.gameMasterEnabled
                        ? gameMasterReason ||
                          "Se volverá a intentar al iniciar y en cada carta. Si falla, la partida seguirá sin cortarse."
                        : "Modo local elegido. Podés activar la IA aunque ahora figure sin conexión; se volverá a comprobar al iniciar."
                  }
                  onChange={() =>
                    updateSetup({
                      gameMasterEnabled: !setup.gameMasterEnabled,
                    })
                  }
                />
              </div>
            )}

            {setupPath === "quick" && (
              <div className="quick-setup-panel">
                <div className="intensity-selector-panel">
                  <label className="range-row intensity-range">
                    <span>
                      <b>{content.settings.setup_intensity_title}</b>
                      <small>Nivel máximo {selectedMaximumIntensity}. La partida empieza más abajo y escala progresivamente.</small>
                    </span>
                    <input
                      type="range"
                      min={intensityMinimum}
                      max={intensityMaximum}
                      step="1"
                      value={selectedMaximumIntensity}
                      onChange={(event) => selectMaximumIntensity(Number(event.target.value))}
                    />
                  </label>
                  <div className="intensity-scale" aria-label="Elegir intensidad máxima">
                    {Array.from({ length: intensityMaximum - intensityMinimum + 1 }, (_, index) => intensityMinimum + index).map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={[isIntensityMarkerActive(value, selectedMaximumIntensity) ? "active" : "", value === selectedMaximumIntensity ? "current" : ""].filter(Boolean).join(" ")}
                        aria-pressed={value === selectedMaximumIntensity}
                        onClick={() => selectMaximumIntensity(value)}
                      >{value}</button>
                    ))}
                  </div>
                </div>
                <label className="range-row cards-range">
                  <span><b>Duración aproximada</b><small>{setup.maxCards} cartas</small></span>
                  <input type="range" min="5" max={Math.max(5, content.settings.maximum_cards_per_session)} step="5" value={setup.maxCards} onChange={(event) => updateSetup({ maxCards: Number(event.target.value) })} />
                </label>
                <div className={`eligibility-summary ${eligibleCount === 0 ? "invalid" : ""}`}>
                  <div><b>{eligibleCount}</b><span>cartas compatibles</span></div>
                </div>
              </div>
            )}
          </section>
        )}

        {step === 1 && setupPath === "custom" && (
          <section className="setup-section">
            <p className="eyebrow">PASO 2 DE 4</p>
            <h1>{stepContent[1].title}</h1>
            <p className="section-copy">{stepContent[1].subtitle}</p>

            <div className="level-grid">
              {orderedLevels.map((level) => {
                const selected = setup.levelIds.includes(level.id);
                const current = level.intensity_order === selectedProgressionCeiling;
                return (
                  <button
                    key={level.id}
                    className={`level-card ${selected ? "selected" : ""} ${current ? "current" : ""}`}
                    type="button"
                    aria-pressed={current}
                    onClick={() => selectProgressionCeiling(level.intensity_order)}
                    style={
                      { "--level-color": level.color } as React.CSSProperties
                    }
                  >
                    <span className="level-number">
                      0{level.intensity_order}
                    </span>
                    <div>
                      <b>{level.name}</b>
                      <p>{level.description}</p>
                    </div>
                    <span className="choice-check">
                      {selected && <Icon name="check" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {intensityDefinition && (
              <div className="intensity-selector-panel">
                <label className="range-row intensity-range">
                  <span>
                    <b>{content.settings.setup_intensity_title}</b>
                    <small>
                      Nivel {selectedMaximumIntensity} de {intensityMaximum}. {intensityDescription(
                        content.settings,
                        selectedMaximumIntensity,
                      )}
                    </small>
                  </span>
                  <input
                    type="range"
                    min={intensityMinimum}
                    max={intensityMaximum}
                    step="1"
                    value={selectedMaximumIntensity}
                    aria-label="Intensidad de la partida"
                    onChange={(event) =>
                      selectMaximumIntensity(Number(event.target.value))
                    }
                  />
                </label>
                <div className="intensity-scale" aria-label="Elegir intensidad">
                  {Array.from(
                    { length: intensityMaximum - intensityMinimum + 1 },
                    (_, index) => intensityMinimum + index,
                  ).map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={[
                        isIntensityMarkerActive(value, selectedMaximumIntensity)
                          ? "active"
                          : "",
                        value === selectedMaximumIntensity ? "current" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-label={`Intensidad ${value}`}
                      aria-pressed={value === selectedMaximumIntensity}
                      onClick={() => selectMaximumIntensity(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            )}



            <details className="deck-details">
              <summary>
                Mazos incluidos <span>{setup.deckIds.length || "todos"}</span>
              </summary>
              <p>
                Los mazos agrupan cartas por temática. Si no elegís ninguno, se
                consideran todos.
              </p>
              <div className="choice-list compact">
                {availableDecks.map((deck) => (
                  <ChoiceToggle
                    key={deck.id}
                    checked={setup.deckIds.includes(deck.id)}
                    title={deck.name}
                    description={deck.description}
                    onChange={() =>
                      updateSetup({ deckIds: toggleId(setup.deckIds, deck.id) })
                    }
                  />
                ))}
              </div>
            </details>
          </section>
        )}

        {step === 2 && setupPath === "custom" && (
          <section className="setup-section">
            <p className="eyebrow">PASO 3 DE 4</p>
            <h1>{stepContent[2].title}</h1>
            <p className="section-copy">{stepContent[2].subtitle}</p>

            <h2 className="subheading">Elementos comunes</h2>
            <div className="choice-list two-columns">
              {availableElements.map((item) => (
                <ChoiceToggle
                  key={item.id}
                  checked={setup.elementIds.includes(item.id)}
                  title={item.name}
                  description={`${item.description || ""} · ${elementCoverage.get(item.id) ?? 0} cartas`}
                  onChange={() =>
                    updateSetup({
                      elementIds: toggleId(setup.elementIds, item.id),
                    })
                  }
                />
              ))}
            </div>

            <h2 className="subheading">Juguetes sexuales</h2>
            <div className="choice-list two-columns">
              {availableToys.map((toy) => (
                <ChoiceToggle
                  key={toy.id}
                  checked={setup.toyIds.includes(toy.id)}
                  title={toy.name}
                  description={`${toy.difficulty} · ${toy.description || ""} · ${toyCoverage.get(toy.id) ?? 0} cartas`}
                  onChange={() =>
                    updateSetup({ toyIds: toggleId(setup.toyIds, toy.id) })
                  }
                />
              ))}
            </div>
          </section>
        )}

        {step === 3 && setupPath === "custom" && (
          <section className="setup-section">
            <p className="eyebrow">PASO 4 DE 4</p>
            <h1>{stepContent[3].title}</h1>
            <p className="section-copy">{stepContent[3].subtitle}</p>

            <DynamicLimits
              definitions={limitFilterDefinitions}
              values={setup.filters}
              onChange={(values) => updateFilters(values)}
              showAdvanced={showAdvanced}
            />

            {limitFilterDefinitions.some((definition) => definition.advanced) && (
              <button
                className="advanced-toggle"
                type="button"
                onClick={() => setShowAdvanced((value) => !value)}
              >
                {showAdvanced
                  ? "Ocultar filtros avanzados"
                  : "Ver filtros avanzados"}
              </button>
            )}

            <label className="range-row cards-range">
              <span>
                <b>Cantidad máxima de cartas</b>
                <small>{setup.maxCards}</small>
              </span>
              <input
                type="range"
                min="5"
                max={Math.max(5, content.settings.maximum_cards_per_session)}
                step="5"
                value={setup.maxCards}
                onChange={(event) =>
                  updateSetup({ maxCards: Number(event.target.value) })
                }
              />
            </label>

            {authenticated && onSaveDefaults && (
              <div className="save-defaults-panel">
                <div>
                  <Icon name="check" />
                  <span>
                    <b>Usar esta configuración siempre</b>
                    <small>Guardá nombres, modo, niveles, elementos, juguetes, filtros y cantidad de cartas.</small>
                  </span>
                </div>
                <button
                  className="secondary-button wide"
                  type="button"
                  disabled={savingDefaults}
                  onClick={() => {
                    setSavingDefaults(true);
                    setDefaultsNotice(null);
                    void onSaveDefaults()
                      .then(() => setDefaultsNotice("Preferencias guardadas en tu perfil."))
                      .catch(() => setDefaultsNotice("No se pudieron guardar las preferencias."))
                      .finally(() => setSavingDefaults(false));
                  }}
                >
                  {savingDefaults ? "Guardando…" : "Guardar como predeterminada"}
                </button>
                {defaultsNotice && <p className="defaults-notice">{defaultsNotice}</p>}
              </div>
            )}

            <div
              className={`eligibility-summary ${eligibleCount === 0 ? "invalid" : ""}`}
            >
              <div>
                <b>{eligibleCount}</b>
                <span>cartas compatibles con esta configuración</span>
              </div>
              {eligibleCount === 0 && (
                <p>
                  Los filtros y elementos seleccionados dejaron la partida sin
                  cartas. Volvé atrás y aflojá alguna restricción.
                </p>
              )}
            </div>
          </section>
        )}

        <footer className="setup-footer">
          {setupPath === "quick" && step === 0 ? (
            <button className="primary-button wide" type="button" disabled={!canStart} onClick={onStart}>
              Iniciar partida <Icon name="flame" />
            </button>
          ) : step < steps.length - 1 ? (
            <button
              className="primary-button wide"
              type="button"
              disabled={(step === 0 && !peopleConfigured) || (step === 1 && setup.levelIds.length === 0)}
              onClick={() => setStep((value) => value + 1)}
            >
              Continuar <Icon name="arrow" />
            </button>
          ) : (
            <button className="primary-button wide" type="button" disabled={!canStart} onClick={onStart}>
              Iniciar partida <Icon name="flame" />
            </button>
          )}
        </footer>
      </main>
    </div>
  );
}
