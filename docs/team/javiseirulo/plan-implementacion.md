# Plan de implementación de Javi: efemérides SPICE + scoring para toda la Luna

> Aprobado por @javiseirulo el 2026-11-14 (#67). Alcance y cambios para los demás: `docs/10-plan-tecnico.md` §10.
> Lo escribe Claude Code a partir de las decisiones de Javi; las decisiones son humanas (ver `docs/si-usage-log.md`).

## Context
La web en `dev` (e6825cd) funciona con **datos mock**, todos del polo sur:
- 20 sitios entre 81,5°S y 89,9°S;
- capas y mapa 2D en estereográfica polar hasta −80°;
- DEM de Pablo de 87°S a 90°S.

La decisión de Javi (J1, ratificada el 14-nov a las 19:15) es **toda la Luna seleccionable, con énfasis en el polo sur**. El código se quedó solo en el polo porque los mocks, las capas y el terreno se hicieron primero para el polo, que es donde está el problema difícil del reto. Ahora hay que llevar a toda la Luna mi parte y las de Pablo, Marta y Javi2.
Entrega: 15-nov a las 23:59 (freeze hacia las 18:00). Ahora: 14-nov, ~19:20.

## Decisiones de esta sesión
- **Toda la Luna.** Mi parte es global entera: efemérides, catálogo, métricas, validez y score, cualquier lat/lon, mapa de calor.
- **Terreno: esperar a Pablo.**
  - Horizonte plano con depresión de 5 m (−0,137°), marcado `"no terrain"`.
  - Cuando lleguen los perfiles de Pablo, se vuelve a ejecutar el export.
  - `slope_deg` y `psr_dist_km` van en `Site.pending_metrics`: no cuentan para la validez ni el score, y la UI dice "pending terrain".
  - Fuera de los polos el horizonte plano es físicamente razonable: el Sol sube alto y 1–2° de relieve solo mueven el amanecer unas horas. En los polos norte y sur hace falta el DEM.
- **Catálogo #48 global**, cada coordenada con su URL (sin fuente no entra):
  - ~40 sitios del polo sur: los 20 ids actuales re-fuenteados + regiones de Artemis III (2024) + Barker et al. 2021;
  - ~15–20 del resto de la Luna: Apollo 11–17, Luna 16/17/24, Chang'e 3/4/5/6, Chandrayaan-3, SLIM, IM-1, Blue Ghost M1 y candidatos del polo norte.
- **Git:** preguntar siempre antes de cada issue, push o merge. Sin force-push.
- **Paralelo:** subagentes en worktrees. Hacen commits solo en local; yo reviso, integro y pido permiso para publicar.

## Cambios que necesitan los demás para toda la Luna (copia de docs/10 §10)
| Quién | Cambio | Qué les doy yo |
|---|---|---|
| **Javi2** (core, capas, mapa 2D) | 1) Campo nuevo en el store **`selectedPoint: {lat, lon} \| null`** + `setSelectedPoint`, para clics en cualquier punto (globo o mapa); `AppEvents` en contracts. 2) Mapa 2D: modo **Global (equirectangular)** además del Polar, con `projectEquirect` en `@/core/projection`. 3) `layers.json`: `projection` por capa (opcional en v1.1) para admitir capas globales. 4) Lista de sitios agrupada por región (South pole · Near side · Far side · North pole). 5) `METRICS`/`verdictFor`: que no dependan de 15° fijos (usar `@/scoring`) y pintar "—" en las `pending_metrics`. 6) TimeBar a 30 años vía `@/ephem` | Contrato v1.1 (`region`, `pending_metrics`, schemas). Si da tiempo, `grid/global_1deg.bin` para la capa global |
| **Marta** (globo, Explore) | 1) Pins en su lat/lon real por todo el globo; el clúster "South Pole · N" solo para el grupo polar. 2) **Clic en cualquier punto del globo → `selectedPoint`** (raycast → lat/lon). 3) Iluminación del globo con `sunDirectionMoonME(t)` de `@/ephem` (válido para toda la Luna). 4) Mapa de calor global sobre el globo con `grid/global_1deg.bin` (equirectangular = UV de la esfera); el parche polar sigue con `layers.json`. 5) Filtro por región; sliders sobre `missionConfig` y score importado de `@/scoring` | `@/ephem` (`skyAt`, `buildTimeseries`, `sunDirectionMoonME`), `@/scoring` (`evaluateSite`, `rankSites`, `bestDateCurve`, `paretoFront`) y la rejilla global |
| **Pablo** (terreno, Street View) | 1) Street View en **cualquier** lat/lon: Cesium Moon ya es global; Sol y Tierra con `skyAt(lat, lon, t)`. 2) Horizontes con paso de 0,1° para los sitios polares del catálogo (PGDA 5 m / LOLA 80 m); para los no polares, horizonte plano etiquetado o, si es barato, el DEM global LOLA 118 m (ya registrado en docs/04). Lo decide y documenta él. 3) Polo norte: el mismo tratamiento que el sur si hay sitios del catálogo allí (LDEM_80N). 4) Pendiente en los sitios del catálogo (global 118 m fuera de los polos, avisando de que la línea base es más gruesa). 5) PSR de **ambos** polos (máscara o polígonos con fuente validada) para `psr_dist_km` | Catálogo con coordenadas y fuentes esta noche; formato de `horizon/<id>.json` (J10); `@/ephem` |
| **Cristóbal** (Mission) | Los escenarios pueden usar cualquier sitio del catálogo; `computeArrival` ya modela la espera por la traza (polo: 0 d; ecuador: hasta 13,7 d) | `computeArrival` y `evaluateSite` |

