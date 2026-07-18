#!/bin/sh
set -eu

TARGET="/usr/share/nginx/html/runtime-config.js"
VALUE="${GA4_MEASUREMENT_ID:-${VITE_GA4_MEASUREMENT_ID:-}}"

if [ -z "$VALUE" ]; then
  echo "GA4: no se definió GA4_MEASUREMENT_ID; se conserva runtime-config.js."
  exit 0
fi

NORMALIZED="$(printf '%s' "$VALUE" | tr '[:lower:]' '[:upper:]' | tr -d '[:space:]')"
if ! printf '%s' "$NORMALIZED" | grep -Eq '^G-[A-Z0-9]{4,20}$'; then
  echo "GA4: GA4_MEASUREMENT_ID no tiene formato G-XXXXXXXXXX; se conserva la configuración existente." >&2
  exit 0
fi

cat > "$TARGET" <<EOF
window.__TE_ANIMAS_RUNTIME_CONFIG__ = Object.freeze({
  ga4MeasurementId: "$NORMALIZED",
});
EOF

echo "GA4: ID de medición configurado en runtime."
