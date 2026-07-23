import type { ChangeEvent } from "react";
import type {
  DynamicFilterDefinition,
  DynamicFilterValues,
} from "../lib/dynamicFilters";

export function DynamicLimits({
  definitions,
  values,
  onChange,
  showAdvanced = false,
}: {
  definitions: DynamicFilterDefinition[];
  values: DynamicFilterValues;
  onChange: (next: DynamicFilterValues) => void;
  showAdvanced?: boolean;
}) {
  const visible = definitions
    .filter(
      (definition) =>
        definition.visible && (showAdvanced || !definition.advanced),
    )
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

  return (
    <div className="filter-list">
      {visible.map((definition) => {
        if (definition.filter_kind === "max_number") {
          const value = Number(
            values[definition.key] ?? definition.default_number ?? 0,
          );
          const maximum = Math.max(
            value,
            Number(definition.max_value ?? value),
            Number(definition.default_number ?? value),
            Number(definition.min_value ?? 0),
          );

          return (
            <label className="range-row" key={definition.id}>
              <span>
                <b>{definition.label}</b>
                <small>
                  {[definition.description, `${value} de ${maximum}`]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </span>
              <input
                type="range"
                min={definition.min_value ?? 0}
                max={maximum}
                value={value}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  onChange({
                    ...values,
                    [definition.key]: Number(event.target.value),
                  })
                }
              />
            </label>
          );
        }

        return (
          <label className="filter-row" key={definition.id}>
            <span>
              <b>{definition.label}</b>
              {definition.description && <small>{definition.description}</small>}
            </span>
            <input
              type="checkbox"
              checked={Boolean(values[definition.key])}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onChange({
                  ...values,
                  [definition.key]: event.target.checked,
                })
              }
            />
            <i aria-hidden="true" />
          </label>
        );
      })}
    </div>
  );
}
