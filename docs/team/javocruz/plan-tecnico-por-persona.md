# Plan técnico: arquitectura, herramientas y reparto de trabajo

> Copia del plan que compartió @javocruz el 2026-11-14. La web (`web/`, `contracts/`) se está montando según este plan.
> ⚠️ Difiere del reparto A–E de los issues #34–51 (ver `docs/decisions/log.md`): falta confirmar con el equipo cuál manda.

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

| Capa | Herramienta | Versión orientativa |
|---|---|---|
| Repo | Monorepo en GitHub, `pnpm` workspaces + carpeta `python/` | pnpm 9 |
| Python | Python 3.12, entornos con `uv` | — |
| Frontend | Node 22 LTS, Vite 6, React 19, TypeScript 5 | — |
| 3D | three.js + @react-three/fiber 9 + @react-three/drei 10 | three r17x |
| Estado global | zustand 5 (un solo store compartido) | — |
| Estilos | Tailwind 4 + shadcn/ui | — |
| Deploy | GitHub Pages o Vercel (es estático) | — |
| Calidad | ESLint + Prettier, ruff (Python), GitHub Actions | — |

Las versiones exactas se fijan en `pnpm-lock.yaml` y `uv.lock` el primer día, y no se actualizan durante el hackathon.

**Alternativa a three.js:** CesiumJS tiene un elipsoide lunar y streaming de terreno. Es más rápido si queréis precisión geodésica, pero cuesta más integrarlo con el Street View y personalizar el estilo. La recomendación es three.js.

## 3. Estructura del repo

```
lunar-app/
├─ contracts/            ← LO PRIMERO: esquemas JSON + tipos TS compartidos
│  ├─ site.schema.json
│  ├─ timeseries.schema.json
│  └─ types.ts
├─ python/
│  ├─ ephem/             (Javi)
│  ├─ scoring/           (Javi)
│  ├─ terrain/           (Pablo)
│  └─ export/            → escribe en web/public/data
├─ web/
│  ├─ src/core/          store zustand, carga de datos, eventos (Javi2)
│  ├─ src/layers/        layers de la página/mapa (Javi2)
│  ├─ src/globe/         visor 3D + exploración (Marta)
│  ├─ src/streetview/    (Pablo)
│  ├─ src/game/          (Cristóbal)
│  └─ public/data/       ← mocks al principio, datos reales después
└─ data_raw/             (en .gitignore: kernels SPICE, DEM originales)
```

## 4. Contratos de datos (el pegamento para trabajar en paralelo)

**`sites.json`**: lista de localizaciones candidatas. Sale de Javi y lo consumen todos.
```json
{ "id": "shackleton_rim_01", "lat": -89.9, "lon": 0.0, "elev_m": 1900,
  "valid": true, "score": 0.87,
  "metrics": { "illum_pct": 0.82, "earth_vis_pct": 0.55, "slope_deg": 6.2,
               "max_dark_hours": 120, "psr_dist_km": 2.1 },
  "reasons": ["slope_ok", "illum_ok"] }
```

**`timeseries/<id>.json`**: un paso por hora durante un periodo, por ejemplo un año.
`{ t_utc[], sun_az[], sun_el[], earth_az[], earth_el[], lit[] }`
Lo consumen Street View (posición del Sol y la Tierra), los sliders de tiempo y la gamificación.

**Capas raster (Pablo/Javi → Marta/Javi2)**: PNG en 8 o 16 bits, o Cloud-Optimized GeoTIFF reproyectado a estereográfica polar: `elevation.png`, `slope.png`, `illumination.png`, `psr.png`, `score.png`. Cada capa va acompañada de un `layers.json` con bounds, escala y paleta de colores.

**Eventos del store (frontend)**: `selectedSiteId`, `currentTimeUTC`, `activeLayers[]`, `mode: "explore" | "streetview" | "game"`. Estos cuatro campos son la única interfaz entre los módulos web.

**Regla:** si alguien cambia un contrato, se hace con un PR a `contracts/` y se avisa a todos.

## 5. Por persona

### Javi: ephemerides y algoritmo de validez
- **Herramientas:** `spiceypy` con kernels `de440.bsp`, `moon_pa_de440_200625.bpc`, `moon_de440_250416.tf`, `naif0012.tls` y `pck00011.tpc`; `numpy` 2, `scipy`, `pandas`/`polars`, `numba` para horizontes; `skyfield` para comprobaciones rápidas.
- **Qué calcula:** vector al Sol y a la Tierra en `MOON_ME` para cada punto, y elevación respecto al **horizonte local** (necesita el DEM de Pablo). Con eso: % de iluminación, visibilidad de la Tierra y noche más larga.
- **Algoritmo:** filtros duros (pendiente < X°, rugosidad, iluminación mínima) y después score ponderado con pesos configurables en `scoring/config.yaml`, mostrables como sliders.
- **Iteraciones:** v0 mock de `sites.json` (20 puntos) · v1 Sol y Tierra sin horizonte · v2 horizonte real desde el DEM (360 azimuts por punto) · v3 score con pesos y `reasons`.
- **Dependencia con Pablo:** DEM y máscara de horizonte; formato tipo `horizon/<id>.npy` con 360 elevaciones.

