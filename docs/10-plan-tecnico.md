# 10 — Plan técnico: arquitectura, herramientas y reparto de trabajo

> **Plan vigente para construir la app** (adoptado por @javocruz el 2026-11-14; ver `docs/decisions/log.md`).
> Lo primero, la sección **0. Estado real**: qué hay ya en el repo y en qué se aparta el código del plan original.
> ⚠️ Los issues #34–#51 usan otro reparto (roles A–E, npm, `pipeline/`) y citan `docs/08-team-plan.md` / `09-architecture-contract.md`,
> que no están en el repo. Mientras el equipo no diga otra cosa, **manda este documento y el código de `dev`**.

## 0. Estado real (actualizado 2026-11-14)

### Ramas: se trabaja contra `dev`
- `dev` = rama de integración: **todo el trabajo entra aquí**. `main` = estable/entrega, solo recibe `dev` con un PR `dev` → `main` en cada integración.
- Flujo: issue → `git switch -c <handle>/<n>-<slug> origin/dev` → PR con `gh pr create --base dev` → revisión → squash-merge a `dev`.
  (Sustituye a las ramas `feat/<area>` del cronograma de abajo.)
- `Closes #n` solo cierra el issue cuando el cambio llega a `main`; antes, ciérralo a mano.
- Detalle: `docs/00-protocol.md`.

### Qué está hecho

| Pieza | Estado | Dónde |
|---|---|---|
| Monorepo pnpm (`web/`, `contracts/`) | ✅ v0 | raíz: `package.json`, `pnpm-workspace.yaml`, `.npmrc` |
| Contratos de datos v1 (tipos + JSON Schemas) | ✅ v0 | `contracts/` (ver §4 actualizado) |
| Datos **mock** (20 sitios, 30 días horarios, 5 capas) | ✅ v0 | `web/public/data/`, se regeneran con `pnpm mocks` |
| Store, carga de datos, router, shell, barra temporal (Javi2) | ✅ v0 | `web/src/core/` |
| Panel de capas, leyendas, mapa polar 2D (Javi2) | ✅ v0 | `web/src/layers/` |
| Landing, About (fuentes, declaración IA, sin branding NASA) | ✅ v0 | `web/src/pages/` |
| Tests (store, helpers, validación de `public/data`) + CI | ✅ | `web/src/core/*.test.ts`, `.github/workflows/web.yml` |
| Globo 3D + filtros (Marta) | ⏳ hueco listo | `web/src/globe/` (placeholder + lista/ficha de sitio de arranque) |
| Street View (Pablo) | ⏳ hueco listo | `web/src/streetview/` (placeholder que imprime Sol/Tierra az/el) |
| Juego / misiones (Cristóbal) | ⏳ hueco listo | `web/src/game/` (placeholder) |
| Pipeline Python (Javi, Pablo) | ⏳ sin empezar | `python/` (no existe aún) |
| Deploy público | ⏳ pendiente | `web/vercel.json` listo; proyecto Vercel con raíz `web/` |

### Cómo arrancar (cualquiera)
```bash
git switch -c <handle>/<n>-<slug> origin/dev
pnpm install      # pnpm descarga Node 22 solo para este repo (no hace falta cambiar tu Node global)
pnpm dev          # http://localhost:5173
pnpm test         # incluye la validación de web/public/data contra el contrato
```
Guía de la web (quién toca qué carpeta, cómo leer/escribir el store, helpers): **`web/README.md`**.
Contratos y mocks: **`contracts/README.md`**.

### Diferencias entre el código y el plan original (lo que cambió al implementarlo)
1. **Contratos ampliados** (detalle en §4): `sites.json` va envuelto (`version`, `mock`, `generated_utc`, `weights`, `sites[]`) y cada sitio añade `name` y `source`;
   `timeseries` añade `version`, `mock`, `site_id`, `step_s` y `earth_visible[]` opcional; `lit` es `0/1`; hay un **`manifest.json`** nuevo con la ventana temporal.
