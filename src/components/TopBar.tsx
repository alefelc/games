import type { ReactNode } from "react";
import type { ContentBundle } from "../types";
import { Brand } from "./Brand";
import { Icon } from "./Icon";

export function TopBar({
  content,
  onBack,
  actions,
}: {
  content: ContentBundle;
  onBack?: () => void;
  actions?: ReactNode;
}) {
  return (
    <header className="topbar">
      <div className="topbar-side">
        {onBack && (
          <button
            className="icon-button"
            type="button"
            onClick={onBack}
            aria-label="Volver"
          >
            <Icon name="back" />
          </button>
        )}
      </div>
      <Brand game={content.game} theme={content.theme} compact />
      <div className="topbar-actions">{actions}</div>
    </header>
  );
}