### Pablo: topografía y Lunar Street View
- **Datos:** DEM de LOLA (mosaicos polares 5–20 m/px; global 118 m/px). PSR de LOLA/Diviner. `rasterio` 1.4, `GDAL` 3.9, `pyproj`.
- **Backend:** recortes locales del DEM (p. ej. 20×20 km) como heightmap PNG de 16 bits y máscara de horizonte para Javi.
- **Street View (three.js):** `PlaneGeometry` desplazado con heightmap y LOD sencillo; cámara a 1,7 m; estrellas Hipparcos/Yale BSC (mag ~6,5); Sol y Tierra con `sun_az/el` y `earth_az/el`; fase de la Tierra y sombras con `DirectionalLight`; etiquetas tipo Stellarium y slider de tiempo compartido.
- **Iteraciones:** v0 terreno procedural y Sol fijo · v1 heightmap real · v2 cielo animado · v3 horizonte y sombras coherentes con el cálculo de Javi (validación cruzada).

### Marta: visor 3D de la Luna y modo exploración
- **Herramientas:** R3F + drei (`OrbitControls`, `Html`), texturas LROC WAC y LOLA a 4k–8k en KTX2/WebP.
- **Funciones:** globo con pins de `sites.json` por score; overlays de capas raster; barra lateral con sliders de pesos que recalculan en cliente y rango de fechas; clic en pin → `selectedSiteId` → detalle → "Entrar en Street View".
- **Iteraciones:** v0 esfera con pins mock · v1 capas y sidebar · v2 recálculo con sliders y zoom a polos · v3 transición animada al Street View.

### Javi2: web, estética y layers de la página
- **Responsable de** `src/core` (store, loader, router) y del shell: layout, navegación entre modos, landing, about/datos/créditos y responsive.
- **Herramientas:** Tailwind 4, shadcn/ui, Framer Motion, React Router 7. Identidad visual con Figma o Stitch.
- **Layers:** sistema de capas (registro, orden, opacidad, leyendas) con `layers.json`. Marta las pinta en 3D y Javi2 da la UI de control.
- **Iteraciones:** v0 esqueleto con 3 rutas y el store (día 1, desbloquea a todos) · v1 design system · v2 leyendas y onboarding · v3 pulido, rendimiento (lazy-load) y deploy.

### Cristóbal: gamificación
- **Mecánicas:** "Elige tu base" (comparar con el score del algoritmo); misiones tipo "punto con >80% de luz y vista a la Tierra"; logros; quiz con datos reales.
- **Herramientas:** TypeScript sobre el store; misiones en `game/missions.json` con condiciones sobre `metrics`; progreso en `localStorage`; `canvas-confetti` y `howler`.
- **No depende del 3D:** consume `selectedSiteId` y `sites.json`.
- **Iteraciones:** v0 motor de misiones + tests (vitest) · v1 UI de misiones y logros · v2 integración con globo y Street View · v3 desafío/ranking local.

## 6. Cronograma (~48 h)

| Fase | Objetivo | Entregables clave |
|---|---|---|
| H0–H3 | Contratos y esqueleto | `contracts/`, repo, mocks en `public/data`, store y rutas (Javi2) |
| H3–H16 | v0/v1 en paralelo con mocks | Cada uno en su carpeta y su rama `feat/<area>` |
| H16 | Integración 1 | Datos reales v1 de Javi y Pablo sustituyen a los mocks |
| H16–H34 | v2 | Horizonte real, sliders de score, cielo animado, misiones conectadas |
| H34 | Integración 2 + freeze de features | |
| H34–H44 | v3 y pulido | Rendimiento, estética, textos, demo |
| H44–H48 | Deploy, presentación, README | |

## 7. Reglas para no pisarse
1. Mocks primero: nadie espera a nadie.
2. Una carpeta por persona; archivos ajenos solo con PR revisado por su dueño.
3. Cambios de contrato: PR a `contracts/` y aviso al equipo.
4. Pipeline reproducible: `uv run python -m export.all` regenera `public/data`. Los datos crudos no van al repo.
5. Sync de 10 minutos en cada integración.

## 8. Riesgos
- DEM polares grandes → recortar al polo sur por debajo de −80°.
- Horizontes lentos → precalcular con `numba` y para 200–1000 candidatos.
- Texturas pesadas → KTX2/WebP, máximo 8k.
- Precisión vs. tiempo → v1 sin horizonte ya da demo; v2 la mejora.