2. **Esquemas**: `sites.schema.json` (no `site.schema.json`), más `timeseries`, `layers` y `manifest`.
3. **Store**: además de los 4 campos del contrato tiene `layerOpacity` (opacidad por capa). Cambiar `mode` navega solo a la ruta correspondiente.
4. **Mapa polar 2D** en Explore (toggle 2D/3D): respaldo para móvil y mientras llega el globo. El 3D sigue siendo de Marta.
5. **Ventana de los mocks**: 30 días desde 2027-01-01 a paso horario (no un año), para que pesen poco (1,4 MB en total).
6. **Node 22 fijado por repo** con `.npmrc` (`use-node-version`).
7. **shadcn/ui**: preparado (`web/components.json`, helper `cn` en `src/lib/utils.ts`) pero sin componentes instalados todavía.
8. **Rutas**: `/`, `/explore`, `/streetview/:siteId`, `/game`, `/about`. En la UI, `game` se llama "Mission".

### Siguiente paso por persona
- **Javi**: sustituir los mocks por datos reales con la misma forma (`"mock": false`); `pnpm test` en `web/` comprueba el formato.
- **Pablo**: Street View en `web/src/streetview/StreetView.tsx` usando `useTimeseries` + `sampleAt` (ver comentario del archivo); DEM y horizontes en `python/terrain/`.
- **Marta**: globo en `web/src/globe/GlobeView.tsx`; `loadLayerTexture(layer)` da un canvas coloreado para `THREE.CanvasTexture`; reemplazar o ampliar `SiteList.tsx`.
- **Cristóbal**: `web/src/game/` (motor + `missions.json`), leyendo `sites` y `selectedSiteId` del store.
- **Javi2**: v1 = design system (shadcn), onboarding y deploy público.

---

## 1. Cómo encaja todo

La idea central es esta: **todo lo que pesa se calcula offline en Python y la web solo consume archivos estáticos.** Así nadie depende de un servidor que funcione en tiempo real y cada persona puede trabajar con datos de prueba desde el primer día.

```
 [Python / backend offline]                  [Frontend web]
 Javi:  ephemerides + algoritmo ──┐
 Pablo: DEM/topografía ───────────┼──► /data (JSON, PNG/COG, tiles) ──► App (Vite + React + TS)
                                  │                                     ├─ Marta: visor 3D + exploración
                                  └──► (opcional) API FastAPI           ├─ Pablo: Lunar Street View
                                                                        ├─ Cristóbal: gamificación
                                                                        └─ Javi2: shell, estética, layers
```

## 2. Stack común

| Capa | Herramienta | Versión orientativa | Instalado (lockfile) |
|---|---|---|---|
| Repo | Monorepo en GitHub, `pnpm` workspaces + carpeta `python/` | pnpm 9 | pnpm 9.15.9 |
| Python | Python 3.12, entornos con `uv` | — | — (sin empezar) |
| Frontend | Node 22 LTS, Vite 6, React 19, TypeScript 5 | — | Node 22.23.5, Vite 6.4, React 19.1, TS 5.9 |
| 3D | three.js + @react-three/fiber 9 + @react-three/drei 10 | three r17x | three 0.187, R3F 9.8, drei 10.7 |
| Estado global | zustand 5 (un solo store compartido) | — | zustand 5.1 |
| Estilos | Tailwind 4 + shadcn/ui | — | Tailwind 4.3 (shadcn preparado, sin componentes) |
| Animación / router | Framer Motion, React Router 7 | — | motion 14, react-router 7.18 |
| Deploy | GitHub Pages o Vercel (es estático) | — | `web/vercel.json` (Vercel) |
| Calidad | ESLint + Prettier, ruff (Python), GitHub Actions | — | ESLint 9, Prettier 3, vitest 3, CI `web.yml` |

Las versiones exactas se fijan en `pnpm-lock.yaml` y `uv.lock` el primer día, y no se actualizan durante el hackathon.

**Alternativa a three.js:** CesiumJS tiene un elipsoide lunar y streaming de terreno. Es más rápido si queréis precisión geodésica, pero cuesta más integrarlo con el Street View y personalizar el estilo. La recomendación es three.js.

## 3. Estructura del repo