## Fases de mi código (cada PR desde `origin/dev`, rama `javiseirulo/<n>-<slug>`, base `dev`, sin upstream a dev)

### Fase 0 (yo, ~45 min): PR1 contrato v1.1 (aditivo)
- `contracts/types.ts`:
  - `SiteMetrics`: + `sun_el_mean_deg?`, `max_blackout_hours?`, `sun_earth_pct?`.
  - `Site`: + `checks?` (`{key, ok, value, threshold, objective?, margin}`), `pending_metrics?`, `region?` (`south_pole | north_pole | near_side | far_side`), `kind?` (`candidate | historic_landing`).
  - `Timeseries`: + `sun_frac?`, `horizon_source?`.
  - Tipos nuevos `HorizonProfile`, `EphemIndex` y `GridIndex`.
  - `RequirementKey` pasa a ser `keyof SiteMetrics`.
- Schemas: ampliar `sites` y `timeseries`; nuevos `horizon`, `ephem-index`, `grid-index` y `mission_config`. Normalización J7 y formato de los `.bin` en `contracts/README.md`.
- `contracts.test.ts` y los mocks siguen en verde.

### Fase 1, en paralelo: 3 subagentes en worktree sobre la rama del PR1

**Agente A: `python/` efemérides (PR2, #39 + parte de #41)**
- `python/pyproject.toml`: uv, Python 3.12, con spiceypy, numpy, requests, jsonschema, pytest y ruff. Paquetes `ephem/` y `export/`. `terrain/` es de Pablo y no se toca.
- `ephem/kernels.py`: descarga a `data_raw/kernels/` (de440s, moon_pa_de440_200625, moon_de440_250416, pck00011, naif0012) + meta-kernel.
- `ephem/vectors.py`:
  - `spkpos(SUN|EARTH, et, 'MOON_ME', 'LT+S', 'MOON')` cada hora de 2026 a 2055;
  - salida en `web/public/data/ephem/<YYYY>.bin` (Float32 LE: `sun_unit_xyz` + `earth_km_xyz`) e `index.json`.
- `ephem/topo.py`: `azel(lat, lon, h_m, vec)` con ENU sobre la esfera de 1737,4 km, paralaje exacta de la Tierra y `sun_frac`.
- `ephem/horizons_check.py`:
  - API de Horizons en 5 sitios **polares + Apollo 11 + uno de la cara oculta (Chang'e 4)** × varias fechas;
  - resultado en `docs/validation/horizons-check.md`; objetivo < 0,01°.
- Fixture `contracts/fixtures/golden-azel.json`. Tests en pytest + `.github/workflows/python.yml` (ruff + pytest).

**Agente B: web `@/ephem` + evaluación `@/scoring` (PR3)**
- `web/src/ephem/`:
  - `loadEphemYear`, `skyAt`, `sunDirectionMoonME`;
  - `buildTimeseries(site, horizon|null, start, end, {antennaMarginDeg})`, que devuelve el **mismo tipo `Timeseries`**;
  - `useHorizon`, con horizonte plano de respaldo;
  - paridad con `golden-azel.json`.
- `web/src/scoring/`:
  - `utility.ts`;
  - `evaluate.ts`:
    - `windowMetrics`;
    - `evaluateSite`, que devuelve `{valid, score = Σwᵢuᵢ/Σwᵢ, contributions, checks, reasons}` y excluye las `pending_metrics`;
    - `rankSites`;
  - `robustness.ts` (±N días);
  - `bestDateCurve` y `paretoFront`;
  - fixture `golden-score.json`.
- `computeArrival`: distancia Tierra–Luna con SPICE (de los `.bin`); Meeus queda como respaldo.
- `SiteCheckPanel.tsx`:
  - muestra el sitio seleccionado **o cualquier lat/lon de la Luna** (`selectedPoint` cuando Javi2 lo añada; hasta entonces, una entrada propia);
  - VALID/INVALID, checks con margen, score desglosado y robustez;
  - sustituye el aviso de "fuera de ventana" por `buildTimeseries`.
- Reutilizar `fractionOn`, `indexAt` y `hoursUntilChange` (`web/src/core/timeseries.ts`), y `missionWindow`/`landingTime` (`web/src/scoring/arrival.ts`).

**Agente C: catálogo global (#48, investigación)**
- `python/export/catalog.yaml` con id, nombre, lat, lon, región, `kind`, URL de la fuente y nota de precisión.
- Entradas en `docs/04-resources-data.md`.
- Lista para Pablo en `docs/team/javiseirulo/catalog-for-pablo.md`.

### Fase 2 (yo): PR4, export de datos reales (#40, #41)
- `python/export/all.py`:
  - `timeseries/<id>.json` para todo 2027, cada hora (2 decimales, `sun_frac`, `earth_visible` con 2° de margen);
  - `sites.json` con `mock:false` y `region`, `kind`, `checks`, `pending_metrics`; port en Python con paridad contra `golden-score`;
  - `manifest.json`;
  - validación contra los schemas;
  - `layers.json` no se toca.
- Validación de `illum_pct` frente a Barker 2021 y la capa LOLA en 2–3 sitios → `docs/validation/`. En el polo, con horizonte plano, se espera desacuerdo y se documenta.
- Con los horizontes de Pablo: volver a ejecutar el export y quitar `pending_metrics`.
- **Mapa de calor** (último de la cola), con horizonte plano y el año 2027:
  - `grid/global_1deg.bin`, equirectangular 360×180;
  - `grid/south_5km.bin`, ≤ −80° en la misma proyección que `layers.json`;
  - `index.json`, Float32 LE, con `illum_pct`, `max_dark_hours`, `earth_vis_pct`, `max_blackout_hours` y `sun_el_mean_deg`.

## Documentación en cada PR (append-only en lo compartido)
- `docs/10` §0 (estado de Javi), `docs/04`, `si-usage-log`, `decisions/log` y `team/javiseirulo/session-log`.
- `python/README.md` y `web/README.md` (carpeta `ephem/`).

## Verificación
- Python: `uv run ruff check`, `uv run pytest` y `uv run python -m ephem.horizons_check` (< 0,01° en sitios polares, ecuatoriales y de la cara oculta).
- Web: `npx -y pnpm@9.15.9` con `format:check`, `lint`, `typecheck`, `test` y `build`, incluido `contracts.test.ts` con datos reales y la paridad golden.
- Navegador (gstack `/browse`):
  - SiteCheckPanel en un sitio polar, en Apollo 11 y en un punto de la cara oculta: este último debe salir sin Tierra y no válido por comunicaciones;
  - modo Mission con aterrizaje en 2035 (vía `@/ephem`);
  - sin errores de consola y a 375 px sin scroll horizontal.
- CI en verde en cada PR antes de pedirte el merge.
