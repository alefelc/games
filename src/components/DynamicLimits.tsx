import type { ChangeEvent } from 'react';
import type { DynamicFilterDefinition, DynamicFilterValues } from '../lib/dynamicFilters';

export function DynamicLimits({ definitions, values, onChange, showAdvanced = false }: { definitions: DynamicFilterDefinition[]; values: DynamicFilterValues; onChange: (next: DynamicFilterValues) => void; showAdvanced?: boolean; }) {
  const visible = definitions.filter(def => def.visible && (showAdvanced || !def.advanced)).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  return (
    <div className="limits-grid">
      {visible.map(def => def.filter_kind === 'max_number' ? (
        <label className="limit-row" key={def.id}>
          <span><b>{def.label}</b>{def.description && <small>{def.description}</small>}</span>
          <input type="range" min={def.min_value ?? 0} max={def.max_value ?? 3} value={Number(values[def.key] ?? def.default_number ?? 0)} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange({ ...values, [def.key]: Number(event.target.value) })} />
          <output>{Number(values[def.key] ?? def.default_number ?? 0)}</output>
        </label>
      ) : (
        <label className="limit-row" key={def.id}>
          <span><b>{def.label}</b>{def.description && <small>{def.description}</small>}</span>
          <input type="checkbox" checked={Boolean(values[def.key])} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange({ ...values, [def.key]: event.target.checked })} />
        </label>
      ))}
    </div>
  );
}