```
lunar_site_evaluator/
├─ contracts/            ✅ tipos TS + JSON Schemas + generador de mocks
│  ├─ types.ts
│  ├─ sites.schema.json · timeseries.schema.json · layers.schema.json · manifest.schema.json
│  └─ scripts/gen-mocks.mjs
├─ python/               ⏳ por crear
│  ├─ ephem/             (Javi)
│  ├─ scoring/           (Javi)
│  ├─ terrain/           (Pablo)
│  └─ export/            → escribe en web/public/data
├─ web/
│  ├─ src/core/          ✅ store zustand, carga de datos, router, shell (Javi2)
│  ├─ src/layers/        ✅ panel de capas, leyendas, mapa polar 2D (Javi2)
│  ├─ src/pages/         ✅ páginas de cada ruta (Javi2)
│  ├─ src/globe/         ⏳ visor 3D + exploración (Marta)
│  ├─ src/streetview/    ⏳ (Pablo)
│  ├─ src/game/          ⏳ (Cristóbal)
│  └─ public/data/       ✅ mocks ahora, datos reales después
└─ data_raw/             (en .gitignore: kernels SPICE, DEM originales)
```

## 4. Contratos de datos (el pegamento para trabajar en paralelo)

> Fuente de verdad: **`contracts/types.ts`**. Los ejemplos de abajo reflejan el contrato v1 implementado.

**`manifest.json`** (nuevo): qué se generó y para qué ventana temporal.
```json
{ "version": 1, "mock": true, "generated_utc": "2026-11-14T00:00:00Z",
  "time_range": { "start_utc": "2027-01-01T00:00:00Z", "end_utc": "2027-01-30T23:00:00Z", "step_s": 3600 },
  "sources": ["..."] }
```

**`sites.json`**: lista de localizaciones candidatas. Sale de Javi y lo consumen todos.
```json
{ "version": 1, "mock": true, "generated_utc": "...",
  "weights": { "illum_pct": 0.4, "earth_vis_pct": 0.3, "slope_deg": 0.2, "max_dark_hours": 0.1, "psr_dist_km": 0 },
  "sites": [
    { "id": "shackleton_rim_01", "name": "Shackleton rim A", "lat": -89.9, "lon": 0.0, "elev_m": 1900,
      "valid": true, "score": 0.87,
      "metrics": { "illum_pct": 0.82, "earth_vis_pct": 0.55, "slope_deg": 6.2,
                   "max_dark_hours": 120, "psr_dist_km": 2.1 },
      "reasons": ["slope_ok", "illum_ok"], "source": "..." } ] }
```
`reasons` usa `<métrica>_ok` / `_low` / `_high` / `_long`; la UI los traduce a texto (`web/src/core/format.ts`).

**`timeseries/<id>.json`**: un paso por hora durante el periodo del manifest. Todos los arrays tienen la misma longitud.
```json
{ "version": 1, "mock": true, "site_id": "shackleton_rim_01", "step_s": 3600,
  "t_utc": [], "sun_az": [], "sun_el": [], "earth_az": [], "earth_el": [],
  "lit": [], "earth_visible": [] }
```
Azimut en grados desde el norte local en sentido horario [0, 360); elevación en grados; `lit` / `earth_visible` = 1 si el cuerpo supera el **horizonte de terreno**.
Lo consumen Street View (posición del Sol y la Tierra), la barra temporal (ventanas y cuenta atrás Sunset/Earthset) y la gamificación.

**Capas raster (Pablo/Javi → Marta/Javi2)**: PNG 8 bits gris + alfa (`gray8`; alfa 0 = sin dato), estereográfica polar sur hasta −80°.
- `layers/elevation.png`, `layers/slope.png`, `layers/illumination.png`, `layers/psr.png`, `layers/score.png`

`layers.json` describe proyección, `bounds_m`, tamaño en píxeles y, por capa, `value_range`, `units`, `palette` (paradas `[posición, color]`), `kind` (`continuous` / `categorical`), visibilidad y opacidad por defecto, descripción y fuente.
Proyección: ρ = 2R·tan((90° + lat)/2), x = ρ·sin(lon), y = ρ·cos(lon), R = 1 737 400 m; la fila 0 del PNG es y máxima.

**Eventos del store (frontend)**:
- `selectedSiteId`
- `currentTimeUTC` (ISO UTC; lo mueve la barra temporal compartida)
- `activeLayers[]` (orden de dibujo, de abajo arriba)
- `mode: "explore" | "streetview" | "game"`

