import { assetUrl } from '../env';
import type { Game, Theme } from '../types';

const fontLinks = new Set<string>();
const THEME_STORAGE_KEY = 'te-animas-visual-theme-v1';

interface StoredVisualTheme {
  theme: Theme;
  game: Pick<Game, 'name'>;
}

function loadFont(url: string | null) {
  if (!url || fontLinks.has(url)) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  link.dataset.pecadoclubFont = 'true';
  document.head.appendChild(link);
  fontLinks.add(url);
}

function applyVariables(theme: Theme) {
  const root = document.documentElement;

  const vars: Record<string, string> = {
    '--pc-primary': theme.primary_color,
    '--pc-secondary': theme.secondary_color,
    '--pc-accent': theme.accent_color,
    '--pc-background': theme.background_color,
    '--pc-surface': theme.surface_color,
    '--pc-card': theme.card_background_color,
    '--pc-card-border': theme.card_border_color,
    '--pc-text': theme.text_color,
    '--pc-muted': theme.muted_text_color,
    '--pc-danger': theme.danger_color,
    '--pc-heading-font':
      `'${theme.heading_font_family}', Georgia, serif`,
    '--pc-body-font':
      `'${theme.body_font_family}', system-ui, sans-serif`,
    '--pc-card-font':
      `'${theme.card_font_family}', system-ui, sans-serif`,
    '--pc-radius': `${theme.border_radius}px`,
    '--pc-card-radius': `${theme.card_border_radius}px`,
    '--pc-button-height': `${theme.button_height}px`,
    '--pc-shadow-alpha': String(
      Math.min(
        0.65,
        Math.max(0.08, theme.shadow_intensity / 100),
      ),
    ),
    '--pc-animation':
      theme.animation_speed === 'slow'
        ? '520ms'
        : theme.animation_speed === 'fast'
          ? '180ms'
          : '320ms',
  };

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }

  loadFont(theme.heading_font_url);
  loadFont(theme.body_font_url);
  loadFont(theme.card_font_url);
}

export function applySavedTheme() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return;

    const stored = JSON.parse(raw) as StoredVisualTheme;
    if (!stored?.theme) return;

    applyVariables(stored.theme);

    if (stored.game?.name) {
      document.title = stored.game.name;
    }

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', stored.theme.primary_color);
  } catch {
    // Usa el aspecto predeterminado hasta cargar el contenido.
  }
}

export function applyTheme(theme: Theme, game: Game) {
  applyVariables(theme);
  document.title = game.name;

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme.primary_color);

  const favicon = assetUrl(theme.favicon_file);

  if (favicon) {
    document
      .querySelector<HTMLLinkElement>('#dynamic-favicon')
      ?.setAttribute('href', favicon);
  }

  try {
    const stored: StoredVisualTheme = {
      theme,
      game: { name: game.name },
    };

    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify(stored),
    );
  } catch {
    // Guardar el aspecto es opcional.
  }
}
