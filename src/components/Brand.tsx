import { assetUrl } from '../env';
import type { Game, Id, Theme } from '../types';
import { Icon } from './Icon';

export function Brand({
  game,
  theme,
  compact = false,
  imageFile,
  className = '',
}: {
  game: Game;
  theme: Theme;
  compact?: boolean;
  imageFile?: Id | null;
  className?: string;
}) {
  const image = assetUrl(imageFile ?? theme.logo_file);

  const imageClasses = [
    'brand-image',
    compact ? 'compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const wordmarkClasses = [
    'brand-wordmark',
    compact ? 'compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (image) {
    return (
      <img
        className={imageClasses}
        src={image}
        alt={game.name}
      />
    );
  }

  return (
    <div className={wordmarkClasses}>
      <Icon name="flame" />
      <span>{game.name}</span>
    </div>
  );
}