Estos cuatro campos son la única interfaz entre los módulos web (más `layerOpacity`, solo para pintar capas).

**Regla:** si alguien cambia un contrato, se hace con un PR a `contracts/` y se avisa a todos.

## 5. Por persona

### Javi: ephemerides y algoritmo de validez
- **Herramientas:** `spiceypy` (SPICE de NAIF) con kernels `de440.bsp`, `moon_pa_de440_200625.bpc`, `moon_de440_250416.tf`, `naif0012.tls` y `pck00011.tpc`. Además `numpy` 2, `scipy`, `pandas`/`polars` y `numba` para el cálculo de horizontes. Con `skyfield` se pueden hacer comprobaciones rápidas.
- **Qué calcula:** el vector al Sol y a la Tierra en el frame `MOON_ME` para cada punto, y la elevación respecto al **horizonte local**, que necesita el DEM de Pablo. Con eso se obtiene el % de iluminación, la visibilidad de la Tierra (para comunicaciones) y la noche más larga.
- **Algoritmo:** primero filtros duros (pendiente < X°, rugosidad, iluminación mínima). Después un score ponderado y normalizado con pesos configurables en `scoring/config.yaml`, para que el frontend pueda mostrarlos como sliders.
- **Iteraciones:**
  - v0: mock de `sites.json` con 20 puntos inventados, entregado el día 1. ✅ (lo genera `pnpm mocks`)
  - v1: Sol y Tierra sin horizonte (solo esfera).
  - v2: horizonte real a partir del DEM, calculado una vez por punto y en 360 azimuts.
  - v3: score con pesos y explicación de cada decisión (`reasons`).
- **Dependencia con Pablo:** el DEM y la máscara de horizonte. Acordad pronto un formato tipo `horizon/<id>.npy` con 360 elevaciones.

### Pablo: topografía y Lunar Street View
- **Datos:** DEM de LOLA (LRO), con los mosaicos polares de 5–20 m/px para los polos y el global de 118 m/px. Las PSR salen de los productos LOLA/Diviner. Se procesan con `rasterio` 1.4, `GDAL` 3.9 y `pyproj`.
- **Backend:** recortes locales del DEM alrededor de cada sitio (por ejemplo 20×20 km) exportados como heightmap PNG de 16 bits, y la máscara de horizonte para Javi.
- **Street View (three.js):**
  - Terreno: `PlaneGeometry` desplazado con el heightmap y LOD sencillo.
  - Cámara: en primera persona a 1,7 m del suelo.
  - Cielo: estrellas del catálogo Hipparcos/Yale BSC (en JSON, hasta magnitud ~6,5).
  - Sol y Tierra: colocados con `sun_az/el` y `earth_az/el` de la timeseries de Javi.
  - Fase de la Tierra visible y sombras con `DirectionalLight` + shadow map.
  - Etiquetas al estilo Stellarium y slider de tiempo compartido con el store (✅ ya existe: `<TimeBar />`).
- **Iteraciones:**
  - v0: terreno procedural y Sol fijo.
  - v1: heightmap real de un sitio.
  - v2: cielo con estrellas, Sol y Tierra animados en el tiempo.
  - v3: horizonte y sombras coherentes con el cálculo de Javi, que sirve también de validación cruzada.

### Marta: visor 3D de la Luna y modo exploración
- **Herramientas:** R3F + drei (`OrbitControls`, `Html` para etiquetas), con texturas LROC WAC (color) y LOLA (relieve/normal map) a 4k–8k en KTX2/WebP.
- **Funciones:**
  - Globo lunar con pins de `sites.json`, coloreados por score (`scoreColor` en `@/layers` para usar los mismos colores que el mapa 2D).
  - Overlays de las capas raster (`loadLayerTexture` en `@/core`; orden y opacidad en el store).
  - Barra lateral con filtros: sliders de los pesos del score que recalculan en el cliente (sin backend), y rango de fechas.
  - Clic en un pin → `selectedSiteId` → panel de detalle → botón "Entrar en Street View" (✅ en el arranque: `setMode('streetview')`).
