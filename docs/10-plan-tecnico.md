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
| Street View (Pablo) | v0 implementado en rama #46; validación de terreno ion pendiente de token | `web/src/streetview/`: Cesium diferido, cámara, marcadores Sol/Tierra y tiempo compartido; fixtures aún mock |
| Mission / juego (Cristóbal) | ⏳ diseño descrito (#52), hueco listo | `web/src/game/` (placeholder) |
| Pipeline Python (Javi, Pablo) | ⏳ no integrado; Pablo tiene adquisición/exportación local | `python/terrain/` local, pendiente de PR; efemérides y horizonte real aún no publicados |
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
- **Pablo**: prototipo Cesium aislado en `web/src/streetview/StreetView.tsx`, con `useTimeseries` + `sampleAt` y límites explícitos; DEM/horizontes en `python/terrain/`. Acordar y exportar además el heightmap polar para Marta (ver §5 y §9).
- **Marta**: globo en `web/src/globe/GlobeView.tsx`; `loadLayerTexture(layer)` da un canvas coloreado para `THREE.CanvasTexture`; reemplazar o ampliar `SiteList.tsx`.
- **Cristóbal**: `web/src/game/`: motor de simulación de N días + veredicto explicado (ver §5, actualizado con su descripción del módulo Mission), leyendo `sites`, timeseries y `selectedSiteId`.
- **Javi2**: v1 = design system (shadcn), onboarding y deploy público.

---

## 1. Cómo encaja todo

La ciencia y el cálculo pesado se hacen **offline en Python** y la web consume
sus resultados estáticos. Street View puede usar **streaming visual de Cesium
Moon vía ion**: el despliegue sigue siendo estático, pero esa malla necesita
red. No se requiere una API de cálculo en tiempo real. Cada consumidor puede
desarrollar con mocks desde el primer día.

```
 [Python / backend offline]                  [Frontend web]
 Javi:  ephemerides + algoritmo ──┐
 Pablo: DEM/topografía ───────────┼──► /data (JSON, PNG/COG, tiles) ──► App (Vite + React + TS)
                                  │                                     ├─ Marta: visor 3D + exploración
                                  └──► (opcional) API FastAPI           ├─ Pablo: Lunar Street View
                                                                        ├─ Cristóbal: Mission (juego)
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

**Motores por módulo:** Marta mantiene three.js/R3F para el globo y Explore.
Pablo prioriza CesiumJS + Cesium Moon en Street View, sujeto a una prueba de
viabilidad. Se monta en un componente separado, con el mismo store/reloj.
Cesium aún no está en el lockfile: dependencia y configuración de build/asset
requieren PR coordinado con Javi2; no actualizar el stack común. Si el prototipo
falla, se usa la contingencia local three.js del bloque de Pablo.

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

> **Ampliación (@javiseirulo, 2026-11-14).** Detalle del plan de efemérides y scoring acordado en la sesión de Javi. No sustituye lo de arriba ni los bloques de los demás.
> **J0 recoge lo ya decidido con el equipo** y manda sobre lo que digan J1–J11. Lo que siga marcado ⚠️ está pendiente.
> Los cambios de esquema van por PR a `contracts/`; hasta que se mergeen mandan el contrato v1 y los mocks.

#### J0. ✅ Decisiones cerradas con el equipo (2026-11-14)
| # | Tema | Decisión | Afecta a |
|---|---|---|---|
| 1 | Dónde vive el score | **`web/src/scoring/`** (dueño Javi), funciones puras + vitest. Marta y Cristóbal lo **importan** (`@/scoring`); no hay un `score.ts` paralelo en `globe/` | Marta, Cristóbal |
| 2 | `mission_config` en la web | **Quinto campo del store: `missionConfig`** (+ `setMissionConfig`), igual que se hizo con `layerOpacity`. Tipo `MissionConfig` en `contracts/types.ts` | Javi2, Marta, Cristóbal |
| 3 | Métricas nuevas | `sun_el_mean_deg`, `max_blackout_hours` y `sun_earth_pct`, **opcionales** en v1.1. Slider simple: solo `sun_el_mean_deg`; las otras dos en Advanced | Javi2 (mocks), Marta (sliders) |
| 4 | Perfil de horizonte | **Observador a 5 m** sobre el terreno. **Paso de 0,1°** (3600 valores, ~20 KB por sitio) en los sitios curados; **1°** en las celdas de 5 km del mapa de calor. El alcance del relieve lejano lo fija y documenta Pablo. La cobertura (qué sitios) es una decisión de producto (catálogo #48), no de Pablo; Pablo solo dice cuántos puede procesar | Pablo |
| 5 | Rango temporal | **30 años, 2026-01-01 → 2055-12-31, cada hora** (cubre el ciclo nodal lunar de 18,6 años). Se sirve como **vectores Sol/Tierra en `MOON_ME` por año** + horizonte por sitio, y la web genera la `Timeseries` de cualquier ventana (ver J10). Los `timeseries/<id>.json` estáticos se mantienen para una ventana por defecto, por compatibilidad | Javi2 (TimeBar), Marta, Cristóbal |
| 6 | `sun_frac` | Solo se usa en `illum_pct`. Sunset/Earthset siguen saliendo de `lit` / `earth_visible`: no cambia ningún helper | Javi2 |
| 7 | Mission | **Usa `mission_config` y el modelo de llegada (J8)** para sus escenarios. Formato y archivo detallados en el bloque de Cristóbal | Cristóbal |
| 8 | Modo de tiempo en Explore | **Implementado en el MVP:** selector "Design" (fecha de aterrizaje) / "Mission" (fecha de lanzamiento → llegada calculada), en `web/src/scoring/` y montado en Explore | Marta, Javi2 |
| 9 | Coordenadas arbitrarias | **Vectores en marco lunar + transformación topocéntrica con paralaje exacta de la Tierra** (`@/ephem`), que es lo que pide §9. Pablo lo usa para la cámara en cualquier punto. Detalle en su bloque | Pablo |

**Por qué importa el alcance del relieve lejano (decisión 4).** En el polo sur el Sol está como mucho a ~1,5° sobre el horizonte, así que montañas lejanas lo tapan:
- Un relieve 2 km más alto que el observador a **50 km** subtiende `atan((2000 − 50000²/(2·1737400))/50000)` ≈ **1,5°**: tapa el Sol por completo.
- El mismo relieve a **100 km** ya queda oculto por la curvatura.

Si se recorta a 20 km, la iluminación sale **sobreestimada**. Por eso el alcance debe cubrir al menos ~100–150 km. Lo fija Pablo según el DEM y el coste, y lo documenta en `source`.

**Por qué 0,1° y no más fino (decisión 4).** En el navegador el coste es nulo (una consulta por muestra). El límite real es el DEM: un píxel de 20–80 m subtiende ~0,1° a 20–50 km, así que bajar de 0,1° no aporta información. El disco solar mide 0,53°.

#### J1. Alcance y resolución
- **Se puede seleccionar toda la Luna, con énfasis en el polo sur.** Fuera de los polos la física es sencilla: hay ciclo día/noche regular (~14,8 días de luz y ~14,8 de noche) y la Tierra es siempre visible en la cara visible y nunca en la oculta (solo oscila en el limbo). Ahí basta con **horizonte plano**. En el polo sur el Sol roza el horizonte (±1,5°), así que el **horizonte real del DEM es imprescindible**.
- **Parche del polo sur:** las capas de datos usan **la misma proyección y los mismos límites que el parche de Marta**, la estereográfica polar sur de `layers.json` hasta −80° (la misma que Moon Trek `SP`). Así se superponen píxel a píxel.
- **Resoluciones:** ~240 m para la vista general del polo sur y 20–60 m en modo avanzado (regiones de Artemis / sitios de Barker).
  - Ojo: 240 m dentro de los 5° del polo son ~1,25 M celdas. Los horizontes por celda a 240 m son V2.
  - En el MVP se calculan horizontes para la **lista curada**. Para el mapa de calor de Marta (`grid_metrics.bin`, celdas de 5 km ≈ 14 000 puntos) también es viable, si Pablo llega con los horizontes por celda.

#### J2. Motor de efemérides: SPICE + Horizons
- Horizons y SPICE usan la misma efeméride (DE440) y dan los mismos ángulos. **La precisión depende del DEM y de la rejilla, no del motor.**
- **SPICE es el motor principal:** offline, rápido y con el marco `MOON_ME` para rotar a cada sitio.
- **Horizons se usa para validar** (la diferencia debe ser < 0,01°) y como "dato oficial" en los sitios del juego (`astroquery.jplhorizons` con `location={"lon","lat","elevation","body":301}`, `quantities="4"` = az/el).
- **La efeméride se calcula una sola vez** (vectores Sol y Tierra respecto al centro lunar, cada hora) y después se rota al sistema local de cada sitio. La Tierra se corrige con paralaje exacta: `r_tierra − r_sitio`. **Lo costoso es el horizonte, no la efeméride.**
  - Es coherente con lo que dice Marta en su bloque: la dirección del Sol es la misma en todo el parche.
- ✅ (J0 #5 y #9) Esos vectores **se publican** (por año, ver J10) y la web calcula az/el de **cualquier** punto y ventana sin backend (`@/ephem`). Es la "ampliación futura para coordenadas arbitrarias" de §9, adelantada al MVP porque es lo que permite servir 30 años.

#### J3. Fuentes de datos
- **DEM numérico y perfiles de horizonte:** los produce Pablo (`python/terrain/`, PGDA 81 y Barker et al. 2021). Yo los consumo.
- **Moon Trek WMTS:** son **imágenes renderizadas, no valores**. Sirven para mostrar y validar, no para calcular.
  - Plantilla de tesela: `https://trek.nasa.gov/tiles/Moon/SP/{LayerID}/1.0.0/{Style}/{TileMatrixSet}/{Z}/{Row}/{Col}.png`
  - Capabilities: `.../{LayerID}/1.0.0/WMTSCapabilities.xml` (probado: devuelve 200).
  - IDs útiles:
    - Iluminación media: `LRO_LOLA_Illumination_SPole65S_240m`
    - Visibilidad de la Tierra: `AVGVISIB_85S_060M_201608_EARTH_SP`
    - **PSR**: `NAC_POLE_PSR_SOUTH_STRETCH`
    - Hielo: `sp_ice_depth_new_240m.mat_today_27-Oct-2016`
    - Diviner: `DIVINER_summer_Max_Temp_SP_below110K_240mp`
    - Pendiente 5 m: `ColorSlope_LRO_LOLA_DEM_SPole875_5mp_v04`
    - Rugosidad: `LRO_LOLA_ClrRoughness_SPole75S_240m`
- **PSR = Permanently Shadowed Region:** fondos de cráter donde nunca da el Sol (< ~110 K), que funcionan como trampas frías de hielo de agua. `psr_dist_km` es la distancia del sitio a la PSR más cercana. Recoge el compromiso típico del polo sur: cresta con luz y Tierra a la vista, cerca de una PSR con hielo.

#### J4. Cálculos
1. **Perfil de horizonte** (lo genera Pablo). Lo que necesito de él:
   - 360 azimuts desde el norte local, en sentido horario.
   - Relieve lejano (~150–200 km) con curvatura `d²/2R`.
   - La altura del observador indicada.
2. Series horarias del Sol y la Tierra (az/el) con SPICE.
3. Visibilidad:
   - `sol: sun_el > h(sun_az)` (con fracción visible del disco de 0,53°).
   - `tierra: earth_el > h(earth_az) + margen_antena`.
4. Métricas sobre la ventana (rachas con run-length encoding).
5. Muestreo de PSR y otras capas, cuando haya fuente validada (ver bloque de Pablo).
- **Libración de la Tierra (±6,7° en latitud por la inclinación del ecuador lunar respecto a la órbita, y ±7,9° en longitud por la excentricidad):** no hay que modelarla aparte, porque ya viene incluida en el az/el de la Tierra (ID 399) desde el sitio. En el polo sur la Tierra sube y baja ~±6,7° cada ~27 días.

#### J5. Variables y métricas
| Métrica | Definición |
|---|---|
| `illum_pct` | % de la ventana con Sol sobre el horizonte local (ponderado por la fracción de disco) |
| `sun_el_mean_deg` ⚠️ | Elevación solar media sobre el horizonte local. **Métrica clave de energía según el reto** |
| `max_dark_hours` | Racha más larga sin Sol (dimensiona las baterías) |
| `earth_vis_pct` | % con la Tierra visible por encima de horizonte + margen |
| `max_blackout_hours` ⚠️ | Racha más larga sin contacto con la Tierra |
| `sun_earth_pct` ⚠️ | % con Sol **y** Tierra a la vez |
| `slope_deg` | Pendiente en la zona de aterrizaje (no depende de la fecha) |
| `psr_dist_km` | Distancia a la PSR más cercana |

El tiempo hasta Sunset/Earthset (lo pide el reto) ya lo calcula la web a partir de la `timeseries` (helpers de `@/core`).
- **Comunicaciones** = visibilidad geométrica de la Tierra con margen de antena (por defecto 2°). Es el factor que realmente varía.
  - Se asume que la red DSN siempre tiene alguna estación con la Luna a la vista.
  - La distancia Tierra-Luna solo cambia ~1,1 dB las pérdidas, así que el SNR/link budget queda como dato informativo en Advanced (V2) y **no entra en el ranking**.

#### J6. Validez = requisitos de la misión, evaluados en una ventana de tiempo
- La validez no es del sitio en abstracto: **`válido(sitio, ventana [t_aterrizaje, t_aterrizaje + duración], requisitos)`**.
  - Ejemplo: un sitio ecuatorial con una misión de 7 días es válido si aterrizas al amanecer y no si aterrizas al atardecer.
- Hay dos tipos de requisito:
  - **De seguridad**, fijos: pendiente máxima, área plana.
  - **De misión**: en **Explore** los fija el usuario con sliders; en **Mission** los fija el escenario (ver el bloque de Cristóbal).
- Cada requisito se evalúa con su **margen** `(valor − umbral)/umbral`. Si falla, `reasons` dice cuál y por cuánto ("noche máxima 142 h > 96 h"). Encaja con el veredicto explicado de Mission.
- Las métricas de `sites.json` se calculan sobre todo el rango. **La web las recalcula para la ventana elegida** a partir de la `timeseries` (como ya hace `fractionOn`).

#### J7. Score (solo para los sitios válidos). Responde a la "normalización real" que pide Marta
1. **Utilidad por criterio con threshold/objective:** vale 0 en el umbral (el mismo valor del requisito) y 1 en el objetivo, lineal entre ambos (invertida si "menos es mejor": pendiente, noche, blackout, distancia a PSR).
   - **No se usa min-max**, porque haría depender el score del conjunto de sitios.
   - Sustituye a la normalización provisional del mock (`1 − slope/20`, `1 − dark_h/500`).
2. **Suma ponderada** `S = Σ wᵢ·uᵢ` con los pesos de los sliders. La web enseña la contribución de cada criterio en barra apilada.
   - ⚠️ Una sola función TypeScript pura, con tests, reproduce `site.score` con los pesos por defecto. Hay que acordar con Marta si vive en su `score.ts` o en `web/src/scoring/`; lo importante es que haya **una sola**.
3. **Robustez temporal:** % de desplazamientos de ±1…N días en los que el sitio sigue siendo válido ("¿y si se retrasa el lanzamiento?"). Es barata porque corre en el cliente.
   - La **robustez espacial** (vecinos dentro de la elipse de aterrizaje) queda para V2.
4. **Salidas para la web:**
   - **Ranking** con desglose y márgenes.
   - Curva **"mejor fecha"** (score frente a fecha de aterrizaje de un sitio).
   - **Scatter de compromisos** (energía frente a comunicaciones, frente de Pareto).
- Descartado: TOPSIS (no aporta frente a la suma ponderada), Monte Carlo de pesos (lo sustituye la robustez) y perfiles de misión (sobran: el foco es el polo sur).

#### J8. Tiempo de llegada (modelo orbital simple)
- En **Explore** hay dos modos de tiempo:
  - **Diseño:** se fija la fecha de aterrizaje directamente.
  - **Misión:** se fijan la fecha de lanzamiento, la trayectoria y la altitud de la LLO, y se calcula la llegada.
- En **Mission** lo puede usar el escenario de Cristóbal si le encaja: el lanzamiento está fijado o la nave ya está en órbita.
- `t_aterrizaje = t_lanzamiento + t_transferencia + t_espera + t_descenso`
  - **Transferencia** tipo Hohmann desde LEO de 200 km, con `t = π·√(a³/μ⊕)`: ~4,5 días con la Luna en el perigeo y ~5,4 días en el apogeo. La distancia sale de la efeméride.
  - Alternativas fijas: "rápida tipo Apolo" ~3 días; "baja energía" ~3–4 meses.
  - **LLO a 100 km:** periodo ≈ 1,96 h. En **órbita polar** el polo se sobrevuela en cada órbita (espera ≤ ~2 h). Un sitio ecuatorial puede esperar **hasta ~13,7 días** a que la traza pase por encima (la Luna gira ~13,2°/día bajo un plano fijo).
  - **Descenso:** ~1 h.
  - No se modelan: Δv, ventanas de lanzamiento, NRHO ni perturbaciones (hay que declararlo).

#### J9. ✅ `mission_config`: parámetros compartidos (sliders de Marta, escenarios de Cristóbal; vive en el store como `missionConfig`)
Valores por defecto = valores iniciales de los sliders al abrir Explore y base que modifica cada escenario.

| Parámetro | Defecto |
|---|---|
| `time_mode` | `design` |
| `trajectory` | `hohmann` |
| `llo_alt_km` | 100 |
| `surface_days` | 7 (del orden de Artemis III, ~6,5 días) |
| `antenna_margin_deg` | 2 |
| `slope_max_deg` | 8 |
| `illum` threshold → objective | 50 % → 85 % |
| `max_dark_h` threshold → objective | 100 → 24 |
| `comm` threshold → objective | 50 % → 95 % |
| `max_blackout_h` threshold → objective | 72 → 12 |
| Pesos | Iguales |

Los umbrales son propuestas razonables, a ajustar con referencias.

```json
{ "id": "rescate_shackleton",
  "time_mode": "mission", "launch_utc": "2027-03-02T00:00Z",
  "trajectory": "hohmann", "llo_alt_km": 100,
  "start_in_orbit": true,
  "surface_days": 5,
  "requirements": { "max_dark_h": { "threshold": 48 }, "comm_pct": { "threshold": 0.6 } },
  "goal": { "type": "reach_valid_site", "deadline_days": 3 } }
```

#### J10. Contrato v1.1 (aditivo, sin renombrar nada de v1; contenido decidido en J0, falta el PR de esquemas)
- `SiteMetrics` + `sun_el_mean_deg`, `max_blackout_hours`, `sun_earth_pct`.
- `Timeseries` + `sun_frac?` (fracción de disco 0–1). `earth_visible` pasa a ser obligatorio en los datos reales.
- Perfil de horizonte `web/public/data/horizon/<id>.json`: `{ version, site_id, lat, lon, observer_height_m: 5, az_step_deg: 0.1, elev_deg[3600], max_range_km, source }`. Azimut desde el norte local en sentido horario; elevación en grados **con curvatura incluida**. Lo produce Pablo y lo usan Javi (`lit`/`earth_visible`), la vista de Pablo y las coordenadas propias.
- Nuevo `mission_config.schema.json` (J9).
- Normalización del score (J7) escrita en el contrato.
- **Efemérides largas:** `web/public/data/ephem/index.json` (rango 2026–2055, `step_s: 3600`, marco `MOON_ME`, kernels y versiones) + `ephem/<YYYY>.bin`, uno por año.
  - Cada `.bin` es `Float32` little-endian, 6 valores por hora: `sun_unit_xyz`, `earth_km_xyz` (Luna → Tierra, en km, para la paralaje exacta).
  - ~210 KB/año, ~6,3 MB los 30 años; se carga el año que haga falta.
  - `@/ephem` expone `skyAt(lat, lon, t)` y `buildTimeseries(site, horizon, start, end)`, que devuelve el **mismo tipo `Timeseries`** de v1, así que nadie cambia sus consumidores.
- `manifest.time_range` = la ventana por defecto de los `timeseries/<id>.json` estáticos (2027). La TimeBar puede ampliarse a 30 años usando `@/ephem` (cambio en `core`, de Javi2).

#### J11. MVP frente a V2 (la entrega es el 15-nov a las 23:59)
- **MVP:**
  - Efemérides SPICE de 2027 + validación con Horizons en 5 sitios (#39, #41).
  - `timeseries` y `sites.json` reales (#40): primero con horizonte plano y luego con los perfiles de Pablo para la lista curada.
  - Score con threshold/objective + `mission_config`.
  - Coordenadas propias con horizonte plano, etiquetadas "sin terreno" (`@/ephem`).
  - Vectores de 30 años por año + generación de `Timeseries` en cliente (J0 #5).
  - Llegada con modelo orbital simple + selector Design/Mission en Explore (J0 #8, ya implementado).
- **Si da tiempo:** `grid_metrics.bin` a 5 km para el mapa de calor de Marta, y robustez temporal.
- **V2:** horizontes por celda a 240 m, robustez espacial, link budget.
- **Entregas previstas:**
  - **14-nov por la noche:** PR del contrato v1.1 + Sol y Tierra reales con horizonte plano para los sitios curados.
  - **15-nov por la mañana:** horizontes de Pablo → `lit`/`earth_visible` y `sites.json` reales.
  - **15-nov a mediodía:** función de score + `mission_config`.
  - **~18:00:** freeze.
- **Validación (#41):**
  - Diferencia SPICE–Horizons < 0,01° en 5 sitios.
  - `illum_pct` comparable con Barker et al. 2021 y con la capa LOLA de Moon Trek en 2–3 sitios.
  - Resultado anotado en el PR.

### Pablo: topografía y Lunar Street View

**Objetivo y alcance.** Construir una vista sintética desde la superficie lunar,
orientable 360°, con topografía, coordenadas, altura del observador y azimut/elevación
del Sol y la Tierra. La arquitectura debe admitir cualquier ubicación; el primer
recorrido validado usa sitios del equipo. La cobertura visual global no implica
disponer de efemérides, horizonte científico o resolución de 5 m para cada punto.
El módulo aporta a Explore y al posterior modo educativo sin convertirse en una
segunda aplicación ni modificar las responsabilidades de los compañeros.

**Arquitectura visual recomendada.** CesiumJS + Cesium Moon (3D Tiles, asset de
referencia `2684829`) dentro de `web/src/streetview/`. Se reutilizan geometría global,
curvatura y niveles de detalle; no se construye un motor global de terreno desde
`PlaneGeometry`. El asset publica terreno ~5 m entre 87,5°S y 90°S, con distinta
resolución fuera del polo. Configurar elipsoide lunar y desactivar globo, atmósfera,
geocodificación y cuerpos celestes configurados por defecto para la Tierra.
La cuenta ion ya existe según Pablo; el acceso efectivo al asset y su rendimiento
se comprueban en el primer prototipo. Community es la opción inicial recomendada
para evaluación no comercial, dentro de sus condiciones y cuotas; sin contratar
un plan de pago como requisito de arranque.

**Compatibilidad con el equipo.** Conservar React, TypeScript, rutas y store de
Javi2. El shell de Javi2 (PR #53, ya integrado en `main` y `dev`) reserva `StreetView.tsx` y ya proporciona `useSelectedSite`,
`useTimeseries`, `sampleAt` y el `TimeBar`. El componente Cesium se monta por separado
del canvas R3F de Marta, se carga al entrar y libera visor, recursos y listeners
al salir. Esto mantiene el globo/Explore de Marta y la gamificación de Cristóbal.
Añadir la dependencia/configuración de Cesium mediante PR coordinado; no migrar
el stack de otros módulos ni crear otro store o reloj.

**Datos científicos independientes.** Pablo mantiene el pipeline offline en
`python/terrain/`: adquirir DEM, revisar marcos/unidades, recortar, generar altitud,
pendiente y perfiles de horizonte. Base inicial: LOLA PGDA producto 81,
`ldem_87s_5mpp.tif`, 87–90°S a 5 m/píxel, en MOON_ME de DE421 según el productor.
Ampliar con un producto polar/global de menor resolución únicamente donde el
alcance científico lo requiera. Los datos crudos siguen fuera de Git y del bundle.
Validar la referencia vertical y su transformación al marco de Javi; el nombre
genérico `MOON_ME` o un CRS lunar no garantizan por sí solos la misma realización.

**Entregable adicional para Marta (prioritario).** Exportar un heightmap polar
sobre la misma proyección, radio, `bounds_m`, orientación y ventana hasta −80°
de `layers.json` (§5 Marta). Objetivo inicial: rejilla 1025×1025 en Float32
little-endian con máscara y manifest; Int16 es una opción solo si rango,
NoData y cuantización quedan acordados. Registrar altura, referencia vertical,
CRS/marco, dimensiones, orden de filas, escala y cobertura. El DEM PGDA 81 de
87–90°S y el recorte local de 1,28 km no cubren todo el parche: hace falta
seleccionar y validar un DEM de menor resolución para la ventana completa
(el candidato de Marta sigue pendiente de verificar). No rellenar las zonas
ausentes con datos inventados; publicar un mock explícito hasta disponer del
producto real. El esquema y el loader se acuerdan con Marta/Javi2 mediante
PR a `contracts/`; no reinterpretar `elevation.png` gray8 como altura precisa.

**Entregables de terreno y horizonte.** Reutilizar el exportador existente de
GeoTIFF, heightmap PNG16, máscara y Float32 little-endian con manifest. El PNG16
es un formato de intercambio; para alturas en web se necesita un decodificador
adecuado o Float32, no una lectura de Canvas que reduzca los datos a 8 bits.
Preparar para Javi perfiles con azimut desde norte lunar local, sentido horario,
elevación en grados, altura del observador, fuente/marco/resolución y cobertura.
360 azimuts son una resolución inicial declarada, no una precisión garantizada.
Curvatura y relieve lejano forman parte del horizonte; un recorte de 20×20 km no
garantiza cobertura suficiente. Distinguir norte de cuadrícula polar de norte
local. Exportar incertidumbres o azimuts sin cobertura como desconocidos.
Los perfiles offline pueden intercambiarse en NPY; su representación web y las
capas de altitud/pendiente deben añadirse al contrato común mediante PR.
Iluminación, visibilidad temporal y score siguen siendo responsabilidad de Javi;
los productos PSR son una ampliación con fuente validada, no un entregable inicial.

**Observador y tiempo.** Cámara a 1,7 m sobre la malla visible como valor inicial
configurable; altura científica del DEM y altura visual se conservan por separado.
Control de orientación con ratón y táctil, sin exigir sensores del móvil. Consumir
`selectedSiteId`, `currentTimeUTC`, `mode` y el control temporal existente. Para los
sitios del catálogo, conservar `sites.json` y `timeseries/<id>.json`; el muestreo
real lo indican los datos, sin imponer un año de series horarias. Mostrar la hora
de la muestra usada y el rango disponible: `sampleAt` actualmente toma la muestra
anterior y limita los extremos, por lo que no debe presentarse como extrapolación
válida fuera del rango. Mantener visibles las etiquetas `mock` cuando proceda.

**Coordenadas personalizadas y crecimiento global.** La selección manual puede
mover la cámara visualmente. Si cambia el observador respecto al sitio seleccionado,
no reutilizar sus series como si correspondieran al nuevo lugar. La primera entrega
señala qué resultados no están disponibles. Para ciencia en ubicaciones arbitrarias,
acordar con Javi una representación de vectores/posiciones en marco lunar y
tiempo explícitos, más una transformación topocéntrica validada. No se exige
un archivo nuevo al MVP: primero evaluar los datos existentes y la precisión
necesaria; para la Tierra no asumir paralaje nulo en resultados científicos; esto permite
reutilizar datos temporales sin precalcular una serie por cada punto de la Luna.
Requiere contrato y validación propios, igual que el horizonte fuera de los sitios
precalculados. La extensión compartida de ubicación se acuerda con Javi2; las
coordenadas locales del visor no sobrescriben silenciosamente `selectedSiteId`.

**Cielo y validez visual.** Posicionar Sol/Tierra desde los resultados de Javi,
mostrar azimut/elevación y distinguir horizonte geométrico de ocultación por relieve.
Añadir estrellas y constelaciones después del recorrido de terreno + Sol/Tierra,
con catálogo y transformación inercial→lunar documentados. La fase de la Tierra
requiere geometría e información adicionales a azimut/elevación; no se presupone
resuelta por los arrays existentes. Las sombras de imágenes compuestas de Cesium
Moon no representan necesariamente la fecha del usuario; sombreado dinámico y
perfil numérico se distinguen explícitamente. No aplicar un offset vertical fijo
Cesium/LOLA a partir de un reporte ajeno: comparar varios puntos, marcos y niveles
de detalle y documentar las diferencias antes de calibrar.

**Orden de implementación.**

1. Conservar descarga/exportador y hacer un prototipo Cesium aislado: acceso al
   asset, elipsoide correcto, cámara sobre la malla, giro 360°, controles táctiles
   y carga/limpieza dentro del shell. Fijar aceptación con una escena real antes
   de ampliar: un sitio del equipo en escritorio y móvil, sin enterramiento de
   cámara ni uso de configuraciones terrestres.
2. Integrar catálogo, selección y tiempo del shell; mostrar Sol/Tierra de las
   series con sus límites. Reutilizar los mocks existentes solo como mocks.
3. En paralelo al visor, acordar/exportar el heightmap polar que desbloquea a
   Marta y completar/validar el DEM propio. Entregar recortes, altitud/pendiente
   y perfiles de horizonte de los sitios prioritarios a Javi; son productos
   diferentes, con cobertura/resolución declaradas.
4. Contrastar dos sitios y fechas entre renderer, DEM y cálculo de Javi; probar
   cambio de modo, red interrumpida, ausencia de datos y latencias de carga. La
   precisión de las métricas se fija con la resolución y los casos de referencia,
   no con los decimales mostrados.
5. Ampliar coordenadas arbitrarias con datos compatibles; después estrellas y
   constelaciones. QR de instantánea es una ampliación educativa posterior al
   recorrido integrado; sincronización de clase en directo queda fuera del MVP.

**Contingencia acotada.** Si el primer prototipo demuestra que acceso, rendimiento
o georreferenciación hacen inviable Cesium para la entrega, usar los recortes reales
ya exportados en three.js/R3F dentro del mismo componente y limitar explícitamente
la cobertura. No desarrollar ambos renderers en paralelo. Esa alternativa debe
incluir curvatura/horizonte y procedencia, no presentar un plano local como cobertura
global. La elección no cambia los contratos de selección, tiempo o series.

**Estado real y límites.** Existen descargador, inspección y exportador offline;
un primer recorte real de 1,28×1,28 km y doce pruebas correctas de esas herramientas.
El recorte se eligió por disponibilidad de teselas recibidas, no es un sitio de
  misión validado. El DEM completo ya está descargado y se han decodificado tres
  ventanas de referencia; eso no valida todos los píxeles ni la geodesia. En la
  rama de #46 se implementa el primer motor Cesium con cámara, marcadores de
  dirección y reloj compartido: tipos, lint, 25 pruebas y build correctos. La
  prueba del terreno real en ion sigue pendiente del token; no se afirma que
  cámara/touch/alturas ya estén verificados con el asset. Perfiles de horizonte,
  capas para el frontend y cielo estelar siguen pendientes. El trabajo sirve a la base científica
y a la contingencia local; no obliga a construir la geometría visual global propia.

**Fuentes del bloque:** [Cesium Moon](https://cesium.com/platform/cesium-ion/content/cesium-moon/),
[PGDA 81](https://pgda.gsfc.nasa.gov/products/81), contratos y helpers en `dev`.
Reconciliación solicitada por Pablo; seguimiento en **#59**.

> **➕ Para Pablo: decidido con Javi el 2026-11-14 (§5 Javi, J0 #4 y #9).** Añadido por @javiseirulo; no cambia nada de lo anterior.
> - **Perfil de horizonte**, que produces tú:
>   - Ruta: `web/public/data/horizon/<id>.json` = `{ version, site_id, lat, lon, observer_height_m: 5, az_step_deg, elev_deg[], max_range_km, source }`.
>   - **Observador a 5 m** sobre el terreno.
>   - **`az_step_deg` = 0,1** (3600 valores) en los sitios curados, y **1°** en las celdas de 5 km del mapa de calor.
>   - Azimut desde el norte local, en sentido horario. Elevación en grados **con la curvatura `d²/2R` incluida**.
>   - El alcance (`max_range_km`) lo fijas tú. Tiene que llegar al relieve que puede tapar un Sol a ≤1,5°: ~100–150 km.
>   - `source` = producto DEM + versión.
> - **Cobertura:** la lista de sitios la marca el catálogo curado (#48). Tú dices cuántos perfiles da tiempo a procesar.
> - **Cámara en cualquier punto:** no reutilizar las series de otro sitio (como ya dices arriba).
>   - Usa `skyAt(lat, lon, t)` de `@/ephem`: vectores Sol/Tierra en `MOON_ME` sacados de SPICE, con transformación topocéntrica y **paralaje exacta de la Tierra**. Da el az/el de ese punto en 2026–2055.
>   - Si el punto no tiene perfil de horizonte, muestra solo el horizonte geométrico y etiquétalo ("no terrain").
> - **Validación cruzada:** la que ya tienes prevista (2 sitios y fechas: render frente a `lit`/`earth_visible`) se anota en el PR (#41).

### Marta: visor 3D de la Luna y modo exploración
> Revisado 2026-11-14 contra el código de `dev` (`contracts/types.ts`, `web/src/core`, `web/src/layers`, mocks de `public/data`).
> Marta trabaja en `web/src/globe/`; todo lo que sea de otra carpeta o de `contracts/` va por PR con su dueño.

- **Herramientas:**
  - R3F + drei (ya instalados: three 0.187, R3F 9.8, drei 10.7). `OrbitControls`; `Html` **solo** para la etiqueta del pin seleccionado o bajo el ratón.
  - Estado: el compartido es el store de `@/core` (Javi2), con sus 4 campos de contrato (`selectedSiteId`, `currentTimeUTC`, `activeLayers`, `mode`) + `layerOpacity`.
    No se crea otro store global. Los pesos y el rango de fechas son estado **local** de `src/globe` (un `create()` de zustand propio o `useState`);
    si otro módulo los necesita (p. ej. el juego), PR a `src/core` con Javi2.
  - Globo: textura de color LROC WAC global y normal map derivado de LOLA, en JPG/WebP (sin KTX2). **4k por defecto**; 8k solo si el rendimiento lo aguanta (riesgo §8).
    ⚠️ Fuente y versión exactas de cada textura → `docs/04-resources-data.md` antes de subirlas (aún no están registradas).
  - Terreno polar real a partir de un DEM LOLA del polo sur. Candidato: `LDEM_80S_80MPP_ADJ` (80 m/px).
    ⚠️ **Confirmar autoría, producto y versión al descargarlo** y registrarlo en `04-resources`; lo que hay registrado de Barker et al. 2021 es otro producto (PGDA 78: DEM de 5 m por sitio).
    El recorte y la exportación los hace **Pablo** (dueño del DEM en `python/terrain/`); Marta consume el archivo exportado.

- **Funciones:**
  - **Globo lunar con pins** de `sites.json` (`useData((s) => s.sites)`), coloreados con `scoreColor` de `@/layers` (mismos colores que el mapa 2D y la lista).
    Con ~20 sitios basta un `<mesh>` por pin; `instancedMesh` si se pasa de ~200. Los sitios con `valid: false` se pintan atenuados.
    Todos los candidatos actuales están entre 81,5°S y 89,9°S, así que en vista de globo se agrupan en un marcador **"South Pole · N sites"** que lanza el zoom al parche polar.
  - **Parche polar 3D** con terreno real:
    - **Ventana = la de `layers.json`** (estereográfica polar sur hasta −80°, ±304 km), no 85°S–90°S: con 85°S quedarían fuera 6 de los 20 sitios
      (Nobile A, Amundsen, Cabeus B, de Gerlache–Kocher, Mons Mouton, Plain at 81°S). Así las capas se pegan sin recortar PNGs.
    - Malla construida con las alturas (no `displacementMap`): cada vértice se coloca **sobre la esfera real** (`(R + h)` en la dirección radial de su lat/lon).
      La curvatura sale sola y es grande: ~27 km de caída en el borde del parche.
    - Exageración vertical ×2 indicada en pantalla.
    - Posición de cada sitio con `projectSouthPolar` / `latLonToUv` de `@/core`. **No hace falta añadir `px`/`py` a `sites.json`.**
    - **Iluminación según la fecha** (`currentTimeUTC` de la barra temporal): la dirección del Sol en el sistema fijo a la Luna es la misma en todo el parche
      (paralaje despreciable). Se obtiene de la timeseries de cualquier sitio: (`sun_az`, `sun_el`) en su lat/lon → vector en los ejes del parche → `DirectionalLight`.
      **No hace falta un archivo nuevo de "vector Sol"**; lo mismo vale para la Tierra.
    - Las sombras del shadow map son **ilustrativas**: se calculan sin la exageración ×2 (con ella serían más largas de lo real) y con ~0,6–1,2 km por celda.
      La cifra oficial de luz es `lit` / `illum_pct` del pipeline de Javi, no el render. Rótulo: "Illustrative shading".
    - Textura del parche: albedo neutro o mosaico polar LROC, con la luz en tiempo real. **Nada de hillshade precalculado**: sumaría una segunda luz fija que contradice la fecha.
  - **Barra lateral de filtros** (sustituye o amplía el `SiteList` de arranque):
    - Sliders de pesos con los valores por defecto de `sites.json.weights`.
    - Score en cliente: `score = Σ wᵢ·nᵢ / Σ wᵢ`, con `nᵢ` la métrica normalizada a 0–1 **en la dirección "más es mejor"**
      (pendiente, noche más larga y distancia a PSR se invierten o acotan). El mock usa `1 − slope/20` y `1 − dark_h/500`.
      ⚠️ La normalización real la define **Javi**; hay que acordarla y escribirla en el contrato (PR a `contracts/`), para que `score.ts` reproduzca `site.score` con los pesos por defecto.
      ➕ ✅ Decidido el 2026-11-14 (§5 Javi, J0 #1–#3):
      - El score vive en `web/src/scoring/` (Javi) y se **importa** de `@/scoring`, con la normalización threshold/objective de J7.
      - Los sliders leen y escriben `missionConfig` del store.
      - Slider simple: `sun_el_mean_deg`. `max_blackout_hours` y `sun_earth_pct` van en Advanced.
      Un test lo comprueba.
    - Los filtros duros (`valid`) no cambian con los pesos: un sitio no válido nunca sube al top.
    - **Rango de fechas**: `illum_pct`, `earth_vis_pct` y `max_dark_hours` se recalculan para ese rango a partir de las timeseries
      (`lit`, `earth_visible`; `fractionOn` en `@/core`; 20 archivos, ~1,4 MB en mock). `slope_deg` y `psr_dist_km` no dependen de la fecha.
      El rango es local y distinto de `currentTimeUTC`: la barra temporal es el instante y el rango es el filtro.
    - Una sola función `score.ts` en `src/globe/` (el repo es TypeScript), compartida por pins, lista y mapa de calor.
  - **Clic en un pin** → `selectSite(id)` → `SiteDetail` (ya existe en el arranque) → "Stand here in Street View" = `setMode('streetview')`, que navega a `/streetview/:siteId`.
    La transición animada (vuelo de cámara hasta el sitio) va **antes** de `setMode`; la vista de Street View es de Pablo.
  - **Capas:**
    - Las capas raster (pendiente, sombra permanente, iluminación, score, elevación) **ya vienen en `layers.json`**. Las produce el pipeline (Pablo/Javi); hoy son mock.
      Marta no descarga productos LDSM/LPSR por su cuenta.
    - La UI para activarlas, ordenarlas y cambiar su opacidad es `LayersPanel` (Javi2). Marta solo las **pinta** en el parche:
      lee `activeLayers` (orden de abajo arriba) y `layerOpacity` del store, y usa `loadLayerTexture(layer)` → `THREE.CanvasTexture` mapeada con `latLonToUv`.
    - **Misiones pasadas** (globo): marcadores de alunizajes históricos desde `historic_sites.json`.
      Clic → tarjeta con nombre, agencia/país, fecha, coordenadas, resultado y una línea de contexto, más la fuente de las coordenadas.
      Solo texto, sin logotipos, parches ni banderas (CLAUDE.md §3). Interruptor local en `src/globe`, porque no es una capa raster.
      Cubre la "lista curada (Apollo, CLPS, otros países)" que pide el reto (`07-mvp-plan.md`).
    - **Mapa de calor de idoneidad** (parche, experimental): celdas de 5 km coloreadas en 3 clases (excelente / regular / no cumple), recalculadas en cliente con los sliders y la misma `score.ts`.
      Se suavizan, se eliminan las regiones pequeñas y solo las grandes llevan etiqueta, con el nombre del accidente más cercano.
      Leyenda "Indicative, 5 km cells".

- **Depende de:**
  - **Ya disponible en `dev`:** `sites.json`, `timeseries/<id>.json`, `layers.json` + PNG (todo mock), el store, `TimeBar`, `LayersPanel`, `SiteDetail`,
    y los helpers `loadLayerTexture`, `projectSouthPolar`, `latLonToUv`, `sampleAt`, `fractionOn` y `scoreColor`.
  - **Nuevo, requiere PR a `contracts/` y avisar al equipo** (regla §7.3). Hasta que llegue lo real, Marta añade un mock en `gen-mocks.mjs` y trabaja con él:
    1. **Heightmap del parche** (dueño: Pablo). Rejilla cuadrada sobre `bounds_m` de `layers.json`, p. ej. 1025×1025 en `Int16` de metros
       (~2 MB; ~0,6 km/celda) o `Float32`, con su cabecera (`bounds_m`, tamaño, unidades) en `layers.json` o en un JSON propio.
       No sirve un PNG de 16 bits: el canvas del navegador lo decodifica a 8 bits. Tampoco la capa `elevation.png` actual: con 8 bits son escalones de ~33 m.
    2. **Normalización del score** en `sites.json` (dueño: Javi): rango y sentido de cada métrica.
    3. **`historic_sites.json`** (dueña: Marta; puede reutilizarlo Cristóbal en Mission): tipo `HistoricSite` en `contracts/types.ts`
       (`id`, `name`, `agency`, `country`, `date_utc`, `lat`, `lon`, `outcome`, `note`, `source`) y archivo en `public/data/`.
       Cada coordenada con fuente en `04-resources`.
    4. **`grid_metrics.bin`** (solo para el mapa de calor; dueños: Javi y Pablo): métricas por celda de 5 km y día sobre la misma ventana.
       ~120×120 celdas × 30 días × 3 métricas en `uint8` ≈ 1,3 MB. Necesita el cálculo de horizontes por celda: es lo más caro del pipeline.
       Si no llega, el mapa de calor se descarta sin bloquear nada.

- **Iteraciones:**
  - v0: esfera texturizada en `GlobeView.tsx` con pins de `sites.json` (mock), marcador del polo y clic → `selectSite`. Detalle con el `SiteDetail` existente.
  - v1: barra lateral con sliders de pesos y rango de fechas, `score.ts` con test (reproduce `site.score`) y lista reordenada en vivo. Con esto, Explore queda completo.
  - v2: parche polar con heightmap (mock primero, luego el de Pablo), curvatura real, luz según `currentTimeUTC`, capas de `layers.json` pintadas encima y transición animada al Street View.
  - v3: capa de misiones pasadas con `historic_sites.json`.
  - v4 (experimental): mapa de calor de idoneidad. Se decide con el primer render: si sale fragmentado tras el suavizado, o si `grid_metrics.bin` no llega, se descarta.
  - En móvil se queda el mapa polar 2D de Javi2 (toggle 2D/3D en `ExplorePage`). El 3D no tiene que funcionar en 375 px.

### Javi2: web, estética y layers de la página
- **Responsable de** `src/core` (store, loader de datos, router) y del shell: layout, navegación entre modos, landing, about/datos/créditos NASA y responsive.
- **Herramientas:** Tailwind 4, shadcn/ui, Framer Motion y React Router 7. La identidad visual se puede definir con Figma o Stitch.
- **Layers:** gestiona el sistema de capas (registro, orden, opacidad, leyendas) con `layers.json`. Marta las pinta en 3D y Javi2 da la UI de control.
- **Iteraciones:**
  - v0: esqueleto con 3 rutas vacías y el store, entregado el día 1 porque desbloquea a todos. ✅ (PR #53, más capas, mapa 2D, landing y About)
  - v1: design system (colores, tipografía, componentes).
  - v2: leyendas y onboarding.
  - v3: pulido, rendimiento (lazy-load de modos ✅ ya hecho) y deploy.

### Cristóbal: módulo Mission (juego)
> Actualizado el 2026-11-14 según la descripción de @Manuelcgg165 (issue #52, `docs/team/manuelcgg165/game-module.md` en la rama
> `Manuelcgg165/52-mission-module-notes`). **Sustituye** a las mecánicas del plan original (logros, quiz, ranking, misiones tipo "encuentra un punto con >80% de luz").

- **Qué es** (mantiene la idea del equipo, `docs/ideas/javiseirulo-explore-mission.md`):
  - Alerta tipo Mission Control: "no podemos aterrizar donde estaba previsto".
  - Pocos requisitos y 4–5 sitios con sus parámetros, **sin indicar cuál es mejor**.
  - El jugador elige uno, se simulan N días y un **veredicto explica por qué** salió bien o mal ("sin visibilidad de la Tierra", "te quedaste sin Sol"). Opción de reintentar.
  - Dos variantes: **modo profesional** y **modo estudiante** (jugador único o una clase). Sin multijugador.
- **Cómo se construye:**
  - Carpeta `web/src/game/`, TypeScript sobre el store compartido, tests con vitest.
  - Consume `sites.json` (métricas), `timeseries/<id>.json` (`t_utc`, `sun_el`, `earth_el`, `lit`; también `earth_visible` si viene) y del store `selectedSiteId`, `currentTimeUTC` y `mode: "game"`.
  - Helpers ya disponibles en `@/core`: `useTimeseries`, `sampleAt`, `hoursUntilChange`, `fractionOn`.
  - **Veredicto determinista**, calculado de la serie temporal (sin IA dentro del producto).
  - No depende del 3D ni del cálculo real: se desarrolla con los mocks (la ventana mock de 30 días cubre simulaciones de 9 o 14 días).
- **Necesita de los demás:** contratos de `sites.json` y `timeseries` estables (aviso si cambian) y series horarias que cubran toda la ventana simulada de los sitios del escenario.
- **Iteraciones:**
  - v0: motor de simulación y veredicto con datos mock y tests.
  - v1: interfaz (alerta, tarjetas de sitios, simulación, veredicto, reintentar).
  - v2: datos reales e integración con el globo y la ficha de sitio.
  - v3: modo estudiante y pulido.
- **Pendiente de cerrar:** reglas de victoria y derrota · duración de la simulación (9 o 14 días) · qué diferencia el modo profesional del modo estudiante.

> **➕ Para Cristóbal: formato de escenarios, decidido con Javi el 2026-11-14 (§5 Javi, J0 #7).** Añadido por @javiseirulo; no cambia lo anterior.
> - **Archivo:** un JSON por escenario en `web/src/game/scenarios/<id>.json` (tu carpeta).
>   - Forma: `MissionScenario` = `MissionConfig` de `contracts/types.ts` + campos de juego.
>   - El esquema JSON (`contracts/mission_config.schema.json`) llega con el PR de contrato v1.1. Hasta entonces manda el tipo TypeScript.
> - **Ejemplo:**
>   ```json
>   { "id": "rescate_shackleton",
>     "title": "Landing site lost",
>     "briefing": "The planned site is no longer safe. Pick a new one before the lander runs out of time.",
>     "site_ids": ["shackleton_rim_02", "connecting_ridge", "de_gerlache_rim_01", "malapert_massif"],
>     "time_mode": "mission", "launch_utc": "2027-03-02T00:00:00Z",
>     "trajectory": "hohmann", "llo_alt_km": 100,
>     "start_in_orbit": true, "orbit_plane_lon_deg": 40,
>     "surface_days": 9,
>     "requirements": { "max_dark_hours": { "threshold": 48 }, "earth_vis_pct": { "threshold": 0.6 } },
>     "goal": { "type": "reach_valid_site", "deadline_days": 3 },
>     "variant": "professional" }
>   ```
> - **Campos:**
>   - `site_ids`: los 4–5 sitios de `sites.json` que se muestran sin pista.
>   - `surface_days`: la duración de la simulación (9 o 14, según decidas).
>   - `requirements`: umbrales con la forma threshold/objective de J9.
>   - `start_in_orbit` + `orbit_plane_lon_deg`: la nave ya está en órbita polar y hay que esperar a que la traza pase por el sitio.
>   - `variant`: `professional` / `student`.
> - **Tiempo de llegada:** `computeArrival(config, site)` de `@/scoring`.
>   - Devuelve las fases (lanzamiento → llegada a la Luna → espera en órbita → aterrizaje) y `landing_utc`.
>   - La ventana que se simula es `[landing_utc, landing_utc + surface_days]`. Con `@/ephem` está disponible en 2026–2055.
> - **Veredicto:** usa la función de validez de `@/scoring` (llega con el PR de score). Devuelve `valid` y `reasons` con margen ("noche máxima 142 h > 48 h"), así Mission y Explore dan el mismo resultado.

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

## 9. Coordinación de Pablo con los módulos actuales (#59)

Actualización de Pablo, 2026-11-14, contrastada con `dev` en `3cc91ef` y con
el plan revisado del chat «Proponer enfoques educativos lunares». Se conserva el
texto completo de los bloques de Marta, Javi, Javi2 y Cristóbal de esa revisión.
Lo propuesto aquí se publica para revisión compartida; no atribuye un OK a los demás.

| Con quién | Interfaz que se mantiene | Lo que hay que acordar antes de implementar |
| --- | --- | --- |
| Javi | `sites.json`, `timeseries/<id>.json`, azimut/elevación y visibilidad del pipeline | Perfil de horizonte (marco, altura, resolución y cobertura) y ampliación futura para coordenadas arbitrarias |
| Marta | Globo R3F, helpers de proyección, `layers.json`, `activeLayers`, `layerOpacity` | Heightmap polar Float32 + máscara/manifest sobre la ventana completa; el DEM de 87–90°S no basta para llegar a −80° |
| Javi2 | Componente React Street View, rutas, selección, reloj y loaders de `@/core` | Dependencia/build Cesium, carga diferida y limpieza; altura del observador y coordenadas propias solo con extensión de contrato revisada |
| Cristóbal | `mode: "game"`, selección y series del mismo pipeline; veredicto determinista | No introducir dependencia del renderer Cesium para jugar; respetar cobertura temporal y valores desconocidos |

Los PNG gray8 de las capas actuales son para visualización. El heightmap de Marta
y los perfiles de horizonte son productos nuevos, pendientes de PR de contrato;
este cambio documental no los crea ni cambia los esquemas v1. `sampleAt` toma la
muestra anterior y limita extremos: mostrar el instante usado y detectar el
fuera de rango. Un punto de cámara nuevo no recibe la serie de otro lugar.

No se publica código ni datos crudos de Pablo con #59. El descargador/exportador
y las notas locales se conservan para sus propios PRs. Las pruebas de adquisición
no acreditan una escena Cesium, una predicción de horizonte ni un enlace de radio.
