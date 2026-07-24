import { assetUrl } from "../env";
import { getSavedBrand } from "../theme/applyTheme";
import type { ContentBundle } from "../types";
import { Icon } from "../components/Icon";

export function LoadingScreen({
  content,
  message = "Preparando el juego…",
}: {
  content?: ContentBundle | null;
  message?: string;
}) {
  const savedBrand = getSavedBrand();

  const fallbackLogo = `${import.meta.env.BASE_URL}te-animas-symbol.svg`;

  const configuredLogo = assetUrl(content?.theme.logo_file ?? null);

  const logoUrl = configuredLogo || savedBrand.logoUrl || fallbackLogo;

  const brandName = content?.game.name || savedBrand.name || "¿Te animás?";

  return (
    <main className="center-screen loading-screen loading-screen-modern">
      <div className="loading-ambient" aria-hidden="true" />

      <div className="hero-emblem hero-emblem-animated loading-emblem">
        <Icon name="flame" className="hero-flame" />
      </div>

      <p className="eyebrow loading-eyebrow">CUANDO SE JUEGA, SE ENCIENDE</p>

      <div className="loading-brand">
        <img
          src={logoUrl}
          alt={brandName}
          className="loading-brand-logo"
          onError={(event) => {
            const image = event.currentTarget;

            if (!image.src.endsWith("te-animas-symbol.svg")) {
              image.src = fallbackLogo;
            }
          }}
        />
      </div>

      <p className="loading-copy">{message}</p>

      <div className="loading-pulse" aria-label="Cargando">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