- **Iteraciones:**
  - v0: esfera texturizada con pins mock.
  - v1: capas conmutables y sidebar.
  - v2: recálculo del score con sliders y zoom a los polos.
  - v3: transición animada al Street View.

### Javi2: web, estética y layers de la página
- **Responsable de** `src/core` (store, loader de datos, router) y del shell: layout, navegación entre modos, landing, about/datos/créditos NASA y responsive.
- **Herramientas:** Tailwind 4, shadcn/ui, Framer Motion y React Router 7. La identidad visual se puede definir con Figma o Stitch.
- **Layers:** gestiona el sistema de capas (registro, orden, opacidad, leyendas) con `layers.json`. Marta las pinta en 3D y Javi2 da la UI de control.
- **Iteraciones:**
  - v0: esqueleto con 3 rutas vacías y el store, entregado el día 1 porque desbloquea a todos. ✅ (PR #53, más capas, mapa 2D, landing y About)
  - v1: design system (colores, tipografía, componentes).
  - v2: leyendas y onboarding.
  - v3: pulido, rendimiento (lazy-load de modos ✅ ya hecho) y deploy.

### Cristóbal: gamificación
- **Mecánicas propuestas:**
  - "Elige tu base": el usuario propone un sitio y se compara con el score del algoritmo.
  - Misiones del tipo "encuentra un punto con >80% de luz y vista a la Tierra".
  - Logros y puntuación.
  - Modo quiz con datos reales.
- **Herramientas:** TypeScript puro sobre el store. Las misiones se definen en `game/missions.json` con condiciones sobre `metrics` (por ejemplo `{ "metric": "illum_pct", "op": ">", "value": 0.8 }`). Progreso en `localStorage`, confetti/sonidos con `canvas-confetti` y `howler`.
- **No depende del 3D:** consume `selectedSiteId` y `sites.json`, así que puede desarrollarse con un selector mock.
- **Iteraciones:**
  - v0: motor de misiones con un JSON y tests (vitest).
  - v1: UI de misiones y logros.
  - v2: integración con los clics del globo y del Street View.
  - v3: modo desafío/ranking local.

## 6. Cronograma (hackathon de ~48 h; escalar si tenéis más tiempo)

| Fase | Objetivo | Entregables clave |
|---|---|---|
| **H0–H3** | Contratos y esqueleto | ✅ `contracts/`, repo, mocks en `public/data`, store y rutas (Javi2) |
| **H3–H16** | v0/v1 en paralelo con mocks | Cada uno en su carpeta y su rama `<handle>/<n>-<slug>` desde `dev` |
| **H16** | **Integración 1** | Datos reales v1 de Javi y Pablo sustituyen a los mocks; PR `dev` → `main` |
| **H16–H34** | v2 | Horizonte real, sliders de score, cielo animado, misiones conectadas |
| **H34** | **Integración 2 + freeze de features** | PR `dev` → `main` |
| **H34–H44** | v3 y pulido | Rendimiento, estética, textos, demo |
| **H44–H48** | Deploy, presentación, README | Se despliega `main` |

## 7. Reglas para no pisarse
1. **Mocks primero:** nadie espera a nadie. Cada consumidor trabaja con el mock del contrato.
2. **Una carpeta por persona.** Solo se tocan archivos ajenos con un PR revisado por su dueño.
3. **Cambios de contrato:** PR a `contracts/` y aviso en el canal del equipo.
4. **Pipeline de datos reproducible:** un comando `uv run python -m export.all` regenera todo `public/data`. Los datos crudos no van al repo.
5. **Sync de 10 minutos** en cada hito de integración.
6. **Todo entra por `dev`** (PR `--base dev`); `main` solo recibe `dev`.

## 8. Riesgos a tener en cuenta
- **DEM polares grandes:** recortar solo la zona de interés (por ejemplo el polo sur por debajo de −80°).
- **Horizontes de cálculo lento:** precalcularlos con `numba` y para menos puntos (200–1000 candidatos).
- **Texturas pesadas en web:** usar KTX2/WebP y no pasar de 8k.
- **Precisión vs. tiempo:** v1 sin horizonte ya da una demo funcional, y v2 la mejora.
- **Mocks ≠ resultados:** los datos actuales son inventados (badge "Mock data" en la UI). No usarlos en capturas de la entrega.
