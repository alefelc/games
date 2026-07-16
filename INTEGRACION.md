# Integración frontend v2.11.0

## 1. Carga de Directus

Agregar `pc_filters` al bundle de contenido y solicitar:

```text
id,key,label,description,icon,filter_kind,card_fields,numeric_field,default_enabled,default_number,min_value,max_value,visible,advanced,sort,status
```

Filtro de lectura: `game = juego actual`, `status = published`; orden `sort`.

También ampliar las consultas de `pc_elements` y `pc_toys` con:

```text
visible_in_setup,default_selected,selection_priority,guarantee_in_session
```

Y `pc_app_settings` con los campos creados por el instalador.

## 2. Tipos

Añadir al `ContentBundle`:

```ts
filters: DynamicFilterDefinition[];
```

Añadir a elementos y juguetes los cuatro campos opcionales indicados arriba. Añadir a configuración los campos de historial, cobertura e IA.

## 3. “Marquen los límites”

Reemplazar la lista fija de interruptores por `DynamicLimits.tsx`. Los valores iniciales salen de `buildDynamicFilterDefaults(content.filters)` y no de constantes del frontend.

El significado de `default_enabled` es directo: el límite aparece marcado y excluye esas cartas por defecto.

## 4. Elegibilidad

La función `eligibleCards` debe aplicar `cardPassesDynamicFilters(card, content.filters, setup.filters)`.

Para objetos:

- vínculo `required`: la carta solo es elegible si el elemento/juguete está seleccionado;
- vínculo `alternative`: es elegible si al menos una alternativa vinculada está seleccionada;
- seleccionar objetos no debe convertirlos en un filtro de inclusión exclusiva;
- `excludeToys=true` siempre excluye `contains_toy=true`.

## 5. Sorteo

Reemplazar `src/lib/session.ts` por `session.v5.2.2.ts` y copiar `persistentHistory.ts` e `inventoryCoverage.ts` a `src/lib`.

La memoria se guarda por juego + modo + cantidad de jugadores. No se reinicia al iniciar una nueva partida. Solo se reinicia cuando el conjunto compatible ya se agotó.

## 6. IA

Usar `resilientGameMaster.ts`. El bloque `catch` no puede ejecutar ninguna variante de:

```ts
setUseAI(false)
setMode('local')
localStorage.setItem('...', 'local')
```

El resultado `temporary-local` debe mostrarse, como máximo, con un aviso discreto para esa carta. En el siguiente sorteo se vuelve a llamar automáticamente al game-master.

## 7. Caché PWA

Subir la versión del service worker y del cache name. Si no se hace, el navegador puede seguir ejecutando el selector anterior aunque el servidor ya tenga la compilación nueva.
