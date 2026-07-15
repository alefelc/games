import { assetUrl } from '../env';
import type { Game, Theme } from '../types';
import { Icon } from './Icon';

export function Brand({ game, theme, compact = false }: { game: Game; theme: Theme; compact?: boolean }) {
  const logo = assetUrl(theme.logo_file);
  if (logo) return <img className={compact ? 'brand-image compact' : 'brand-image'} src={logo} alt={game.name} />;
  return (
    <div className={compact ? 'brand-wordmark compact' : 'brand-wordmark'}>
      <Icon name="flame" />
      <span>{game.name}</span>
    </div>
  );
}
